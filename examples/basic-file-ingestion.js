/**
 * Basic File Ingestion Example
 *
 * Demonstrates how to ingest a JSON or CSV file into Elasticsearch
 * with custom field mappings.
 */

const transformer = require('node-es-transformer');
const logger = require('./_logger');

// Example 1: Ingest JSON file
transformer({
  fileName: 'data/sample.json',
  targetIndexName: 'my-data-index',
  mappings: {
    properties: {
      '@timestamp': {
        type: 'date',
      },
      user_name: {
        type: 'keyword',
      },
      message: {
        type: 'text',
      },
      count: {
        type: 'integer',
      },
    },
  },
})
  .then(() => {
    logger.info('Ingestion complete');
  })
  .catch(err => {
    logger.error({ err }, 'Error during ingestion');
  });

// Example 2: Ingest with custom Elasticsearch connection
/*
transformer({
  fileName: 'data/sample.json',
  targetIndexName: 'my-data-index',
  targetClientConfig: {
    node: 'https://elasticsearch.example.com:9200',
    auth: {
      apiKey: process.env.ES_API_KEY
    },
    tls: {
      rejectUnauthorized: true
    }
  },
  mappings: {
    properties: {
      '@timestamp': { type: 'date' },
      'user_name': { type: 'keyword' }
    }
  }
});
*/
