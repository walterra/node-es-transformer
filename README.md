# node-es-transformer

A nodejs based library to (re)index and transform data from/to Elasticsearch.

## Getting started



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
