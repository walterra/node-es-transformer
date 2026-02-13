[![npm](https://img.shields.io/npm/v/node-es-transformer.svg?maxAge=2592000)](https://www.npmjs.com/package/node-es-transformer)
[![npm](https://img.shields.io/npm/l/node-es-transformer.svg?maxAge=2592000)](https://www.npmjs.com/package/node-es-transformer)
[![npm](https://img.shields.io/npm/dt/node-es-transformer.svg?maxAge=2592000)](https://www.npmjs.com/package/node-es-transformer)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![CI](https://github.com/walterra/node-es-transformer/actions/workflows/ci.yml/badge.svg)](https://github.com/walterra/node-es-transformer/actions)

# node-es-transformer

A nodejs based library to (re)index and transform data from/to Elasticsearch.

### Why another reindex/ingestion tool?

If you're looking for a nodejs based tool which allows you to ingest large CSV/JSON files in the GigaBytes you've come to the right place. Everything else I've tried with larger files runs out of JS heap, hammers ES with too many single requests, times out or tries to do everything with a single bulk request.

While I'd generally recommend using [Logstash](https://www.elastic.co/products/logstash), [filebeat](https://www.elastic.co/products/beats/filebeat), [Ingest Nodes](https://www.elastic.co/guide/en/elasticsearch/reference/master/ingest.html), [Elastic Agent](https://www.elastic.co/guide/en/fleet/current/fleet-overview.html) or [Elasticsearch Transforms](https://www.elastic.co/guide/en/elasticsearch/reference/current/transforms.html) for established use cases, this tool may be of help especially if you feel more at home in the JavaScript/nodejs universe and have use cases with customized ingestion and data transformation needs.

## Features

- Buffering/Streaming for both reading and indexing. Files are read using streaming and Elasticsearch ingestion is done using buffered bulk indexing. This is tailored towards ingestion of large files. Successfully tested so far with JSON and CSV files in the range of 20-30 GBytes. On a single machine running both `node-es-transformer` and Elasticsearch ingestion rates up to 20k documents/second were achieved (2,9 GHz Intel Core i7, 16GByte RAM, SSD), depending on document size.
- Supports wildcards to ingest/transform a range of files in one go.
- Supports fetching documents from existing indices using search/scroll. This allows you to reindex with custom data transformations just using JavaScript in the `transform` callback.
- Supports ingesting docs based on a nodejs stream.
- The `transform` callback gives you each source document, but you can split it up in multiple ones and return an array of documents. An example use case for this: Each source document is a Tweet and you want to transform that into an entity centric index based on Hashtags.

## Version Compatibility

| node-es-transformer | Elasticsearch Client | Elasticsearch Server | Node.js |
|---------------------|---------------------|---------------------|---------|
| 1.0.0-beta8+        | 8.x and 9.x         | 8.x and 9.x         | 22+     |
| 1.0.0-beta7         | 9.x only            | 9.x only            | 22+     |
| 1.0.0-beta6 and earlier | 8.x            | 8.x                 | 22+     |

**Multi-Version Support**: Starting with v1.0.0-beta8, the library supports both Elasticsearch 8.x and 9.x through automatic version detection and client aliasing. This enables seamless reindexing between major versions (e.g., migrating from ES 8.x to 9.x). All functionality is tested in CI against multiple ES versions including cross-version reindexing scenarios.

**Upgrading?** See [MIGRATION.md](MIGRATION.md) for upgrade guidance from beta versions to v1.0.0.

## Installation

```bash
npm install node-es-transformer
# or
yarn add node-es-transformer
```

## Usage

### Read from a file

```javascript
const transformer = require('node-es-transformer');

transformer({
  fileName: 'filename.json',
  targetIndexName: 'my-index',
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
      }
      'full_name': {
        type: 'keyword'
      }
    }
  },
  transform(line) {
    return {
      ...line,
      full_name: `${line.first_name} ${line.last_name}`
    }
  }
});
```

### Read from another index

```javascript
const transformer = require('node-es-transformer');

transformer({
  sourceIndexName: 'my-source-index',
  targetIndexName: 'my-target-index',
  // optional, if you skip mappings, they will be fetched from the source index.
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
      }
      'full_name': {
        type: 'keyword'
      }
    }
  },
  transform(doc) {
    return {
      ...doc,
      full_name: `${line.first_name} ${line.last_name}`
    }
  }
});
```

### Reindex from Elasticsearch 8.x to 9.x

The library automatically detects the Elasticsearch version and uses the appropriate client. This enables seamless reindexing between major versions:

```javascript
const transformer = require('node-es-transformer');

// Auto-detection (recommended)
transformer({
  sourceClientConfig: {
    node: 'https://es8-cluster.example.com:9200',
    auth: { apiKey: 'your-es8-api-key' }
  },
  targetClientConfig: {
    node: 'https://es9-cluster.example.com:9200',
    auth: { apiKey: 'your-es9-api-key' }
  },
  sourceIndexName: 'my-source-index',
  targetIndexName: 'my-target-index',
  transform(doc) {
    // Optional transformation during reindexing
    return doc;
  }
});

// Explicit version specification (if auto-detection fails)
transformer({
  sourceClientConfig: { /* ... */ },
  targetClientConfig: { /* ... */ },
  sourceClientVersion: 8,  // Force ES 8.x client
  targetClientVersion: 9,  // Force ES 9.x client
  sourceIndexName: 'my-source-index',
  targetIndexName: 'my-target-index'
});

// Using pre-instantiated clients (advanced)
const { Client: Client8 } = require('es8');
const { Client: Client9 } = require('es9');

const sourceClient = new Client8({
  node: 'https://es8-cluster.example.com:9200'
});
const targetClient = new Client9({
  node: 'https://es9-cluster.example.com:9200'
});

transformer({
  sourceClient,
  targetClient,
  sourceIndexName: 'my-source-index',
  targetIndexName: 'my-target-index'
});
```

**Note**: To use pre-instantiated clients with different ES versions, install both client versions:

```bash
npm install es9@npm:@elastic/elasticsearch@^9.2.0
npm install es8@npm:@elastic/elasticsearch@^8.17.0
```

## API Reference

### Configuration Options

All options are passed to the main `transformer()` function.

#### Required Options

- **`targetIndexName`** (string): The target Elasticsearch index where documents will be indexed.

#### Source Options

Choose **one** of these sources:

- **`fileName`** (string): Source filename to ingest. Supports wildcards (e.g., `logs/*.json`).
- **`sourceIndexName`** (string): Source Elasticsearch index to reindex from.
- **`stream`** (Readable): Node.js readable stream to ingest from.

#### Client Configuration

- **`sourceClient`** (Client): Pre-instantiated Elasticsearch client for source operations. If provided, `sourceClientConfig` is ignored.
- **`targetClient`** (Client): Pre-instantiated Elasticsearch client for target operations. If not provided, uses `sourceClient` or creates from config.
- **`sourceClientConfig`** (object): Elasticsearch client configuration for source. Default: `{ node: 'http://localhost:9200' }`. Ignored if `sourceClient` is provided.
- **`targetClientConfig`** (object): Elasticsearch client configuration for target. If not provided, uses `sourceClientConfig`. Ignored if `targetClient` is provided.
- **`sourceClientVersion`** (8 | 9): Force specific ES client version for source. Auto-detected if not specified.
- **`targetClientVersion`** (8 | 9): Force specific ES client version for target. Auto-detected if not specified.

#### Index Configuration

- **`mappings`** (object): Elasticsearch document mappings for target index. If reindexing and not provided, mappings are copied from source index.
- **`mappingsOverride`** (boolean): When reindexing, apply `mappings` on top of source index mappings. Default: `false`.
- **`deleteIndex`** (boolean): Delete target index if it exists before starting. Default: `false`.
- **`indexMappingTotalFieldsLimit`** (number): Field limit for target index (`index.mapping.total_fields.limit` setting).
- **`pipeline`** (string): Elasticsearch ingest pipeline name to use during indexing.

#### Performance Options

- **`bufferSize`** (number): Buffer size threshold in KBytes for bulk indexing. Default: `5120` (5 MB).
- **`searchSize`** (number): Number of documents to fetch per search request when reindexing. Default: `100`.
- **`populatedFields`** (boolean): Detect which fields are actually populated in documents. Useful for optimizing indices with many mapped but unused fields. Default: `false`.

#### Processing Options

- **`transform`** (function): Callback to transform documents. Signature: `(doc, context?) => doc | doc[] | null | undefined`.
  - Return transformed document
  - Return array of documents to split one source into multiple targets
  - Return `null`/`undefined` to skip document
- **`query`** (object): Elasticsearch [DSL query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html) to filter source documents.
- **`splitRegex`** (RegExp): Line split regex for file/stream sources. Default: `/\n/`.
- **`skipHeader`** (boolean): Skip first line of source file (e.g., CSV header). Default: `false`.
- **`verbose`** (boolean): Enable logging and progress bars. Default: `true`.

### Return Value

The `transformer()` function returns a Promise that resolves to an object with:

- **`events`** (EventEmitter): Event emitter for monitoring progress.
  - `'queued'`: Document added to queue
  - `'indexed'`: Document successfully indexed
  - `'complete'`: All documents processed
  - `'error'`: Error occurred

```javascript
const result = await transformer({ /* options */ });

result.events.on('complete', () => {
  console.log('Ingestion complete!');
});

result.events.on('error', (err) => {
  console.error('Error:', err);
});
```

### TypeScript Support

Full TypeScript definitions are included. Import types for type-safe configuration:

```typescript
import transformer, { TransformerOptions } from 'node-es-transformer';

const options: TransformerOptions = {
  fileName: 'data.json',
  targetIndexName: 'my-index'
};
```

See [examples/typescript-example.ts](examples/typescript-example.ts) for more examples.

### Error Handling

Always handle errors when using the library:

```javascript
transformer({ /* options */ })
  .then(() => console.log('Success'))
  .catch(err => console.error('Error:', err));

// Or with async/await
try {
  await transformer({ /* options */ });
  console.log('Success');
} catch (err) {
  console.error('Error:', err);
}
```

### More Examples

See the [examples/](examples/) directory for practical code samples covering:

- Basic file ingestion
- Reindexing with transformations
- Cross-version migration (ES 8.x → 9.x)
- Document splitting
- Wildcard file processing
- Stream-based ingestion

## Contributing

Contributions are welcome! Before starting work on a PR, please open an issue to discuss your proposed changes.

- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines and PR process
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development setup, testing, and release process
- [SECURITY.md](SECURITY.md) - Security policy and vulnerability reporting

## License

[Apache 2.0](LICENSE).
