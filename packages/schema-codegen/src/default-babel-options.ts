/**
 * These are the default options passed into babel used for loading Sanity
 * Schemas in a node context.
 *
 * If you need to customize the behavior, you can import these default options
 * and add on to them. `schemaExtractor` accepts the option `babelOptions`
 */
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
  // overrides `node_modules` ignoring
  // https://babeljs.io/docs/en/babel-register#ignores-node_modules-by-default
  ignore: [],
  plugins: [
    // used to resolve and no-op sanity's part system
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          'part:@sanity/base/schema-creator':
            '@sanity-codegen/schema-codegen/schema-creator-shim',
          'all:part:@sanity/base/schema-type':
            '@sanity-codegen/schema-codegen/schema-type-shim',
          'part:@sanity/base/schema-type':
            '@sanity-codegen/schema-codegen/schema-type-shim',
          '^part:.*': '@sanity-codegen/schema-codegen/no-op',
          '^config:.*': '@sanity-codegen/schema-codegen/no-op',
          '^all:part:.*': '@sanity-codegen/schema-codegen/no-op',
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
