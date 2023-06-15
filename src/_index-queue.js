const EventEmitter = require('events');

const queueEmitter = new EventEmitter();

// a simple helper queue to bulk index documents
export default function indexQueueFactory({
  client,
  targetIndexName,
  bufferSize = 1000,
  skipHeader = false,
  verbose = true,
}) {
  let buffer = [];
  const queue = [];
  let ingesting = false;

  const ingest = (b) => {
    if (typeof b !== 'undefined') {
      queue.push(b);
    }

    if (ingesting === false) {
      const docs = queue.shift();
      ingesting = true;
      if (verbose) console.log(`bulk ingest docs: ${docs.length / 2}, queue length: ${queue.length}`);

      client.bulk({ body: docs }, () => {
        ingesting = false;
        if (queue.length > 0) {
          ingest();
        }
      });
    }

    // console.log(`ingest: queue.length ${queue.length}`);
    if (queue.length === 0) {
      queueEmitter.emit('resume');
    }

    return [];
  };

  return {
    add: (doc) => {
      if (!skipHeader) {
        const header = { index: { _index: targetIndexName } };
        buffer.push(header);
      }
      buffer.push(doc);

      // console.log(`add: queue.length ${queue.length}`);
      if (queue.length === 0) {
        queueEmitter.emit('resume');
      }

      if (buffer.length >= (bufferSize * 2)) {
        buffer = ingest(buffer);
      }
    },
    finish: () => {
      buffer = ingest(buffer);
    },
    queueEmitter,
  };
}
