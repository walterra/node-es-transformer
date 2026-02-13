/**
 * Reindex with Transformation Example
 * 
 * Demonstrates how to reindex data from one Elasticsearch index to another
 * while transforming the documents.
 */

const transformer = require('node-es-transformer');

// Example: Combine first_name and last_name into full_name
transformer({
  sourceIndexName: 'users-v1',
  targetIndexName: 'users-v2',
  
  // Optional: Custom mappings for the new index
  mappings: {
    properties: {
      '@timestamp': {
        type: 'date'
      },
      'first_name': {
        type: 'keyword'
      },
      'last_name': {
        type: 'keyword'
      },
      'full_name': {
        type: 'keyword'
      },
      'email': {
        type: 'keyword'
      }
    }
  },
  
  // Transform function runs on each document
  transform(doc) {
    return {
      ...doc,
      full_name: `${doc.first_name} ${doc.last_name}`,
      // You can add computed fields, remove fields, etc.
    };
  }
}).then(() => {
  console.log('Reindex complete!');
}).catch(err => {
  console.error('Error during reindex:', err);
});

// Example 2: Filter documents during reindex
/*
transformer({
  sourceIndexName: 'logs-raw',
  targetIndexName: 'logs-errors-only',
  
  // Query to filter source documents
  query: {
    term: {
      level: 'error'
    }
  },
  
  transform(doc) {
    // Skip documents by returning null
    if (doc.level !== 'error') {
      return null;
    }
    
    // Add severity field
    return {
      ...doc,
      severity: doc.message.includes('CRITICAL') ? 'critical' : 'standard'
    };
  }
});
*/
