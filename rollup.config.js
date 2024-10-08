import buble from 'rollup-plugin-buble';
import pkg from './package.json';

export default [
  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // the `targets` option which can specify `dest` and `format`)
  {
    input: 'src/main.js',
    external: ['ms'],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
    plugins: [
      buble({
        exclude: ['node_modules/**'],
        transforms: { asyncAwait: false, forOf: false, generator: false },
        objectAssign: 'Object.assign',
      }),
    ],
  },
];
