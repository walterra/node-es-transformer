# Examples

This directory contains practical code examples demonstrating common use cases for node-es-transformer.

## Running Examples

Before running any example, make sure you have:

1. Elasticsearch running (default: `http://localhost:9200`)
2. node-es-transformer installed: `npm install node-es-transformer` or `yarn add node-es-transformer`

Then run any example:

```bash
node examples/basic-file-ingestion.js
```

## Available Examples

### [basic-file-ingestion.js](basic-file-ingestion.js)

Demonstrates the simplest use case: ingesting a JSON or CSV file into Elasticsearch with custom field mappings.

**Key concepts:**
- File-based ingestion
- Custom mappings
- Authentication configuration

### [reindex-with-transform.js](reindex-with-transform.js)

Shows how to reindex data from one Elasticsearch index to another while transforming documents.

**Key concepts:**
- Index-to-index reindexing
- Transform functions
- Filtering with queries
- Computed fields

### [cross-version-reindex.js](cross-version-reindex.js)

Demonstrates migrating data between Elasticsearch major versions (e.g., 8.x → 9.x).

**Key concepts:**
- Multi-version support
- Auto-detection vs manual version selection
- Pre-instantiated clients

### [document-splitting.js](document-splitting.js)

Shows how to split one source document into multiple target documents (e.g., one tweet → multiple hashtag docs).

**Key concepts:**
- Returning arrays from transform
- Entity-centric indexing
- Conditional document creation

### [wildcard-files.js](wildcard-files.js)

Demonstrates batch processing multiple files using wildcard patterns.

**Key concepts:**
- Wildcard file patterns
- Batch processing
- Adding file context to documents

### [stream-ingestion.js](stream-ingestion.js)

Shows how to ingest data from Node.js streams (APIs, databases, custom sources).

**Key concepts:**
- Stream-based ingestion
- HTTP API streaming
- Database cursor streaming

### [typescript-example.ts](typescript-example.ts)

Demonstrates TypeScript usage with full type safety and IntelliSense support.

**Key concepts:**
- Type definitions for all options
- Typed transform functions
- Type-safe document interfaces

## Common Patterns

### Authentication

Always use environment variables for credentials:

```javascript
transformer({
  targetClientConfig: {
    node: 'https://elasticsearch.example.com:9200',
    auth: {
      apiKey: process.env.ES_API_KEY  // Never hardcode
    }
  }
});
```

### Error Handling

Wrap transformer calls with try/catch or use .catch():

```javascript
const pino = require('pino');
const logger = pino({ name: 'my-app', level: process.env.LOG_LEVEL || 'info' });

transformer({ /* options */ })
  .then(() => logger.info('Success'))
  .catch(err => logger.error({ err }, 'Transformer failed'));
```

### Progress Monitoring

The library displays progress bars automatically. Set `verbose: false` to disable:

```javascript
transformer({
  fileName: 'large-file.json',
  targetIndexName: 'my-index',
  verbose: false  // Disable progress output
});
```

## Need More Help?

- Check the [README](../README.md) for full API documentation
- Review the [test files](../__tests__) for more usage examples
- Open an issue on GitHub for questions
