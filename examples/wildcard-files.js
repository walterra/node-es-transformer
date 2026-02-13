/**
 * Wildcard File Ingestion Example
 * 
 * Demonstrates how to ingest multiple files matching a pattern.
 * Useful for batch processing directories of log files, exports, etc.
 */

const transformer = require('node-es-transformer');

// Example 1: Ingest all JSON files in a directory
transformer({
  fileName: 'logs/*.json',
  targetIndexName: 'application-logs',
  
  mappings: {
    properties: {
      '@timestamp': {
        type: 'date'
      },
      'level': {
        type: 'keyword'
      },
      'message': {
        type: 'text'
      },
      'service': {
        type: 'keyword'
      }
    }
  },
  
  // Optional: Add file name to each document
  transform(doc, context) {
    return {
      ...doc,
      source_file: context?.fileName || 'unknown'
    };
  }
}).then(() => {
  console.log('Wildcard ingestion complete!');
}).catch(err => {
  console.error('Error during wildcard ingestion:', err);
});

// Example 2: Process all CSV files from multiple directories
/*
transformer({
  fileName: 'data/**\/*.csv',  // Recursive search
  targetIndexName: 'csv-data',
  skipHeader: true,  // Skip CSV header row
  
  mappings: {
    properties: {
      'id': { type: 'keyword' },
      'value': { type: 'float' },
      'date': { type: 'date' }
    }
  }
});
*/

// Example 3: Year-specific log files
/*
transformer({
  fileName: 'logs/app-2024-*.log',
  targetIndexName: 'logs-2024',
  
  mappings: {
    properties: {
      '@timestamp': { type: 'date' },
      'message': { type: 'text' }
    }
  }
});
*/
