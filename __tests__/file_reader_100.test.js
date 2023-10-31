const elasticsearch = require('@elastic/elasticsearch');
const retry = require('async-retry');

const transformer = require('../dist/node-es-transformer.cjs');
const deleteIndex = require('./utils/delete_index');

const elasticsearchUrl = 'http://localhost:9200';
const indexName = 'file_reader_100';

const client = new elasticsearch.Client({
  node: elasticsearchUrl,
});

describe('indexes an ndjson file with 100 docs', () => {
  afterAll(deleteIndex(client, indexName));

  it('should index the ndjson file and find its docs', done => {
    (async () => {
      const { events } = await transformer({
        fileName: './data/sample_data_100.ndjson',
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
          const res = await fetch(`${elasticsearchUrl}/${indexName}/_search?q=the_index:99`);
          expect(res.status).toBe(200);

          const body = await res.json();
          expect(body?.hits?.total?.value).toBe(1);
        });

        done();
      });
    })();
  });
});
