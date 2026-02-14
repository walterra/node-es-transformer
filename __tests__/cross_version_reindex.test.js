/**
 * Cross-version reindexing tests
 * Tests reindexing from Elasticsearch 8.x to 9.x
 *
 * Run with: yarn test:cross-version
 *
 * This test requires TWO containers (ES 8.x and ES 9.x) running simultaneously
 */

const transformer = require('../dist/node-es-transformer.cjs');
const { Client: Client8 } = require('es8');
const { Client: Client9 } = require('es9');
const { readFileSync } = require('fs');
const pino = require('pino');

const logger = pino({
  name: 'node-es-transformer-test',
  level: process.env.LOG_LEVEL || 'info',
});

const testIndexPrefix = 'test-cross-version-';

// Read ES URLs from testcontainer setup
function getElasticsearchUrls() {
  const url8 = JSON.parse(readFileSync('.testcontainer-es8-url', 'utf8')).url;
  const url9 = JSON.parse(readFileSync('.testcontainer-es9-url', 'utf8')).url;

  return { url8, url9 };
}

describe('Cross-version reindexing (ES 8.x to 9.x)', () => {
  let url8, url9;
  let client8, client9;

  beforeAll(() => {
    const urls = getElasticsearchUrls();
    url8 = urls.url8;
    url9 = urls.url9;

    client8 = new Client8({ node: url8 });
    client9 = new Client9({ node: url9 });

    logger.info({ url8 }, 'Testing with ES 8.x');
    logger.info({ url9 }, 'Testing with ES 9.x');
  });

  afterAll(async () => {
    if (client8) await client8.close();
    if (client9) await client9.close();
  });

  test('should reindex from ES 8.x to ES 9.x with auto-detection', async () => {
    const sourceIndex = `${testIndexPrefix}source-8x-${Date.now()}`;
    const targetIndex = `${testIndexPrefix}target-9x-${Date.now()}`;

    // Create and populate source index in ES 8.x
    await client8.indices.create({
      index: sourceIndex,
      mappings: {
        properties: {
          first_name: { type: 'keyword' },
          last_name: { type: 'keyword' },
          age: { type: 'integer' },
        },
      },
    });

    await client8.bulk({
      refresh: true,
      operations: [
        { index: { _index: sourceIndex } },
        { first_name: 'John', last_name: 'Doe', age: 30 },
        { index: { _index: sourceIndex } },
        { first_name: 'Jane', last_name: 'Smith', age: 25 },
        { index: { _index: sourceIndex } },
        { first_name: 'Bob', last_name: 'Johnson', age: 35 },
      ],
    });

    // Reindex from ES 8.x to ES 9.x using auto-detection
    const { events } = await transformer({
      sourceClientConfig: { node: url8 },
      targetClientConfig: { node: url9 },
      sourceIndexName: sourceIndex,
      targetIndexName: targetIndex,
      verbose: false,
    });

    // Wait for indexing to complete
    await new Promise(resolve => {
      events.on('finish', resolve);
    });

    // Refresh to ensure documents are searchable
    await client9.indices.refresh({ index: targetIndex });

    // Verify data in ES 9.x
    const count = await client9.count({ index: targetIndex });
    expect(count.count).toBe(3);

    const result = await client9.search({
      index: targetIndex,
      query: { match_all: {} },
      size: 10,
    });

    expect(result.hits.hits.length).toBe(3);
    expect(result.hits.hits[0]._source).toHaveProperty('first_name');
    expect(result.hits.hits[0]._source).toHaveProperty('last_name');

    // Cleanup
    await client8.indices.delete({ index: sourceIndex });
    await client9.indices.delete({ index: targetIndex });
  }, 120000);

  test('should reindex from ES 8.x to ES 9.x with explicit version specification', async () => {
    const sourceIndex = `${testIndexPrefix}source-explicit-${Date.now()}`;
    const targetIndex = `${testIndexPrefix}target-explicit-${Date.now()}`;

    // Create and populate source index in ES 8.x
    await client8.indices.create({
      index: sourceIndex,
      mappings: {
        properties: {
          message: { type: 'text' },
          timestamp: { type: 'date' },
        },
      },
    });

    await client8.bulk({
      refresh: true,
      operations: [
        { index: { _index: sourceIndex } },
        { message: 'Test message 1', timestamp: '2024-01-01T00:00:00Z' },
        { index: { _index: sourceIndex } },
        { message: 'Test message 2', timestamp: '2024-01-02T00:00:00Z' },
      ],
    });

    // Reindex with explicit version specification
    const { events } = await transformer({
      sourceClientConfig: { node: url8 },
      targetClientConfig: { node: url9 },
      sourceClientVersion: 8,
      targetClientVersion: 9,
      sourceIndexName: sourceIndex,
      targetIndexName: targetIndex,
      verbose: false,
    });

    // Wait for indexing to complete
    await new Promise(resolve => {
      events.on('finish', resolve);
    });

    // Refresh to ensure documents are searchable
    await client9.indices.refresh({ index: targetIndex });

    // Verify data in ES 9.x
    const count = await client9.count({ index: targetIndex });
    expect(count.count).toBe(2);

    // Cleanup
    await client8.indices.delete({ index: sourceIndex });
    await client9.indices.delete({ index: targetIndex });
  }, 120000);

  test('should reindex from ES 8.x to ES 9.x using pre-instantiated clients', async () => {
    const sourceIndex = `${testIndexPrefix}source-clients-${Date.now()}`;
    const targetIndex = `${testIndexPrefix}target-clients-${Date.now()}`;

    // Create and populate source index in ES 8.x
    await client8.indices.create({
      index: sourceIndex,
      mappings: {
        properties: {
          product: { type: 'keyword' },
          price: { type: 'float' },
        },
      },
    });

    await client8.bulk({
      refresh: true,
      operations: [
        { index: { _index: sourceIndex } },
        { product: 'Widget', price: 9.99 },
        { index: { _index: sourceIndex } },
        { product: 'Gadget', price: 19.99 },
        { index: { _index: sourceIndex } },
        { product: 'Gizmo', price: 14.99 },
      ],
    });

    // Reindex using pre-instantiated clients
    const { events } = await transformer({
      sourceClient: client8,
      targetClient: client9,
      sourceIndexName: sourceIndex,
      targetIndexName: targetIndex,
      verbose: false,
    });

    // Wait for indexing to complete
    await new Promise(resolve => {
      events.on('finish', resolve);
    });

    // Refresh to ensure documents are searchable
    await client9.indices.refresh({ index: targetIndex });

    // Verify data in ES 9.x
    const count = await client9.count({ index: targetIndex });
    expect(count.count).toBe(3);

    // Cleanup
    await client8.indices.delete({ index: sourceIndex });
    await client9.indices.delete({ index: targetIndex });
  }, 120000);

  test('should apply transformations during cross-version reindexing', async () => {
    const sourceIndex = `${testIndexPrefix}source-transform-${Date.now()}`;
    const targetIndex = `${testIndexPrefix}target-transform-${Date.now()}`;

    // Create and populate source index in ES 8.x
    await client8.indices.create({
      index: sourceIndex,
      mappings: {
        properties: {
          first_name: { type: 'keyword' },
          last_name: { type: 'keyword' },
        },
      },
    });

    await client8.bulk({
      refresh: true,
      operations: [
        { index: { _index: sourceIndex } },
        { first_name: 'Alice', last_name: 'Wonder' },
        { index: { _index: sourceIndex } },
        { first_name: 'Bob', last_name: 'Builder' },
      ],
    });

    // Reindex with transformation
    const { events } = await transformer({
      sourceClientConfig: { node: url8 },
      targetClientConfig: { node: url9 },
      sourceIndexName: sourceIndex,
      targetIndexName: targetIndex,
      mappings: {
        properties: {
          first_name: { type: 'keyword' },
          last_name: { type: 'keyword' },
          full_name: { type: 'keyword' },
        },
      },
      transform(doc) {
        return {
          ...doc,
          full_name: `${doc.first_name} ${doc.last_name}`,
        };
      },
      verbose: false,
    });

    // Wait for indexing to complete
    await new Promise(resolve => {
      events.on('finish', resolve);
    });

    // Refresh to ensure documents are searchable
    await client9.indices.refresh({ index: targetIndex });

    // Verify transformed data in ES 9.x
    const result = await client9.search({
      index: targetIndex,
      query: { match_all: {} },
      size: 10,
    });

    expect(result.hits.hits.length).toBe(2);
    expect(result.hits.hits[0]._source).toHaveProperty('full_name');
    expect(result.hits.hits[0]._source.full_name).toMatch(/\w+ \w+/);

    // Cleanup
    await client8.indices.delete({ index: sourceIndex });
    await client9.indices.delete({ index: targetIndex });
  }, 120000);
});
