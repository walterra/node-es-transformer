[![npm](https://img.shields.io/npm/v/node-es-transformer.svg?maxAge=2592000)](https://www.npmjs.com/package/node-es-transformer)
[![npm](https://img.shields.io/npm/l/node-es-transformer.svg?maxAge=2592000)](https://www.npmjs.com/package/node-es-transformer)
[![npm](https://img.shields.io/npm/dt/node-es-transformer.svg?maxAge=2592000)](https://www.npmjs.com/package/node-es-transformer)

# node-es-transformer

A nodejs based library to (re)index and transform data from/to Elasticsearch.

**This is experimental code, use at your own risk. Nonetheless, I encourage you to give it a try so I can gather some feedback.**

## Features

- While I'd generally recommend using [Logstash](https://www.elastic.co/products/logstash) and [filebeat](https://www.elastic.co/products/beats/filebeat) for established use cases, this tool may be of help especially in a JavaScript based setup for customized ingestion and data transformation use cases.
- Buffering/Streaming for both reading and indexing. Files are read using streaming and Elasticsearch ingestion is done using buffered bulk indexing. This is tailored towards ingestion of large files. Successfully tested so far with JSON and CSV files in the range of 20-30 GBytes. On a single machine running both `node-es-transformer` and Elasticsearch ingestion rates up to 20k documents/second were achieved (2,9 GHz Intel Core i7, 16GByte RAM, SSD).
- Supports wildcards to ingest/transform a range of files in one go.

## Getting started

In your node-js project, add `node-es-transformer` as a dependency (`yarn add node-es-transformer` or `npm install node-es-transformer`).

Use the library in your code like:

```javascript
const { transformer } = require('node-es-transformer');

transformer({
  fileName: 'filename.json',
  indexName: 'my-index',
  typeName: 'doc',
  mappings: {
    doc: {
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

## Development

Clone this repository and install its dependencies:

```bash
git clone https://github.com/walterra/node-es-transformer
cd node-es-transformer
yarn
```

`yarn build` builds the library to `dist`, generating two files:

* `dist/node-es-transformer.cjs.js`
    A CommonJS bundle, suitable for use in Node.js, that `require`s the external dependency. This corresponds to the `"main"` field in package.json
* `dist/node-es-transformer.esm.js`
    an ES module bundle, suitable for use in other people's libraries and applications, that `import`s the external dependency. This corresponds to the `"module"` field in package.json

`yarn dev` builds the library, then keeps rebuilding it whenever the source files change using [rollup-watch](https://github.com/rollup/rollup-watch).

`yarn test` builds the library, then tests it.

## License

[Apache 2.0](LICENSE).
