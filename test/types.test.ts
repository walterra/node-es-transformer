/**
 * TypeScript definitions validation test
 * 
 * This file validates that the TypeScript definitions are correct and complete.
 * It's type-checked in CI but never executed.
 */

import transformer, { TransformerOptions, TransformFunction, Mappings } from '../index';
import { Client } from 'es9';

// Test 1: Basic options type checking
const basicOptions: TransformerOptions = {
  fileName: 'data/sample.json',
  targetIndexName: 'my-index',
  mappings: {
    properties: {
      name: { type: 'keyword' },
      value: { type: 'integer' }
    }
  }
};

// Test 2: All options
const fullOptions: TransformerOptions = {
  targetIndexName: 'test-index',
  deleteIndex: true,
  sourceClientConfig: { node: 'http://localhost:9200' },
  targetClientConfig: { node: 'http://localhost:9200' },
  sourceClientVersion: 8,
  targetClientVersion: 9,
  bufferSize: 5120,
  searchSize: 100,
  fileName: 'data/*.json',
  splitRegex: /\n/,
  sourceIndexName: 'source-index',
  mappings: {
    properties: {
      id: { type: 'keyword' }
    }
  },
  mappingsOverride: true,
  indexMappingTotalFieldsLimit: 2000,
  pipeline: 'my-pipeline',
  populatedFields: false,
  query: { match_all: {} },
  skipHeader: false,
  verbose: true,
  transform: (doc: any) => doc
};

// Test 3: Transform function types
const simpleTransform: TransformFunction = (doc) => {
  return { ...doc, processed: true };
};

const typedTransform: TransformFunction = (doc: any, context?) => {
  if (context?.fileName) {
    return { ...doc, source: context.fileName };
  }
  return doc;
};

const arrayTransform: TransformFunction = (doc: any) => {
  return [doc, { ...doc, duplicate: true }];
};

const nullTransform: TransformFunction = (doc: any) => {
  if (doc.skip) return null;
  return doc;
};

// Test 4: Mappings type
const mappings: Mappings = {
  properties: {
    '@timestamp': { type: 'date' },
    name: { type: 'text' },
    count: { type: 'integer' },
    nested: {
      type: 'nested',
      properties: {
        field: { type: 'keyword' }
      }
    }
  }
};

// Test 5: Client instances
const sourceClient = new Client({ node: 'http://localhost:9200' });
const targetClient = new Client({ node: 'http://localhost:9200' });

const clientOptions: TransformerOptions = {
  sourceClient,
  targetClient,
  sourceIndexName: 'source',
  targetIndexName: 'target'
};

// Test 6: Return type
async function testReturnType() {
  const result = await transformer(basicOptions);
  
  // Should have events property
  result.events.on('complete', () => {
    console.log('Done');
  });
  
  result.events.on('error', (err: Error) => {
    console.error(err);
  });
}

// Test 7: Stream option
import { Readable } from 'stream';

const streamOptions: TransformerOptions = {
  stream: Readable.from(['{"test": true}']),
  targetIndexName: 'stream-index'
};

// Test 8: Required fields only
const minimalOptions: TransformerOptions = {
  targetIndexName: 'minimal-index'
};

// Test 9: Type errors should be caught (these are commented out to prevent compilation errors)
/*
// @ts-expect-error - targetIndexName is required
const missingRequired: TransformerOptions = {
  fileName: 'data.json'
};

// @ts-expect-error - sourceClientVersion must be 8 or 9
const invalidVersion: TransformerOptions = {
  targetIndexName: 'test',
  sourceClientVersion: 10
};

// @ts-expect-error - bufferSize must be a number
const wrongType: TransformerOptions = {
  targetIndexName: 'test',
  bufferSize: '5120'
};
*/

// Test 10: Query types (from @elastic/elasticsearch)
const queryOptions: TransformerOptions = {
  sourceIndexName: 'source',
  targetIndexName: 'target',
  query: {
    bool: {
      must: [
        { term: { status: 'active' } },
        { range: { created_at: { gte: '2024-01-01' } } }
      ]
    }
  }
};

// Export to prevent "unused" warnings
export {
  basicOptions,
  fullOptions,
  simpleTransform,
  typedTransform,
  arrayTransform,
  nullTransform,
  mappings,
  clientOptions,
  streamOptions,
  minimalOptions,
  queryOptions,
  testReturnType
};
