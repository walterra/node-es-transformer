const elasticsearch = require('@elastic/elasticsearch');
const frisby = require('frisby');

const transformer = require('../dist/node-es-transformer.cjs');

const elasticsearchUrl = 'http://localhost:9200';
const sourceIndexName = 'file_reader_10000';
const targetIndexName = 'reindex_10000';

const client = new elasticsearch.Client({
  node: elasticsearchUrl,
});

describe('reindexes 10000 docs', () => {
  beforeAll(done => {
    (async () => {
      const { events } = await transformer({
        fileName: './data/sample_data_10000.ndjson',
        targetIndexName: sourceIndexName,
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
      });

      events.on('finish', async () => {
        await client.indices.refresh({ index: sourceIndexName });
        done();
      });
    })();
  });

  afterAll(async () => {
    await client.indices.delete({
      index: sourceIndexName,
    });
    await client.indices.delete({
      index: targetIndexName,
    });
  });

  it('should reindex 10000 docs', done => {
    (async () => {
      const { events } = await transformer({
        sourceClient: client,
        targetClient: client,
        sourceIndexName,
        targetIndexName,
        verbose: true,
      });

      events.on('finish', async () => {
        await client.indices.refresh({ index: targetIndexName });

        frisby
          .get(`${elasticsearchUrl}/${targetIndexName}/_search?q=the_index:9999`)
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
