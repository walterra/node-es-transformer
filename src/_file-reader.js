import fs from 'fs';
import { parse } from 'csv-parse';
import es from 'event-stream';
import { globSync } from 'glob';
import split from 'split2';

import getCsvParserOptions from './_csv-parser-options';

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
  function addParsedDoc(parsed, file, streamRef) {
    const context = { fileName: file };
    const doc = typeof transform === 'function' ? transform(parsed, context) : parsed;

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

  function createNdjsonReader(file) {
    let skippedHeader = false;

    const s = fs
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
              addParsedDoc(parsed, file, s);
            } catch (e) {
              console.log('error', e);
            }
          })
          .on('error', err => {
            console.log('Error while reading file.', err);
          }),
      );

    return s;
  }

  function createCsvReader(file) {
    const parserOptions = getCsvParserOptions(csvOptions, skipHeader);

    const s = fs
      .createReadStream(file)
      .pipe(parse(parserOptions))
      .pipe(
        es
          .mapSync(record => {
            try {
              addParsedDoc(record, file, s);
            } catch (e) {
              console.log('error', e);
            }
          })
          .on('error', err => {
            console.log('Error while reading CSV file.', err);
          }),
      );

    return s;
  }

  function startIndex(files) {
    let finished = false;

    if (files.length === 0) {
      indexer.finish();
      return;
    }

    const file = files.shift();

    const s = sourceFormat === 'csv' ? createCsvReader(file) : createNdjsonReader(file);

    s.on('end', () => {
      if (verbose) console.log('Read entire file: ', file);
      if (files.length > 0) {
        startIndex(files);
        return;
      }

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
    try {
      const files = globSync(fileName);
      startIndex(files);
    } catch (error) {
      console.log('Error matching files:', error);
    }
  };
}
