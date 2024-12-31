import { Readable } from 'stream';

import { DEFAULT_BUFFER_SIZE } from './_constants';

const EventEmitter = require('events');

const queueEmitter = new EventEmitter();

const parallelCalls = 5;

// a simple helper queue to bulk index documents
export default function indexQueueFactory({
  targetClient: client,
  targetIndexName,
  bufferSize = DEFAULT_BUFFER_SIZE,
  skipHeader = false,
}) {
  let docsPerSecond = 0;

  const flushBytes = bufferSize * 1024; // Convert KB to Bytes
  const highWaterMark = flushBytes * parallelCalls;

  // Create a Readable stream
  const stream = new Readable({
    read() {}, // Implement read but we manage pushing manually
    highWaterMark, // Buffer size for backpressure management
  });

  async function* ndjsonStreamIterator(readableStream) {
    let buffer = ''; // To hold the incomplete data
    let skippedHeader = false;

    // Iterate over the stream using async iteration
    for await (const chunk of readableStream) {
      buffer += chunk.toString(); // Accumulate the chunk data in the buffer

      // Split the buffer into lines (NDJSON items)
      const lines = buffer.split('\n');

      // The last line might be incomplete, so hold it back in the buffer
      buffer = lines.pop();

      // Yield each complete JSON object
      for (const line of lines) {
        if (line.trim()) {
          try {
            if (!skipHeader || (skipHeader && !skippedHeader)) {
              yield JSON.parse(line); // Parse and yield the JSON object
              skippedHeader = true;
            }
          } catch (err) {
            // Handle JSON parse errors if necessary
            console.error('Failed to parse JSON:', err);
          }
        }
      }
    }

    // Handle any remaining data in the buffer after the stream ends
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer);
      } catch (err) {
        console.error('Failed to parse final JSON:', err);
      }
    }
  }

  let finished = false;

  // Async IIFE to start bulk indexing
  (async () => {
    const interval = setInterval(() => {
      queueEmitter.emit('docsPerSecond', docsPerSecond);
      docsPerSecond = 0;
    }, 1000);

    await client.helpers.bulk({
      concurrency: parallelCalls,
      flushBytes,
      flushInterval: 1000,
      refreshOnCompletion: true,
      datasource: ndjsonStreamIterator(stream),
      onDocument(doc) {
        docsPerSecond++;
        return {
          index: { _index: targetIndexName },
        };
      },
    });

    clearInterval(interval);
    queueEmitter.emit('finish');
  })();

  return {
    add: doc => {
      if (finished) {
        throw new Error('Unexpected doc added after indexer should finish.');
      }

      const canContinue = stream.push(`${JSON.stringify(doc)}\n`);
      if (!canContinue) {
        queueEmitter.emit('pause');
        stream.once('drain', () => {
          queueEmitter.emit('resume');
        });
      }
    },
    finish: () => {
      finished = true;
      stream.push(null);
    },
    queueEmitter,
  };
}
