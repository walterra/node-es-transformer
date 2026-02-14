import parquet from '@dsnp/parquetjs';
import * as arrow from 'apache-arrow';
import fs from 'fs';
import { parse } from 'csv-parse';
import es from 'event-stream';
import { globSync } from 'glob';
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

export default function fileReaderFactory(
  indexer,
  fileName,
  transform,
  splitRegex,
  verbose,
  skipHeader = false,
  sourceFormat = 'ndjson',
  csvOptions = {},
) {
  function addParsedDoc(parsed, file) {
    const context = { fileName: file };
    const doc = typeof transform === 'function' ? transform(parsed, context) : parsed;

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

  async function processParquetFile(file) {
    const { waitIfPaused, cleanup } = createPauseWaiter(indexer.queueEmitter);
    const reader = await parquet.ParquetReader.openFile(file);

    try {
      const cursor = reader.getCursor();

      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const row = await cursor.next();

        if (row === null || typeof row === 'undefined') {
          break;
        }

        addParsedDoc(row, file);
        // eslint-disable-next-line no-await-in-loop
        await waitIfPaused();
      }

      if (verbose) console.log('Read entire file: ', file);
    } finally {
      cleanup();
      await reader.close();
    }
  }

  async function processArrowFile(file) {
    const { waitIfPaused, cleanup } = createPauseWaiter(indexer.queueEmitter);

    try {
      const reader = await arrow.RecordBatchReader.from(fs.createReadStream(file));

      for await (const recordBatch of reader) {
        const { fields } = recordBatch.schema;

        for (let rowIndex = 0; rowIndex < recordBatch.numRows; rowIndex++) {
          const row = {};

          fields.forEach(field => {
            const vector = recordBatch.getChild(field.name);
            row[field.name] = vector ? vector.get(rowIndex) : undefined;
          });

          addParsedDoc(row, file);
          // eslint-disable-next-line no-await-in-loop
          await waitIfPaused();
        }
      }

      if (verbose) console.log('Read entire file: ', file);
    } finally {
      cleanup();
    }
  }

  function processStreamFile(file, buildStream, errorMessage) {
    return new Promise((resolve, reject) => {
      let finished = false;
      const s = buildStream();

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
        if (verbose) console.log('Read entire file: ', file);
        resolve();
      });

      s.on('error', err => {
        finished = true;
        cleanup();
        console.log(errorMessage, err);
        reject(err);
      });
    });
  }

  function processNdjsonFile(file) {
    let skippedHeader = false;

    return processStreamFile(
      file,
      () =>
        fs
          .createReadStream(file)
          .pipe(split(splitRegex))
          .pipe(
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
                  addParsedDoc(parsed, file);
                } catch (e) {
                  console.log('error', e);
                }
              })
              .on('error', err => {
                console.log('Error while reading file.', err);
              }),
          ),
      'Error while reading file.',
    );
  }

  function processCsvFile(file) {
    const parserOptions = getCsvParserOptions(csvOptions, skipHeader);

    return processStreamFile(
      file,
      () =>
        fs
          .createReadStream(file)
          .pipe(parse(parserOptions))
          .pipe(
            es
              .mapSync(record => {
                try {
                  addParsedDoc(record, file);
                } catch (e) {
                  console.log('error', e);
                }
              })
              .on('error', err => {
                console.log('Error while reading CSV file.', err);
              }),
          ),
      'Error while reading CSV file.',
    );
  }

  async function processFile(file) {
    if (sourceFormat === 'csv') {
      await processCsvFile(file);
      return;
    }

    if (sourceFormat === 'ndjson') {
      await processNdjsonFile(file);
      return;
    }

    if (sourceFormat === 'parquet') {
      await processParquetFile(file);
      return;
    }

    if (sourceFormat === 'arrow') {
      await processArrowFile(file);
      return;
    }

    throw Error(`Unsupported sourceFormat: ${sourceFormat}`);
  }

  async function startIndex(files) {
    if (files.length === 0) {
      indexer.finish();
      return;
    }

    try {
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        await processFile(file);
      }
    } catch (error) {
      console.log('Error while processing files:', error);
    } finally {
      indexer.finish();
    }
  }

  return () => {
    try {
      const files = globSync(fileName);
      startIndex(files);
    } catch (error) {
      console.log('Error matching files:', error);
      indexer.finish();
    }
  };
}
