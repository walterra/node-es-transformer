const elasticsearch = require('@elastic/elasticsearch');
const retry = require('async-retry');

const transformer = require('../dist/node-es-transformer.cjs');

const elasticsearchUrl = 'http://localhost:9200';
const indexName = 'file_reader_10000';

const client = new elasticsearch.Client({
  node: elasticsearchUrl,
});

describe('indexes an ndjson file with 10000 docs', () => {
  afterAll(done => {
    (async () => {
      await client.indices.delete({
        index: indexName,
      });

      await retry(async () => {
        const exists = await client.indices.exists({ index: indexName });

        if (exists) {
          throw new Error(`Index '${indexName} still exists`);
        }
      });

      done();
    })();
  });

  it('should index the ndjson file and find its docs', done => {
    (async () => {
      const { events } = await transformer({
        fileName: './data/sample_data_10000.ndjson',
        targetIndexName: indexName,
        mappings: {
          properties: {
            the_index: {
              type: 'integer',
            },
            code: {
              type: 'integer',
            },
            url: {
              type: 'keyword',
            },
          },
        },
        verbose: false,
      });

      events.on('finish', async () => {
        await client.indices.refresh({ index: indexName });

        await retry(async () => {
          const res = await fetch(`${elasticsearchUrl}/${indexName}/_search?q=the_index:9999`);
          expect(res.status).toBe(200);

          const body = await res.json();
          expect(body?.hits?.total?.value).toBe(1);
        });

        done();
      });
    })();
  });
});
