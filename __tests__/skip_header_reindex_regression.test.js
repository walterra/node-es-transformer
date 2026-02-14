const retry = require('async-retry');

const transformer = require('../dist/node-es-transformer.cjs');
const deleteIndex = require('./utils/delete_index');
const { elasticsearchUrl, getElasticsearchClient } = require('./utils/elasticsearch');

const client = getElasticsearchClient();
const sourceIndexName = 'skip_header_reindex_source';
const targetIndexName = 'skip_header_reindex_target';

async function runTransformerAndWait(options) {
  const { events } = await transformer(options);

  await new Promise((resolve, reject) => {
    events.on('finish', resolve);
    events.on('error', reject);
  });
}

describe('skipHeader regression for source index reindexing', () => {
  afterAll(async () => {
    await deleteIndex(client, sourceIndexName)();
    await deleteIndex(client, targetIndexName)();
    await client.close();
  });

  it('should not skip first document when sourceIndexName is used', done => {
    (async () => {
      await runTransformerAndWait({
        fileName: './data/sample_data_100.ndjson',
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
        deleteIndex: true,
        verbose: false,
      });

      await runTransformerAndWait({
        sourceIndexName,
        targetIndexName,
        skipHeader: true,
        deleteIndex: true,
        verbose: false,
      });

      await client.indices.refresh({ index: targetIndexName });

      await retry(async () => {
        const firstDocRes = await fetch(
          `${elasticsearchUrl}/${targetIndexName}/_search?q=the_index:0`,
        );
        expect(firstDocRes.status).toBe(200);
        const firstDocBody = await firstDocRes.json();
        expect(firstDocBody?.hits?.total?.value).toBe(1);

        const countRes = await fetch(`${elasticsearchUrl}/${targetIndexName}/_count`);
        expect(countRes.status).toBe(200);
        const countBody = await countRes.json();
        expect(countBody?.count).toBe(100);
      });

      done();
    })();
  });
});
