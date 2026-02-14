import { PassThrough } from 'stream';

import { DEFAULT_BUFFER_SIZE } from './_constants';

const EventEmitter = require('events');

const parallelCalls = 5;

// a simple helper queue to bulk index documents
export default function indexQueueFactory({
  targetClient: client,
  targetIndexName,
  bufferSize = DEFAULT_BUFFER_SIZE,
  logger,
}) {
  const queueEmitter = new EventEmitter();
  let docsPerSecond = 0;

  const flushBytes = bufferSize * 1024; // Convert KB to Bytes
  const highWaterMark = flushBytes * parallelCalls;

  // Create a PassThrough stream (readable + writable) for proper backpressure
  const stream = new PassThrough({
    highWaterMark, // Buffer size for backpressure management
  });

  async function* ndjsonStreamIterator(readableStream) {
    let buffer = ''; // To hold the incomplete data

    try {
      // Iterate over the stream using async iteration
      for await (const chunk of readableStream) {
        buffer += chunk.toString(); // Accumulate the chunk data in the buffer

        // Split the buffer into lines (NDJSON items)
        const lines = buffer.split('\n');

        // The last line might be incomplete, so hold it back in the buffer
        buffer = lines.pop();

        // Yield each complete JSON object
        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          try {
            yield JSON.parse(line); // Parse and yield the JSON object
          } catch (err) {
            logger.error({ err }, 'Failed to parse JSON from NDJSON stream');
          }
        }
      }

      // Handle any remaining data in the buffer after the stream ends
      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer);
        } catch (err) {
          logger.error({ err }, 'Failed to parse final JSON from NDJSON stream');
        }
      }
    } finally {
      // Ensure the stream is properly cleaned up if the iterator is terminated early
      if (!readableStream.destroyed) {
        readableStream.destroy();
      }
    }
  }

  let finished = false;
  let drainListener = null;

  // Async IIFE to start bulk indexing
  (async () => {
    const interval = setInterval(() => {
      queueEmitter.emit('docsPerSecond', docsPerSecond);
      docsPerSecond = 0;
    }, 1000);

    try {
      await client.helpers.bulk({
        concurrency: parallelCalls,
        flushBytes,
        flushInterval: 1000,
        refreshOnCompletion: true,
        datasource: ndjsonStreamIterator(stream),
        onDocument() {
          docsPerSecond++;
          return {
            index: { _index: targetIndexName },
          };
        },
      });
    } catch (err) {
      logger.error({ err, targetIndexName }, 'Error during bulk indexing');
      queueEmitter.emit('error', err);
      throw err;
    } finally {
      // Clean up interval
      clearInterval(interval);

      // Remove drain listener if it exists
      if (drainListener) {
        stream.removeListener('drain', drainListener);
        drainListener = null;
      }

      // Remove all listeners from stream
      stream.removeAllListeners();

      // Properly destroy the stream to prevent open handles
      if (!stream.destroyed) {
        stream.destroy();
      }

      // Emit finish and clean up queue emitter listeners
      queueEmitter.emit('finish');
      queueEmitter.removeAllListeners();
    }
  })();

  return {
    add: doc => {
      if (finished) {
        throw new Error('Unexpected doc added after indexer should finish.');
      }

      const canContinue = stream.write(`${JSON.stringify(doc)}\n`);
      if (!canContinue) {
        queueEmitter.emit('pause');

        // Store the listener so we can clean it up later
        drainListener = () => {
          queueEmitter.emit('resume');
        };
        stream.once('drain', drainListener);
      }
    },
    finish: () => {
      finished = true;
      stream.end();
    },
    queueEmitter,
  };
}
