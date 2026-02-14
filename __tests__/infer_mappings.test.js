const retry = require('async-retry');

const transformer = require('../dist/node-es-transformer.cjs');
const deleteIndex = require('./utils/delete_index');
const { elasticsearchUrl, getElasticsearchClient } = require('./utils/elasticsearch');

const client = getElasticsearchClient();
const inferredIndex = 'infer_mappings_csv';
const explicitMappingIndex = 'infer_mappings_explicit';

function createCapturingClient(rawClient, calls) {
  return {
    info: (...args) => rawClient.info(...args),
    close: (...args) => rawClient.close(...args),
    indices: rawClient.indices,
    helpers: rawClient.helpers,
    textStructure: {
      findStructure: async params => {
        calls.push(params);
        return rawClient.textStructure.findStructure(params);
      },
    },
  };
}

describe('mapping inference via _text_structure/find_structure', () => {
  afterAll(async () => {
    await deleteIndex(client, inferredIndex)();
    await deleteIndex(client, explicitMappingIndex)();
    await client.close();
  });

  it('should call text structure API when inferMappings is enabled', done => {
    (async () => {
      const calls = [];
      const capturingClient = createCapturingClient(client, calls);

      const { events } = await transformer({
        sourceClient: capturingClient,
        targetClient: capturingClient,
        fileName: './data/sample_data_csv_1.csv',
        sourceFormat: 'csv',
        targetIndexName: inferredIndex,
        inferMappings: true,
        inferMappingsOptions: {
          lines_to_sample: 100,
        },
        deleteIndex: true,
        verbose: false,
      });

      events.on('finish', async () => {
        expect(calls.length).toBe(1);
        expect(calls[0].format).toBe('delimited');
        expect(typeof calls[0].body).toBe('string');

        await client.indices.refresh({ index: inferredIndex });

        await retry(async () => {
          const res = await fetch(`${elasticsearchUrl}/${inferredIndex}/_count`);
          expect(res.status).toBe(200);

          const body = await res.json();
          expect(body?.count).toBe(3);
        });

        done();
      });
    })();
  });

  it('should skip inference when mappings are explicitly provided', done => {
    (async () => {
      const calls = [];
      const capturingClient = createCapturingClient(client, calls);

      const { events } = await transformer({
        sourceClient: capturingClient,
        targetClient: capturingClient,
        fileName: './data/sample_data_csv_1.csv',
        sourceFormat: 'csv',
        targetIndexName: explicitMappingIndex,
        inferMappings: true,
        mappings: {
          properties: {
            the_index: { type: 'integer' },
            code: { type: 'integer' },
            url: { type: 'keyword' },
            text: { type: 'keyword' },
          },
        },
        deleteIndex: true,
        verbose: false,
      });

      events.on('finish', async () => {
        expect(calls.length).toBe(0);

        await client.indices.refresh({ index: explicitMappingIndex });

        await retry(async () => {
          const res = await fetch(`${elasticsearchUrl}/${explicitMappingIndex}/_count`);
          expect(res.status).toBe(200);

          const body = await res.json();
          expect(body?.count).toBe(3);
        });

        done();
      });
    })();
  });
});
