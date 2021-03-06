import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';

const extensions = ['.js', '.ts'];

export default [
  {
    input: './src/index.ts',
    output: {
      file: './dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      resolve({ extensions, modulesOnly: true }),
      babel({
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-env', { targets: 'node 10 and not IE 11' }],
          '@babel/preset-typescript',
        ],
        plugins: [
          '@babel/plugin-transform-runtime',
          [
            '@babel/plugin-proposal-object-rest-spread',
            { loose: true, useBuiltIns: true },
          ],
        ],
        babelHelpers: 'runtime',
        extensions,
      }),
    ],
    external: [/^@babel\/runtime/],
  },
  {
    input: './src/index.umd.ts',
    output: {
      file: './dist/index.js',
      format: 'umd',
      sourcemap: true,
      name: 'SanityCodegen',
    },
    plugins: [
      resolve({ extensions, modulesOnly: true }),
      babel({
        babelrc: false,
        configFile: false,
        presets: ['@babel/preset-env', '@babel/preset-typescript'],
        babelHelpers: 'bundled',
        extensions,
      }),
    ],
    external: ['regenerator-runtime/runtime'],
  },
];
