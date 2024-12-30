import es from 'event-stream';
import split from 'split2';

export default function streamReaderFactory(indexer, stream, transform, splitRegex, verbose) {
  function startIndex() {
    let finished = false;

    const s = stream.pipe(split(splitRegex)).pipe(
      es
        .mapSync(line => {
          try {
            // skip empty lines
            if (line === '') {
              return;
            }

            const doc =
              typeof transform === 'function' ? JSON.stringify(transform(JSON.parse(line))) : line;

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
          console.log('Error while reading stream.', err);
        })
        .on('end', () => {
          if (verbose) console.log('Read entire stream.');
          indexer.finish();
          finished = true;
        }),
    );

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
