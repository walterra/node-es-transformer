import { babel } from '@rollup/plugin-babel';
import pkg from './package.json' with { "type": "json" };

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
      { file: pkg.main, format: 'cjs', sourcemap: true }, // CommonJS
      { file: pkg.module, format: 'es', sourcemap: true }, // ES Module
    ],
    plugins: [
      babel({
        babelHelpers: 'bundled', // Required for Rollup compatibility
        exclude: 'node_modules/**', // Transpile only source files
      }),
    ],
  },
];
