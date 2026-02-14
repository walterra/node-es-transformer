const retry = require('async-retry');

const transformer = require('../dist/node-es-transformer.cjs');
const deleteIndex = require('./utils/delete_index');
const { elasticsearchUrl, getElasticsearchClient } = require('./utils/elasticsearch');

const client = getElasticsearchClient();
const inferredIndex = 'infer_mappings_csv';
const explicitMappingIndex = 'infer_mappings_explicit';
const explicitPipelineIndex = 'infer_mappings_explicit_pipeline';

function createCapturingClient(rawClient, calls, pipelineCalls, forceInferredPipeline = false) {
  return {
    info: (...args) => rawClient.info(...args),
    close: (...args) => rawClient.close(...args),
    indices: rawClient.indices,
    helpers: rawClient.helpers,
    ingest: {
      putPipeline: async params => {
        pipelineCalls.push(params);
        return rawClient.ingest.putPipeline(params);
      },
    },
    textStructure: {
      findStructure: async params => {
        calls.push(params);
        const response = await rawClient.textStructure.findStructure(params);

        if (!forceInferredPipeline) {
          return response;
        }

        return {
          ...response,
          ingest_pipeline: {
            description: 'Inferred test pipeline',
            processors: [
              {
                set: {
                  field: 'inferred_pipeline_used',
                  value: true,
                },
              },
            ],
          },
        };
      },
    },
  };
}

describe('mapping inference via _text_structure/find_structure', () => {
  afterAll(async () => {
    await deleteIndex(client, inferredIndex)();
    await deleteIndex(client, explicitMappingIndex)();
    await deleteIndex(client, explicitPipelineIndex)();
    await client.ingest.deletePipeline({ id: 'manual-csv-pipeline' }).catch(() => {});
    await client.close();
  });

  it('should infer mappings and apply inferred ingest pipeline', done => {
    (async () => {
      const calls = [];
      const pipelineCalls = [];
      const capturingClient = createCapturingClient(client, calls, pipelineCalls, true);

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

        expect(pipelineCalls.length).toBe(1);
        expect(pipelineCalls[0].id).toBe(`${inferredIndex}-inferred-pipeline`);

        await client.indices.refresh({ index: inferredIndex });

        await retry(async () => {
          const res = await fetch(`${elasticsearchUrl}/${inferredIndex}/_count`);
          expect(res.status).toBe(200);

          const body = await res.json();
          expect(body?.count).toBe(3);

          const pipelineRes = await fetch(
            `${elasticsearchUrl}/${inferredIndex}/_search?q=inferred_pipeline_used:true`,
          );
          expect(pipelineRes.status).toBe(200);

          const pipelineBody = await pipelineRes.json();
          expect(pipelineBody?.hits?.total?.value).toBe(3);
        });

        done();
      });
    })();
  });

  it('should skip inference when mappings are explicitly provided', done => {
    (async () => {
      const calls = [];
      const pipelineCalls = [];
      const capturingClient = createCapturingClient(client, calls, pipelineCalls);

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
        expect(pipelineCalls.length).toBe(0);

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

  it('should prefer explicit pipeline over inferred ingest pipeline', done => {
    (async () => {
      await client.ingest.putPipeline({
        id: 'manual-csv-pipeline',
        processors: [
          {
            set: {
              field: 'manual_pipeline_used',
              value: true,
            },
          },
        ],
      });

      const calls = [];
      const pipelineCalls = [];
      const capturingClient = createCapturingClient(client, calls, pipelineCalls, true);

      const { events } = await transformer({
        sourceClient: capturingClient,
        targetClient: capturingClient,
        fileName: './data/sample_data_csv_1.csv',
        sourceFormat: 'csv',
        targetIndexName: explicitPipelineIndex,
        inferMappings: true,
        pipeline: 'manual-csv-pipeline',
        deleteIndex: true,
        verbose: false,
      });

      events.on('finish', async () => {
        expect(calls.length).toBe(1);
        expect(pipelineCalls.length).toBe(0);

        await client.indices.refresh({ index: explicitPipelineIndex });

        await retry(async () => {
          const res = await fetch(
            `${elasticsearchUrl}/${explicitPipelineIndex}/_search?q=manual_pipeline_used:true`,
          );
          expect(res.status).toBe(200);

          const body = await res.json();
          expect(body?.hits?.total?.value).toBe(3);
        });

        done();
      });
    })();
  });
});
