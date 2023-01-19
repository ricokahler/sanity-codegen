import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import lodash from 'lodash';
import fs from 'fs';

const { escapeRegExp } = lodash;

const pkg = JSON.parse(
  (await fs.promises.readFile('./package.json')).toString(),
);

const extensions = ['.js', '.ts'];

const external = [
  ...Object.keys(pkg.dependencies).map(
    (dep) => new RegExp(`^${escapeRegExp(dep)}`),
  ),
  // for the prettier parser import
  ...Object.keys(pkg.dependencies).map(
    (dep) => new RegExp(`^${escapeRegExp(dep)}\\/.*`),
  ),
];

const nodeResolve = resolve({
  extensions,
  modulesOnly: false,
  // // TODO: this should be set to false for the standalone bundle but i'm
  // // unsure what the proper way to do standalone bundles are
  // preferBuiltins: false,
});

// TODO: make this throw if a node dep is found
// const incompatibleDeps = [
//   'globby',
//   '@babel/register',
//   '@babel/generator',
//   '@babel/core',
//   'babel-merge',
//   'prettier',
//   'chalk',
// ];

export default [
  {
    input: './src/index.standalone.ts',
    output: {
      file: './dist/index.standalone.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      nodeResolve,
      babel({
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-env', { targets: 'node 10 and not IE 11' }],
          '@babel/preset-typescript',
        ],
        plugins: [
          // TODO:
          // '@babel/plugin-transform-runtime',
          [
            // for studio compat
            '@babel/plugin-proposal-object-rest-spread',
            { loose: true, useBuiltIns: true },
          ],
        ],
        babelHelpers: 'bundled',
        extensions,
      }),
    ],
    external,
  },
  {
    input: './src/index.standalone.ts',
    output: {
      file: './dist/index.standalone.cjs.js',
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [
      nodeResolve,
      babel({
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-env', { targets: 'node 10 and not IE 11' }],
          '@babel/preset-typescript',
        ],
        babelHelpers: 'bundled',
        extensions,
      }),
    ],
    external,
  },
];
