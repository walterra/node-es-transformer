const elasticsearch = require('@elastic/elasticsearch');
const retry = require('async-retry');

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
        verbose: false,
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
