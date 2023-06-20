const EventEmitter = require('events');

const queueEmitter = new EventEmitter();

// a simple helper queue to bulk index documents
export default function indexQueueFactory({
  targetClient: client,
  targetIndexName,
  bufferSize = 1000,
  skipHeader = false,
  verbose = true,
}) {
  let buffer = [];
  const queue = [];
  let ingesting = false;

  const ingest = async (b) => {
    if (typeof b !== 'undefined') {
      queue.push(b);
      queueEmitter.emit('queue-size', queue.length);
    }

    if (ingesting === false) {
      const docs = queue.shift();
      queueEmitter.emit('queue-size', queue.length);
      ingesting = true;
      if (verbose) console.log(`bulk ingest docs: ${docs.length / 2}, queue length: ${queue.length}`);

      try {
        await client.bulk({ body: docs });
        ingesting = false;
        if (queue.length > 0) {
          ingest();
        }
      } catch (err) {
        console.log('bulk index error', err);
      }
    }

    // console.log(`ingest: queue.length ${queue.length}`);
    if (queue.length === 0) {
      queueEmitter.emit('queue-size', 0);
      queueEmitter.emit('resume');
    }
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
        ingest(buffer);
        buffer = [];
      }
    },
    finish: async () => {
      await ingest(buffer);
      buffer = [];
      queueEmitter.emit('finish');
    },
    queueEmitter,
  };
}
