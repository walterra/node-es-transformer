const EventEmitter = require('events');

const queueEmitter = new EventEmitter();

// a simple helper queue to bulk index documents
export function indexQueueFactory({
  client,
  indexName,
  typeName = 'doc',
  bufferSize = 1000,
  verbose = true
}) {
  let buffer = [];
  let queue = [];
  let ingesting = false;

  const ingest = (b) => {
    if (typeof b !== 'undefined') {
      queue.push(b);
    }

    if (ingesting === false) {
      const docs = queue.shift();
      ingesting = true;
      verbose && console.log(`bulk ingest docs: ${docs.length}, queue length: ${queue.length}`);

      client.bulk({
        body: docs
      }, (err, resp) => {
        //console.log('error', err, resp);
        ingesting = false;
        if (queue.length > 0) {
          ingest();
        }
      });

    }

    //console.log(`ingest: queue.length ${queue.length}`);
    if (queue.length === 0) {
      queueEmitter.emit('resume');
    }

    return [];
  }

  return {
    add: (doc, cb = function() {}) => {
      const header = { index: { _index: indexName, _type: typeName } };
      buffer.push(header);
      buffer.push(doc);

      //console.log(`add: queue.length ${queue.length}`);
      if (queue.length === 0) {
        queueEmitter.emit('resume');
      }

      if (buffer.length >= bufferSize) {
        buffer = ingest(buffer);
      }

    },
    finish: () => {
      buffer = ingest(buffer);
    },
    queueEmitter
  };
};
