import fs from 'fs';
import path from 'path';
import { SanityCodegenConfig } from './types';
import generateTypes from './generate-types';

import register, { revert } from '@babel/register';

export const defaultBabelOptions = {
  extensions: ['.js', '.ts', '.tsx', '.mjs'],
  // these disable any babel config files in the project so we can run our
  // very specific babel config for the CLI
  babelrc: false,
  configFile: false,
  // disables the warning "Babel has de-optimized the styling of..."
  compact: true,
  presets: [
    ['@babel/preset-env', { targets: { node: true } }],
    '@babel/preset-typescript',
    '@babel/preset-react',
  ],
  plugins: [
    // used to resolve and no-op sanity's part system
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          'part:@sanity/base/schema-creator':
            'sanity-codegen/schema-creator-shim',
          'all:part:@sanity/base/schema-type':
            'sanity-codegen/schema-type-shim',
          'part:@sanity/base/schema-type': 'sanity-codegen/schema-type-shim',
          '^part:.*': 'sanity-codegen/no-op',
          '^config:.*': 'sanity-codegen/no-op',
          '^all:part:.*': 'sanity-codegen/no-op',
        },
      },
    ],
    // used to resolve css module imports that are allowed in sanity projects
    'css-modules-transform',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-numeric-separator',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
  ],
};

register(defaultBabelOptions);

async function cli() {
  // this required needs to come after register
  const resolveConfig = require('./resolve-config').default;

  const configPath = await resolveConfig();

  if (!configPath) {
    throw new Error(
      'Could not find a sanity-codegen.config.ts or sanity-codegen.config.js file.'
    );
  }

  const config: SanityCodegenConfig =
    require(configPath).default || require(configPath);

  // revert and re-register with new babel options from the config
  revert();
  register({
    ...defaultBabelOptions,
    ...config.babelOptions,
  });

  if (!config.schemaPath) {
    throw new Error(
      `Sanity Codegen config found at "${configPath}" was missing the required option "schemaPath"`
    );
  }

  if (!config.outputPath) {
    throw new Error(
      `Sanity Codegen config found at "${configPath}" was missing the required option "outputPath"`
    );
  }

  const types: any[] =
    require(path.resolve(config.schemaPath)).default ||
    require(path.resolve(config.schemaPath));

  const result = await generateTypes({ types, ...config });

  const outputPath = path.resolve(config.outputPath || './schema.ts');
  await fs.promises.writeFile(outputPath, result);

  console.info(`[SanityCodeGen]: types written out to ${outputPath})`);
}

cli().catch((e) => {
  console.error(e);
  process.exit(1);
});
