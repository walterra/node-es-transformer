import { parse } from 'csv-parse';
import es from 'event-stream';
import split from 'split2';

import getCsvParserOptions from './_csv-parser-options';

export default function streamReaderFactory(
  indexer,
  stream,
  transform,
  splitRegex,
  verbose,
  skipHeader = false,
  sourceFormat = 'ndjson',
  csvOptions = {},
) {
  function addParsedDoc(parsed, streamRef) {
    const doc = typeof transform === 'function' ? transform(parsed) : parsed;

    // if doc is null/undefined we'll skip indexing it
    if (doc === null || typeof doc === 'undefined') {
      streamRef.resume();
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

  function startIndex() {
    let finished = false;

    const s =
      sourceFormat === 'csv'
        ? stream.pipe(parse(getCsvParserOptions(csvOptions, skipHeader))).pipe(
            es
              .mapSync(record => {
                try {
                  addParsedDoc(record, s);
                } catch (e) {
                  console.log('error', e);
                }
              })
              .on('error', err => {
                console.log('Error while reading CSV stream.', err);
              }),
          )
        : (() => {
            let skippedHeader = false;

            return stream.pipe(split(splitRegex)).pipe(
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
                    addParsedDoc(parsed, s);
                  } catch (e) {
                    console.log('error', e);
                  }
                })
                .on('error', err => {
                  console.log('Error while reading stream.', err);
                }),
            );
          })();

    s.on('end', () => {
      if (verbose) console.log('Read entire stream.');
      indexer.finish();
      finished = true;
    });

    indexer.queueEmitter.on('pause', () => {
      if (finished) return;
      s.pause();
    });

    indexer.queueEmitter.on('resume', () => {
      if (finished) return;
      s.resume();
    });
  }

  return () => {
    startIndex();
  };
}
