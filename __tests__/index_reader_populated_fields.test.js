const retry = require('async-retry');

const transformer = require('../dist/node-es-transformer.cjs');
const deleteIndex = require('./utils/delete_index');
const { elasticsearchUrl, getElasticsearchClient } = require('./utils/elasticsearch');

const client = getElasticsearchClient();
const sourceIndexName = 'source_populated_fields';
const targetIndexName = 'target_populated_fields';

describe('reindexes 10000 docs with populated fields only', () => {
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
            unpopulated_field: {
              type: 'keyword',
            },
            unpopulated_nested_field: {
              type: 'nested',
              properties: {
                the_inner_field: {
                  type: 'keyword',
                },
              },
            },
          },
        },
        verbose: false,
        transform: doc => ({ the_index: doc.the_index, url: doc.url }),
      });

      events.on('finish', async () => {
        await client.indices.refresh({ index: sourceIndexName });
        done();
      });
    })();
  });

  afterAll(async () => {
    await deleteIndex(client, sourceIndexName)();
    await deleteIndex(client, targetIndexName)();
    await client.close();
  });

  it('should reindex 10000 docs', done => {
    (async () => {
      await retry(async () => {
        const res = await fetch(`${elasticsearchUrl}/${sourceIndexName}/_search?q=the_index:9999`);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body?.hits?.total?.value).toBe(1);
      });

      const { events } = await transformer({
        sourceClient: client,
        targetClient: client,
        sourceIndexName,
        targetIndexName,
        populatedFields: true,
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
          expect(body.hits.hits[0]._source).toEqual({ the_index: 9999, url: 'login.php' });
        });

        done();
      });
    })();
  });
});
