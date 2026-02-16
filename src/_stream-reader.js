import parquet from './_parquet';
import * as arrow from 'apache-arrow';
import { parse } from 'csv-parse';
import es from 'event-stream';
import split from 'split2';

import getCsvParserOptions from './_csv-parser-options';

function createPauseWaiter(queueEmitter) {
  let paused = false;
  let waiters = [];

  const onPause = () => {
    paused = true;
  };

  const onResume = () => {
    paused = false;
    waiters.forEach(resolve => resolve());
    waiters = [];
  };

  queueEmitter.on('pause', onPause);
  queueEmitter.on('resume', onResume);

  return {
    async waitIfPaused() {
      if (!paused) return;

      await new Promise(resolve => {
        waiters.push(resolve);
      });
    },
    cleanup() {
      queueEmitter.removeListener('pause', onPause);
      queueEmitter.removeListener('resume', onResume);
      waiters.forEach(resolve => resolve());
      waiters = [];
    },
  };
}

async function readStreamToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export default function streamReaderFactory(
  indexer,
  stream,
  transform,
  splitRegex,
  skipHeader = false,
  sourceFormat = 'ndjson',
  csvOptions = {},
  logger,
) {
  function addParsedDoc(parsed) {
    const doc = typeof transform === 'function' ? transform(parsed) : parsed;

    // if doc is null/undefined we'll skip indexing it
    if (doc === null || typeof doc === 'undefined') {
      return;
    }

    // the transform callback may return an array of docs so we can emit
    // multiple docs from a single line
    if (Array.isArray(doc)) {
      doc.forEach(d => {
        if (d === null || typeof d === 'undefined') return;
        indexer.add(d);
      });
      return;
    }

    indexer.add(doc);
  }

  async function processParquetStream() {
    const { waitIfPaused, cleanup } = createPauseWaiter(indexer.queueEmitter);

    const parquetBuffer = await readStreamToBuffer(stream);
    const reader = await parquet.ParquetReader.openBuffer(parquetBuffer);

    try {
      const cursor = reader.getCursor();

      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const row = await cursor.next();

        if (row === null || typeof row === 'undefined') {
          break;
        }

        addParsedDoc(row);
        // eslint-disable-next-line no-await-in-loop
        await waitIfPaused();
      }

      logger.info('Read entire stream');
    } finally {
      cleanup();
      await reader.close();
    }
  }

  async function processArrowStream() {
    const { waitIfPaused, cleanup } = createPauseWaiter(indexer.queueEmitter);

    try {
      const reader = await arrow.RecordBatchReader.from(stream);

      for await (const recordBatch of reader) {
        const { fields } = recordBatch.schema;

        for (let rowIndex = 0; rowIndex < recordBatch.numRows; rowIndex++) {
          const row = {};

          fields.forEach(field => {
            const vector = recordBatch.getChild(field.name);
            row[field.name] = vector ? vector.get(rowIndex) : undefined;
          });

          addParsedDoc(row);
          // eslint-disable-next-line no-await-in-loop
          await waitIfPaused();
        }
      }

      logger.info('Read entire stream');
    } finally {
      cleanup();
    }
  }

  function processPipeline(buildPipeline, errorMessage) {
    return new Promise((resolve, reject) => {
      let finished = false;
      const s = buildPipeline();

      const onPause = () => {
        if (finished) return;
        s.pause();
      };

      const onResume = () => {
        if (finished) return;
        s.resume();
      };

      function cleanup() {
        indexer.queueEmitter.removeListener('pause', onPause);
        indexer.queueEmitter.removeListener('resume', onResume);
      }

      indexer.queueEmitter.on('pause', onPause);
      indexer.queueEmitter.on('resume', onResume);

      s.on('end', () => {
        finished = true;
        cleanup();
        logger.info('Read entire stream');
        resolve();
      });

      s.on('error', err => {
        finished = true;
        cleanup();
        logger.error({ err }, errorMessage);
        reject(err);
      });
    });
  }

  function processCsvStream() {
    return processPipeline(
      () =>
        stream.pipe(parse(getCsvParserOptions(csvOptions, skipHeader))).pipe(
          es
            .mapSync(record => {
              try {
                addParsedDoc(record);
              } catch (err) {
                logger.error({ err }, 'Failed to process CSV stream record');
              }
            })
            .on('error', err => {
              logger.error({ err }, 'Error while reading CSV stream');
            }),
        ),
      'Error while reading CSV stream',
    );
  }

  function processNdjsonStream() {
    let skippedHeader = false;

    return processPipeline(
      () =>
        stream.pipe(split(splitRegex)).pipe(
          es
            .mapSync(line => {
              try {
                // skip empty lines
                if (line === '') {
                  return;
                }

                if (skipHeader && !skippedHeader) {
                  skippedHeader = true;
                  return;
                }

                const parsed = JSON.parse(line);
                addParsedDoc(parsed);
              } catch (err) {
                logger.error({ err }, 'Failed to process NDJSON stream line');
              }
            })
            .on('error', err => {
              logger.error({ err }, 'Error while reading stream');
            }),
        ),
      'Error while reading stream',
    );
  }

  async function startIndex() {
    try {
      if (sourceFormat === 'csv') {
        await processCsvStream();
      } else if (sourceFormat === 'ndjson') {
        await processNdjsonStream();
      } else if (sourceFormat === 'parquet') {
        await processParquetStream();
      } else if (sourceFormat === 'arrow') {
        await processArrowStream();
      } else {
        throw Error(`Unsupported sourceFormat: ${sourceFormat}`);
      }
    } catch (err) {
      logger.error({ err }, 'Error while reading stream');
    } finally {
      indexer.finish();
    }
  }

  return () => {
    startIndex();
  };
}
