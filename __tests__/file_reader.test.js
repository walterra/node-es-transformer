const elasticsearch = require('@elastic/elasticsearch');
const frisby = require('frisby');

const transformer = require('../dist/node-es-transformer.cjs');

const elasticsearchUrl = 'http://localhost:9200';
const indexName = 'file_reader';

const client = new elasticsearch.Client({
  node: elasticsearchUrl,
});

describe('indexes an ndjson file', () => {
  afterAll(async () => {
    await client.indices.delete({
      index: indexName,
    });
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
        verbose: true,
      });

      events.on('finish', async () => {
        await client.indices.refresh({ index: indexName });

        frisby
          .get(`${elasticsearchUrl}/${indexName}/_search?q=the_index:9999`)
          .expect('status', 200)
          .expect('json', {
            hits: {
              total: {
                value: 1,
              },
            },
          });

        done();
      });
    })();
  });
});
