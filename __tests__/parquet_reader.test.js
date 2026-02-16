const fs = require('fs');
const os = require('os');
const path = require('path');

const retry = require('async-retry');
const parquet = require('@dsnp/parquetjs');
const zlib = require('zlib');
const { PARQUET_COMPRESSION_METHODS } = require('@dsnp/parquetjs/dist/lib/compression');

function registerZstdCompression() {
  if (PARQUET_COMPRESSION_METHODS.ZSTD) {
    return;
  }

  if (
    typeof zlib.zstdCompressSync !== 'function' ||
    typeof zlib.zstdDecompressSync !== 'function'
  ) {
    throw new Error('ZSTD compression requires Node.js with zstd support.');
  }

  PARQUET_COMPRESSION_METHODS.ZSTD = {
    deflate(value) {
      return zlib.zstdCompressSync(value);
    },
    inflate(value) {
      return zlib.zstdDecompressSync(value);
    },
  };
}

registerZstdCompression();

const transformer = require('../dist/node-es-transformer.cjs');
const deleteIndex = require('./utils/delete_index');
const { elasticsearchUrl, getElasticsearchClient } = require('./utils/elasticsearch');

const client = getElasticsearchClient();

const indexes = {
  single: 'parquet_file_reader_single',
  noTransform: 'parquet_file_reader_no_transform',
  wildcard: 'parquet_file_reader_wildcard',
  stream: 'parquet_stream_reader',
  zstd: 'parquet_file_reader_zstd',
};

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-es-transformer-parquet-'));
const sampleFile1 = path.join(tempDir, 'sample_data_parquet_1.parquet');
const sampleFile2 = path.join(tempDir, 'sample_data_parquet_2.parquet');
const sampleFileZstd = path.join(tempDir, 'sample_data_parquet_zstd.parquet');

async function runTransformerAndWait(options) {
  const { events } = await transformer(options);

  await new Promise((resolve, reject) => {
    events.on('finish', resolve);
    events.on('error', reject);
  });
}

function buildField(type, compression) {
  return compression ? { type, compression } : { type };
}

async function createParquetFile(filePath, rows, compression) {
  const schema = new parquet.ParquetSchema({
    the_index: buildField('INT64', compression),
    code: buildField('INT64', compression),
    url: buildField('UTF8', compression),
    text: buildField('UTF8', compression),
  });

  const writer = await parquet.ParquetWriter.openFile(schema, filePath);

  try {
    for (const row of rows) {
      // eslint-disable-next-line no-await-in-loop
      await writer.appendRow(row);
    }
  } finally {
    await writer.close();
  }
}

describe('indexes parquet sources', () => {
  beforeAll(async () => {
    await createParquetFile(sampleFile1, [
      {
        the_index: 1,
        code: 100,
        url: 'https://example.com/p1',
        text: 'parquet-one',
      },
      {
        the_index: 2,
        code: 200,
        url: 'https://example.com/p2',
        text: 'parquet-two',
      },
      {
        the_index: 3,
        code: 300,
        url: 'https://example.com/p3',
        text: 'parquet-three',
      },
    ]);

    await createParquetFile(sampleFile2, [
      {
        the_index: 4,
        code: 400,
        url: 'https://example.com/p4',
        text: 'parquet-four',
      },
      {
        the_index: 5,
        code: 500,
        url: 'https://example.com/p5',
        text: 'parquet-five',
      },
    ]);

    await createParquetFile(
      sampleFileZstd,
      [
        {
          the_index: 6,
          code: 600,
          url: 'https://example.com/p6',
          text: 'parquet-zstd-one',
        },
        {
          the_index: 7,
          code: 700,
          url: 'https://example.com/p7',
          text: 'parquet-zstd-two',
        },
      ],
      'ZSTD',
    );
  });

  afterAll(async () => {
    await deleteIndex(client, indexes.single)();
    await deleteIndex(client, indexes.noTransform)();
    await deleteIndex(client, indexes.wildcard)();
    await deleteIndex(client, indexes.stream)();
    await deleteIndex(client, indexes.zstd)();
    await client.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should index a parquet file', async () => {
    await runTransformerAndWait({
      fileName: sampleFile1,
      sourceFormat: 'parquet',
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
      expect(body?.hits?.hits?.[0]?._source?.text).toBe('parquet-two');
    });
  });

  it('should index a parquet file without a transform', async () => {
    await runTransformerAndWait({
      fileName: sampleFile1,
      sourceFormat: 'parquet',
      targetIndexName: indexes.noTransform,
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

    await client.indices.refresh({ index: indexes.noTransform });

    await retry(async () => {
      const res = await fetch(`${elasticsearchUrl}/${indexes.noTransform}/_search?q=the_index:2`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body?.hits?.total?.value).toBe(1);
      expect(body?.hits?.hits?.[0]?._source?.text).toBe('parquet-two');
    });
  });

  it('should index a ZSTD-compressed parquet file', async () => {
    await runTransformerAndWait({
      fileName: sampleFileZstd,
      sourceFormat: 'parquet',
      targetIndexName: indexes.zstd,
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

    await client.indices.refresh({ index: indexes.zstd });

    await retry(async () => {
      const res = await fetch(`${elasticsearchUrl}/${indexes.zstd}/_search?q=the_index:6`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body?.hits?.total?.value).toBe(1);
      expect(body?.hits?.hits?.[0]?._source?.text).toBe('parquet-zstd-one');
    });
  });

  it('should index parquet files through wildcard patterns', async () => {
    await runTransformerAndWait({
      fileName: path.join(tempDir, 'sample_data_parquet_*.parquet'),
      sourceFormat: 'parquet',
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
      expect(body?.count).toBe(7);
    });
  });

  it('should index a parquet stream', async () => {
    await runTransformerAndWait({
      stream: fs.createReadStream(sampleFile1),
      sourceFormat: 'parquet',
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
      const res = await fetch(`${elasticsearchUrl}/${indexes.stream}/_search?q=the_index:3`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body?.hits?.total?.value).toBe(1);
      expect(body?.hits?.hits?.[0]?._source?.text).toBe('parquet-three');
    });
  });
});
