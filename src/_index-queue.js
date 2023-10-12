import { DEFAULT_BUFFER_SIZE } from './_constants';

const EventEmitter = require('events');

const queueEmitter = new EventEmitter();

let parallelCalls = 1;

// a simple helper queue to bulk index documents
export default function indexQueueFactory({
  targetClient: client,
  targetIndexName,
  bufferSize = DEFAULT_BUFFER_SIZE,
  skipHeader = false,
  verbose = true,
}) {
  let buffer = [];
  const queue = [];
  let ingesting = 0;
  let ingestTimes = [];

  const ingest = b => {
    if (typeof b !== 'undefined') {
      queue.push(b);
      queueEmitter.emit('queue-size', queue.length);
    }

    if (ingestTimes.length > 5) ingestTimes = ingestTimes.slice(-5);

    if (ingesting < parallelCalls) {
      const docs = queue.shift();

      queueEmitter.emit('queue-size', queue.length);
      if (queue.length <= 5) {
        queueEmitter.emit('resume');
      }

      ingesting += 1;

      if (verbose)
        console.log(`bulk ingest docs: ${docs.length / 2}, queue length: ${queue.length}`);

      const start = Date.now();
      client.bulk({ body: docs }).then(() => {
        const end = Date.now();
        const delta = end - start;
        ingestTimes.push(delta);
        ingesting -= 1;

        const ingestTimesMovingAverage =
          ingestTimes.length > 0 ? ingestTimes.reduce((p, c) => p + c, 0) / ingestTimes.length : 0;
        const ingestTimesMovingAverageSeconds = Math.floor(ingestTimesMovingAverage / 1000);

        if (ingestTimes.length > 0 && ingestTimesMovingAverageSeconds < 30 && parallelCalls < 10) {
          parallelCalls += 1;
        } else if (
          ingestTimes.length > 0 &&
          ingestTimesMovingAverageSeconds >= 30 &&
          parallelCalls > 1
        ) {
          parallelCalls -= 1;
        }
        if (queue.length > 0) {
          ingest();
        }
      });
    }
  };

  return {
    add: doc => {
      if (!skipHeader) {
        const header = { index: { _index: targetIndexName } };
        buffer.push(header);
      }
      buffer.push(doc);

      // console.log(`add: queue.length ${queue.length}`);
      if (queue.length === 0) {
        queueEmitter.emit('resume');
      }

      if (buffer.length >= bufferSize * 2) {
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
