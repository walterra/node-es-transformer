/**
 * Cross-Version Reindex Example
 * 
 * Demonstrates reindexing from Elasticsearch 8.x to 9.x.
 * The library automatically detects the ES version and uses the appropriate client.
 */

const transformer = require('node-es-transformer');

// Example 1: Auto-detection (recommended)
transformer({
  sourceClientConfig: {
    node: 'https://es8-cluster.example.com:9200',
    auth: {
      apiKey: process.env.ES8_API_KEY
    }
  },
  targetClientConfig: {
    node: 'https://es9-cluster.example.com:9200',
    auth: {
      apiKey: process.env.ES9_API_KEY
    }
  },
  sourceIndexName: 'my-index-v1',
  targetIndexName: 'my-index-v1',
  
  // Optional: Transform data during migration
  transform(doc) {
    // Clean up deprecated fields, add new fields, etc.
    return {
      ...doc,
      migrated_at: new Date().toISOString()
    };
  }
}).then(() => {
  console.log('Cross-version reindex complete!');
}).catch(err => {
  console.error('Error during cross-version reindex:', err);
});

// Example 2: Using pre-instantiated clients (advanced)
/*
const { Client: Client8 } = require('es8');
const { Client: Client9 } = require('es9');

const sourceClient = new Client8({
  node: 'https://es8-cluster.example.com:9200',
  auth: { apiKey: process.env.ES8_API_KEY }
});

const targetClient = new Client9({
  node: 'https://es9-cluster.example.com:9200',
  auth: { apiKey: process.env.ES9_API_KEY }
});

transformer({
  sourceClient,
  targetClient,
  sourceIndexName: 'my-index-v1',
  targetIndexName: 'my-index-v1'
});
*/

// Example 3: Force specific client versions (if auto-detection fails)
/*
transformer({
  sourceClientConfig: { node: 'https://es8.example.com:9200' },
  targetClientConfig: { node: 'https://es9.example.com:9200' },
  sourceClientVersion: 8,  // Force ES 8.x client
  targetClientVersion: 9,  // Force ES 9.x client
  sourceIndexName: 'my-index',
  targetIndexName: 'my-index'
});
*/
