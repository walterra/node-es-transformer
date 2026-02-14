const fs = require('fs');
const os = require('os');
const path = require('path');

const retry = require('async-retry');
const { tableFromArrays, tableToIPC } = require('apache-arrow');

const transformer = require('../dist/node-es-transformer.cjs');
const deleteIndex = require('./utils/delete_index');
const { elasticsearchUrl, getElasticsearchClient } = require('./utils/elasticsearch');

const client = getElasticsearchClient();

const indexes = {
  single: 'arrow_file_reader_single',
  wildcard: 'arrow_file_reader_wildcard',
  stream: 'arrow_stream_reader',
};

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-es-transformer-arrow-'));
const sampleFile1 = path.join(tempDir, 'sample_data_arrow_1.arrow');
const sampleFile2 = path.join(tempDir, 'sample_data_arrow_2.arrow');

async function runTransformerAndWait(options) {
  const { events } = await transformer(options);

  await new Promise((resolve, reject) => {
    events.on('finish', resolve);
    events.on('error', reject);
  });
}

function createArrowFile(filePath, rows) {
  const table = tableFromArrays({
    the_index: Int32Array.from(rows.map(row => row.the_index)),
    code: Int32Array.from(rows.map(row => row.code)),
    url: rows.map(row => row.url),
    text: rows.map(row => row.text),
  });

  const arrowBuffer = Buffer.from(tableToIPC(table, 'file'));
  fs.writeFileSync(filePath, arrowBuffer);
}

describe('indexes arrow IPC sources', () => {
  beforeAll(() => {
    createArrowFile(sampleFile1, [
      {
        the_index: 1,
        code: 100,
        url: 'https://example.com/a1',
        text: 'arrow-one',
      },
      {
        the_index: 2,
        code: 200,
        url: 'https://example.com/a2',
        text: 'arrow-two',
      },
      {
        the_index: 3,
        code: 300,
        url: 'https://example.com/a3',
        text: 'arrow-three',
      },
    ]);

    createArrowFile(sampleFile2, [
      {
        the_index: 4,
        code: 400,
        url: 'https://example.com/a4',
        text: 'arrow-four',
      },
      {
        the_index: 5,
        code: 500,
        url: 'https://example.com/a5',
        text: 'arrow-five',
      },
    ]);
  });

  afterAll(async () => {
    await deleteIndex(client, indexes.single)();
    await deleteIndex(client, indexes.wildcard)();
    await deleteIndex(client, indexes.stream)();
    await client.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should index an arrow file', async () => {
    await runTransformerAndWait({
      fileName: sampleFile1,
      sourceFormat: 'arrow',
      targetIndexName: indexes.single,
      mappings: {
        properties: {
          the_index: { type: 'integer' },
          code: { type: 'integer' },
          url: { type: 'keyword' },
          text: { type: 'keyword' },
        },
      },
      verbose: false,
    });

    await client.indices.refresh({ index: indexes.single });

    await retry(async () => {
      const res = await fetch(`${elasticsearchUrl}/${indexes.single}/_search?q=the_index:2`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body?.hits?.total?.value).toBe(1);
      expect(body?.hits?.hits?.[0]?._source?.text).toBe('arrow-two');
    });
  });

  it('should index arrow files through wildcard patterns', async () => {
    await runTransformerAndWait({
      fileName: path.join(tempDir, 'sample_data_arrow_*.arrow'),
      sourceFormat: 'arrow',
      targetIndexName: indexes.wildcard,
      mappings: {
        properties: {
          the_index: { type: 'integer' },
          code: { type: 'integer' },
          url: { type: 'keyword' },
          text: { type: 'keyword' },
        },
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
  });

  it('should index an arrow stream', async () => {
    await runTransformerAndWait({
      stream: fs.createReadStream(sampleFile1),
      sourceFormat: 'arrow',
      targetIndexName: indexes.stream,
      mappings: {
        properties: {
          the_index: { type: 'integer' },
          code: { type: 'integer' },
          url: { type: 'keyword' },
          text: { type: 'keyword' },
        },
      },
      verbose: false,
    });

    await client.indices.refresh({ index: indexes.stream });

    await retry(async () => {
      const res = await fetch(`${elasticsearchUrl}/${indexes.stream}/_search?q=the_index:3`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body?.hits?.total?.value).toBe(1);
      expect(body?.hits?.hits?.[0]?._source?.text).toBe('arrow-three');
    });
  });
});
