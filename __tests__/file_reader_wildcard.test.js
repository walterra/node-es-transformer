const elasticsearch = require('@elastic/elasticsearch');
const retry = require('async-retry');

const transformer = require('../dist/node-es-transformer.cjs');

const elasticsearchUrl = 'http://localhost:9200';
const indexName = 'file_reader_wildcard';

const client = new elasticsearch.Client({
  node: elasticsearchUrl,
});

describe('indexes multiple ndjson files with 10100 docs in total', () => {
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

  it('should index the ndjson files and find its docs', done => {
    (async () => {
      const { events } = await transformer({
        fileName: './data/sample_data_*.ndjson',
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
          const res1 = await fetch(`${elasticsearchUrl}/${indexName}/_search?q=the_index:99`);
          expect(res1.status).toBe(200);

          const body1 = await res1.json();
          expect(body1?.hits?.total?.value).toBe(2);

          const res2 = await fetch(`${elasticsearchUrl}/${indexName}/_search?q=the_index:9999`);
          expect(res2.status).toBe(200);

          const body2 = await res2.json();
          expect(body2?.hits?.total?.value).toBe(1);
        });

        done();
      });
    })();
  });
});
