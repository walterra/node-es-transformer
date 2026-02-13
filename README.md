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

## Getting started

In your node-js project, add `node-es-transformer` as a dependency (`yarn add node-es-transformer` or `npm install node-es-transformer`).

Use the library in your code like:

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

### Options

- `deleteIndex`: Setting to automatically delete an existing index, default is `false`.
- `sourceClientConfig`/`targetClientConfig`: Optional Elasticsearch client options, defaults to `{ node: 'http://localhost:9200' }`.
- `bufferSize`: The threshold to flush bulk index request in KBytes, defaults to `5120`.
- `searchSize`: The amount of documents to be fetched with each search request when reindexing from another source index.
- `fileName`: Source filename to ingest, supports wildcards. If this is set, `sourceIndexName` and `stream` are not allowed.
- `stream`: Source nodejs stream to ingest. If this is set, `sourceIndexName` and `fileName` are not allowed.
- `splitRegex`: Custom line split regex, defaults to `/\n/`.
- `sourceIndexName`: The source Elasticsearch index to reindex from. If this is set, `fileName` and `stream` are not allowed.
- `targetIndexName`: The target Elasticsearch index where documents will be indexed.
- `mappings`: Optional Elasticsearch document mappings. If not set and you're reindexing from another index, the mappings from the existing index will be used.
- `mappingsOverride`: If you're reindexing and this is set to `true`, `mappings` will be applied on top of the source index's mappings. Defaults to `false`.
- `indexMappingTotalFieldsLimit`: Optional field limit for the target index to be created that will be passed on as the `index.mapping.total_fields.limit` setting.
- `populatedFields`: If `true`, fetches a set of random documents to identify which fields are actually used by documents. Can be useful for indices with lots of field mappings to increase query/reindex performance. Defaults to `false`.
- `query`: Optional Elasticsearch [DSL query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html) to filter documents from the source index.
- `skipHeader`: If true, skips the first line of the source file. Defaults to `false`.
- `transform(line)`: A callback function which allows the transformation of a source line into one or several documents.
- `verbose`: Logging verbosity, defaults to `true`

## Development

Clone this repository and install its dependencies:

```bash
git clone https://github.com/walterra/node-es-transformer
cd node-es-transformer
yarn
```

`yarn build` builds the library to `dist`, generating two files:

- `dist/node-es-transformer.cjs.js`
  A CommonJS bundle, suitable for use in Node.js, that `require`s the external dependency. This corresponds to the `"main"` field in package.json
- `dist/node-es-transformer.esm.js`
  an ES module bundle, suitable for use in other people's libraries and applications, that `import`s the external dependency. This corresponds to the `"module"` field in package.json

`yarn dev` builds the library, then keeps rebuilding it whenever the source files change using [rollup-watch](https://github.com/rollup/rollup-watch).

`yarn test` runs the tests using [Testcontainers](https://node.testcontainers.org/) to automatically manage an Elasticsearch container. **No manual Docker setup is required** - the container starts automatically before tests and stops after completion.

```bash
yarn test
```

**Requirements:**
- Docker daemon running
- Node.js 22+
- At least 2GB available memory for the Elasticsearch container

The first test run will download the Elasticsearch Docker image (Elasticsearch 8.17.0, one-time setup). Subsequent runs reuse the image.

**Note:** If you prefer to run tests against a manually managed Elasticsearch instance, you can start one on `http://localhost:9200` and the tests will use it as a fallback.

To commit, use `cz`. For releases, this project uses [Changesets](https://github.com/changesets/changesets) - see the Release Process section in AGENTS.md for details.

## License

[Apache 2.0](LICENSE).
