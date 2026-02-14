const { Readable } = require('stream');

const retry = require('async-retry');

const transformer = require('../dist/node-es-transformer.cjs');
const deleteIndex = require('./utils/delete_index');
const { elasticsearchUrl, getElasticsearchClient } = require('./utils/elasticsearch');

const client = getElasticsearchClient();

const indexes = {
  single: 'csv_file_reader_single',
  wildcard: 'csv_file_reader_wildcard',
  stream: 'csv_stream_reader',
};

async function runTransformerAndWait(options) {
  const { events } = await transformer(options);

  await new Promise((resolve, reject) => {
    events.on('finish', resolve);
    events.on('error', reject);
  });
}

describe('indexes csv sources', () => {
  afterAll(async () => {
    await deleteIndex(client, indexes.single)();
    await deleteIndex(client, indexes.wildcard)();
    await deleteIndex(client, indexes.stream)();
    await client.close();
  });

  it('should index a csv file with quoted values', done => {
    (async () => {
      await runTransformerAndWait({
        fileName: './data/sample_data_csv_1.csv',
        sourceFormat: 'csv',
        targetIndexName: indexes.single,
        mappings: {
          properties: {
            the_index: { type: 'integer' },
            code: { type: 'integer' },
            url: { type: 'keyword' },
            text: { type: 'keyword' },
          },
        },
        transform(doc) {
          return {
            ...doc,
            the_index: Number(doc.the_index),
            code: Number(doc.code),
          };
        },
        verbose: false,
      });

      await client.indices.refresh({ index: indexes.single });

      await retry(async () => {
        const res = await fetch(`${elasticsearchUrl}/${indexes.single}/_search?q=the_index:2`);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body?.hits?.total?.value).toBe(1);
        expect(body?.hits?.hits?.[0]?._source?.text).toBe('multi\nline');
      });

      done();
    })();
  });

  it('should index csv files through wildcard patterns', done => {
    (async () => {
      await runTransformerAndWait({
        fileName: './data/sample_data_csv_*.csv',
        sourceFormat: 'csv',
        targetIndexName: indexes.wildcard,
        mappings: {
          properties: {
            the_index: { type: 'integer' },
            code: { type: 'integer' },
            url: { type: 'keyword' },
            text: { type: 'keyword' },
          },
        },
        transform(doc) {
          return {
            ...doc,
            the_index: Number(doc.the_index),
            code: Number(doc.code),
          };
        },
        verbose: false,
      });

      await client.indices.refresh({ index: indexes.wildcard });

      await retry(async () => {
        const res = await fetch(`${elasticsearchUrl}/${indexes.wildcard}/_count`);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body?.count).toBe(5);
      });

      done();
    })();
  });

  it('should index a csv stream', done => {
    (async () => {
      const csvStream = Readable.from([
        'the_index,code,url,text\n10,300,https://example.com/s1,stream-one\n11,301,https://example.com/s2,stream-two\n',
      ]);

      await runTransformerAndWait({
        stream: csvStream,
        sourceFormat: 'csv',
        targetIndexName: indexes.stream,
        mappings: {
          properties: {
            the_index: { type: 'integer' },
            code: { type: 'integer' },
            url: { type: 'keyword' },
            text: { type: 'keyword' },
          },
        },
        transform(doc) {
          return {
            ...doc,
            the_index: Number(doc.the_index),
            code: Number(doc.code),
          };
        },
        verbose: false,
      });

      await client.indices.refresh({ index: indexes.stream });

      await retry(async () => {
        const res = await fetch(`${elasticsearchUrl}/${indexes.stream}/_search?q=the_index:11`);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body?.hits?.total?.value).toBe(1);
      });

      done();
    })();
  });
});
