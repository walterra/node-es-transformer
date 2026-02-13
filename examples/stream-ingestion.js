/**
 * Stream-Based Ingestion Example
 * 
 * Demonstrates how to ingest data from a Node.js stream.
 * Useful for processing data from APIs, databases, or custom sources.
 */

const transformer = require('node-es-transformer');
const { Readable } = require('stream');

// Example 1: Ingest from a simple readable stream
function createSampleStream() {
  const data = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' }
  ];
  
  return Readable.from(
    data.map(item => JSON.stringify(item) + '\n')
  );
}

transformer({
  stream: createSampleStream(),
  targetIndexName: 'users',
  
  mappings: {
    properties: {
      'id': {
        type: 'integer'
      },
      'name': {
        type: 'keyword'
      },
      'email': {
        type: 'keyword'
      }
    }
  }
}).then(() => {
  console.log('Stream ingestion complete!');
}).catch(err => {
  console.error('Error during stream ingestion:', err);
});

// Example 2: Ingest from HTTP API response stream
/*
const https = require('https');

function fetchDataStream() {
  return new Promise((resolve, reject) => {
    https.get('https://api.example.com/data', (res) => {
      resolve(res);
    }).on('error', reject);
  });
}

fetchDataStream().then(stream => {
  return transformer({
    stream: stream,
    targetIndexName: 'api-data',
    mappings: {
      properties: {
        'id': { type: 'keyword' },
        'value': { type: 'float' }
      }
    }
  });
});
*/

// Example 3: Process database query results as stream
/*
const { Readable } = require('stream');

async function queryDatabase() {
  // Pseudo-code for database streaming
  const cursor = await db.collection('items').find().stream();
  
  // Convert to newline-delimited JSON stream
  const jsonStream = new Readable({
    read() {
      cursor.on('data', (doc) => {
        this.push(JSON.stringify(doc) + '\n');
      });
      cursor.on('end', () => {
        this.push(null);
      });
    }
  });
  
  return transformer({
    stream: jsonStream,
    targetIndexName: 'db-items',
    mappings: {
      properties: {
        '_id': { type: 'keyword' },
        'name': { type: 'text' }
      }
    }
  });
}
*/
