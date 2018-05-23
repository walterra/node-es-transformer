[![npm](https://img.shields.io/npm/v/node-es-transformer.svg?maxAge=2592000)](https://www.npmjs.com/package/node-es-transformer)
[![npm](https://img.shields.io/npm/l/node-es-transformer.svg?maxAge=2592000)](https://www.npmjs.com/package/node-es-transformer)
[![npm](https://img.shields.io/npm/dt/node-es-transformer.svg?maxAge=2592000)](https://www.npmjs.com/package/node-es-transformer)

# node-es-transformer

A nodejs based library to (re)index and transform data from/to Elasticsearch.

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
        'field1': {
          type: 'keyword'
        },
        'field2': {
          type: 'keyword'
        }
      }
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

`yarn build` builds the library to `dist`, generating three files:

* `dist/node-es-transformer.cjs.js`
    A CommonJS bundle, suitable for use in Node.js, that `require`s the external dependency. This corresponds to the `"main"` field in package.json
* `dist/node-es-transformer.esm.js`
    an ES module bundle, suitable for use in other people's libraries and applications, that `import`s the external dependency. This corresponds to the `"module"` field in package.json

`yarn dev` builds the library, then keeps rebuilding it whenever the source files change using [rollup-watch](https://github.com/rollup/rollup-watch).

`yarn test` builds the library, then tests it.

## License

[Apache 2.0](LICENSE).
