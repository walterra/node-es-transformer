import fs from 'fs';
import es from 'event-stream';
import glob from 'glob';

const MAX_QUEUE_SIZE = 15;

export default function fileReaderFactory(indexer, fileName, transform, splitRegex, verbose) {
  function startIndex(files) {
    let ingestQueueSize = 0;
    let finished = false;

    const file = files.shift();
    const s = fs
      .createReadStream(file)
      .pipe(es.split(splitRegex))
      .pipe(
        es
          .mapSync(line => {
            try {
              // skip empty lines
              if (line === '') {
                return;
              }

              const doc =
                typeof transform === 'function'
                  ? JSON.stringify(transform(JSON.parse(line)))
                  : line;

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
          .on('error', err => {
            console.log('Error while reading file.', err);
          })
          .on('end', () => {
            if (verbose) console.log('Read entire file: ', file);
            if (files.length > 0) {
              startIndex(files);
              return;
            }

            indexer.finish();
            finished = true;
          }),
      );

    indexer.queueEmitter.on('queue-size', async size => {
      if (finished) return;
      ingestQueueSize = size;

      if (ingestQueueSize < MAX_QUEUE_SIZE) {
        s.resume();
      } else {
        s.pause();
      }
    });

    indexer.queueEmitter.on('resume', () => {
      if (finished) return;
      ingestQueueSize = 0;
      s.resume();
    });
  }

  return () => {
    glob(fileName, (er, files) => {
      startIndex(files);
    });
  };
}
