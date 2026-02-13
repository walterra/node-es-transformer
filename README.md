[![npm version](https://img.shields.io/npm/v/node-es-transformer.svg)](https://www.npmjs.com/package/node-es-transformer)
[![npm downloads](https://img.shields.io/npm/dt/node-es-transformer.svg)](https://www.npmjs.com/package/node-es-transformer)
[![license](https://img.shields.io/npm/l/node-es-transformer.svg)](https://github.com/walterra/node-es-transformer/blob/main/LICENSE)
[![Node.js version](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org/)
[![CI](https://github.com/walterra/node-es-transformer/actions/workflows/ci.yml/badge.svg)](https://github.com/walterra/node-es-transformer/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-definitions-blue.svg)](https://github.com/walterra/node-es-transformer/blob/main/index.d.ts)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.x%20%7C%209.x-005571.svg)](https://www.elastic.co/elasticsearch/)

# node-es-transformer

Stream-based library for ingesting and transforming large data files (CSV/JSON) into Elasticsearch indices.

## Quick Start

```bash
npm install node-es-transformer
```

```javascript
const transformer = require('node-es-transformer');

// Ingest a large JSON file
await transformer({
  fileName: 'data.json',
  targetIndexName: 'my-index',
  mappings: {
    properties: {
      '@timestamp': { type: 'date' },
      'message': { type: 'text' }
    }
  }
});
```

See [Usage](#usage) for more examples.

## Why Use This?

If you need to ingest large CSV/JSON files (GigaBytes) into Elasticsearch without running out of memory, this is the tool for you. Other solutions often run out of JS heap, hammer ES with too many requests, time out, or try to do everything in a single bulk request.

**When to use this:**
- Large file ingestion (20-30 GB tested)
- Custom JavaScript transformations
- Cross-version migration (ES 8.x → 9.x)
- Developer-friendly Node.js workflow

**When to use alternatives:**
- [Logstash](https://www.elastic.co/products/logstash) - Enterprise ingestion pipelines
- [Filebeat](https://www.elastic.co/products/beats/filebeat) - Log file shipping
- [Elastic Agent](https://www.elastic.co/guide/en/fleet/current/fleet-overview.html) - Modern unified agent
- [Elasticsearch Transforms](https://www.elastic.co/guide/en/elasticsearch/reference/current/transforms.html) - Built-in data transformation

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Version Compatibility](#version-compatibility)
- [Usage](#usage)
  - [Read from a file](#read-from-a-file)
  - [Read from another index](#read-from-another-index)
  - [Reindex from ES 8.x to 9.x](#reindex-from-elasticsearch-8x-to-9x)
- [API Reference](#api-reference)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Streaming and buffering**: Files are read using streams and Elasticsearch ingestion uses buffered bulk indexing. Handles very large files (20-30 GB tested) without running out of memory.
- **High throughput**: Up to 20k documents/second on a single machine (2.9 GHz Intel Core i7, 16GB RAM, SSD), depending on document size. See [PERFORMANCE.md](PERFORMANCE.md) for benchmarks and tuning guidance.
- **Wildcard support**: Ingest multiple files matching a pattern (e.g., `logs/*.json`).
- **Flexible sources**: Read from files, Elasticsearch indices, or Node.js streams.
- **Reindexing with transforms**: Fetch documents from existing indices and transform them using JavaScript.
- **Document splitting**: Transform one source document into multiple target documents (e.g., tweets → hashtags).
- **Cross-version support**: Seamlessly reindex between Elasticsearch 8.x and 9.x.

## Version Compatibility

| node-es-transformer     | Elasticsearch Client | Elasticsearch Server | Node.js |
| ----------------------- | -------------------- | -------------------- | ------- |
| 1.0.0-beta8+            | 8.x and 9.x          | 8.x and 9.x          | 22+     |
| 1.0.0-beta7             | 9.x only             | 9.x only             | 22+     |
| 1.0.0-beta6 and earlier | 8.x                  | 8.x                  | 22+     |

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
    auth: { apiKey: 'your-es8-api-key' },
  },
  targetClientConfig: {
    node: 'https://es9-cluster.example.com:9200',
    auth: { apiKey: 'your-es9-api-key' },
  },
  sourceIndexName: 'my-source-index',
  targetIndexName: 'my-target-index',
  transform(doc) {
    // Optional transformation during reindexing
    return doc;
  },
});

// Explicit version specification (if auto-detection fails)
transformer({
  sourceClientConfig: {
    /* ... */
  },
  targetClientConfig: {
    /* ... */
  },
  sourceClientVersion: 8, // Force ES 8.x client
  targetClientVersion: 9, // Force ES 9.x client
  sourceIndexName: 'my-source-index',
  targetIndexName: 'my-target-index',
});

// Using pre-instantiated clients (advanced)
const { Client: Client8 } = require('es8');
const { Client: Client9 } = require('es9');

const sourceClient = new Client8({
  node: 'https://es8-cluster.example.com:9200',
});
const targetClient = new Client9({
  node: 'https://es9-cluster.example.com:9200',
});

transformer({
  sourceClient,
  targetClient,
  sourceIndexName: 'my-source-index',
  targetIndexName: 'my-target-index',
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
const result = await transformer({
  /* options */
});

result.events.on('complete', () => {
  console.log('Ingestion complete!');
});

result.events.on('error', err => {
  console.error('Error:', err);
});
```

### TypeScript Support

Full TypeScript definitions are included. Import types for type-safe configuration:

```typescript
import transformer, { TransformerOptions } from 'node-es-transformer';

const options: TransformerOptions = {
  fileName: 'data.json',
  targetIndexName: 'my-index',
};
```

See [examples/typescript-example.ts](examples/typescript-example.ts) for more examples.

## Documentation

- **[README.md](README.md)** - Getting started and API reference (you are here)
- **[examples/](examples/)** - Practical code samples for common use cases
- **[VERSIONING.md](VERSIONING.md)** - API stability guarantees and versioning policy
- **[PERFORMANCE.md](PERFORMANCE.md)** - Benchmarks, tuning, and optimization guide
- **[TESTING.md](TESTING.md)** - Test coverage, approach, and how to run tests
- **[DEPENDENCIES.md](DEPENDENCIES.md)** - Dependency audit and update tracking
- **[MIGRATION.md](MIGRATION.md)** - Upgrading from beta to v1.0.0
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute (open an issue first!)
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development setup and testing
- **[RELEASE.md](RELEASE.md)** - Complete release process and troubleshooting
- **[SECURITY.md](SECURITY.md)** - Security policy and vulnerability reporting

### Error Handling

Always handle errors when using the library:

```javascript
transformer({
  /* options */
})
  .then(() => console.log('Success'))
  .catch(err => console.error('Error:', err));

// Or with async/await
try {
  await transformer({
    /* options */
  });
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

## Support

This is a single-person best-effort project. While I aim to address issues and maintain the library, response times may vary. See [VERSIONING.md](VERSIONING.md) for details on API stability and support expectations.

**Getting help:**
- Check the [documentation](#documentation) first
- Review [examples/](examples/) for practical code samples
- Search [existing issues](https://github.com/walterra/node-es-transformer/issues)
- Open a new issue with details (version, steps to reproduce, expected vs actual behavior)

## License

[Apache 2.0](LICENSE)
