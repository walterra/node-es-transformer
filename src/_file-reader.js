import fs from 'fs';
import es from 'event-stream';
import glob from 'glob';

export default function fileReaderFactory(indexer, fileName, transform, splitRegex, verbose) {
  function startIndex(files) {
    const file = files.shift();
    const s = fs.createReadStream(file)
      .pipe(es.split(splitRegex))
      .pipe(es.mapSync((line) => {
        s.pause();
        try {
          const doc = (typeof transform === 'function') ? transform(line) : line;
          // if doc is undefined we'll skip indexing it
          if (typeof doc === 'undefined') {
            s.resume();
            return;
          }

          // the transform callback may return an array of docs so we can emit
          // multiple docs from a single line
          if (Array.isArray(doc)) {
            doc.forEach(d => indexer.add(d));
            return;
          }

          indexer.add(doc);
        } catch (e) {
          console.log('error', e);
        }
      })
        .on('error', (err) => {
          console.log('Error while reading file.', err);
        })
        .on('end', () => {
          if (verbose) console.log('Read entire file: ', file);
          indexer.finish();
          if (files.length > 0) {
            startIndex(files);
          }
        }));

    indexer.queueEmitter.on('resume', () => {
      s.resume();
    });
  }

  return () => {
    glob(fileName, (er, files) => {
      startIndex(files);
    });
  };
}
