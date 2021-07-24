import { SanityCodegenConfig } from '../../types';

const config: SanityCodegenConfig = {
  root: '../',
  babelOptions: {
    presets: [['@babel/preset-env', { targets: 'node 10' }]],
  },
  babelrcPath: './example-config-folder/example-babelrc.js',
};

export default config;
