const { Readable } = require('stream');

const retry = require('async-retry');

const transformer = require('../dist/node-es-transformer.cjs');
const deleteIndex = require('./utils/delete_index');
const { elasticsearchUrl, getElasticsearchClient } = require('./utils/elasticsearch');

const client = getElasticsearchClient();
const targetIndexName = 'from_stream_10000';

class TestStream extends Readable {
  constructor(maxDocuments = 10000) {
    super({ objectMode: true }); // Enable object mode
    this.counter = 0;
    this.maxDocuments = maxDocuments;
  }

  _read() {
    if (this.counter >= this.maxDocuments) {
      this.push(null); // Signal end of stream
      return;
    }

    // Push stringified data
    this.push(
      `${JSON.stringify({
        id: `doc-${this.counter}`,
        timestamp: new Date().toISOString(),
        the_index: this.counter,
      })}\n`,
    );

    this.counter += 1;
  }
}

describe('streams 10000 docs', () => {
  afterAll(async () => {
    await deleteIndex(client, targetIndexName)();
    await client.close();
  });

  it('should stream 10000 docs', done => {
    (async () => {
      const { events } = await transformer({
        targetClient: client,
        stream: new TestStream(10000),
        targetIndexName,
        verbose: false,
      });

      events.on('finish', async () => {
        await client.indices.refresh({ index: targetIndexName });

        await retry(async () => {
          const res = await fetch(
            `${elasticsearchUrl}/${targetIndexName}/_search?q=the_index:9999`,
          );
          expect(res.status).toBe(200);

          const body = await res.json();
          expect(body?.hits?.total?.value).toBe(1);
        });

        done();
      });
    })();
  });
});
