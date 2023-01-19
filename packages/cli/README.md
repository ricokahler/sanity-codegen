# @sanity-codegen/cli

CLI for Sanity CodeGen

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@sanity-codegen/cli.svg)](https://npmjs.org/package/@sanity-codegen/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@sanity-codegen/cli.svg)](https://npmjs.org/package/@sanity-codegen/cli)
[![License](https://img.shields.io/npm/l/@sanity-codegen/cli.svg)](https://github.com/ricokahler/sanity-codegen/blob/master/package.json)

You may also use a config file with the name `sanity-codegen.config.ts` or `sanity-codegen.config.js`.

The CLI will walk up the file tree until it finds this file.

```ts
import { SanityCodegenConfig } from '@sanity-codegen/cli';

const config: SanityCodegenConfig = {
  /**
   * Optionally provide the path to your sanity schema entry point. If not
   * provided, the CLI will try to get this value from your `sanity.json` file.
   */
  // sanityConfigPath: './sanity.config.ts',
  /**
   * Specify a glob (powered by
   * [`globby`](https://github.com/sindresorhus/globby)), a list of globs, or a
   * function that returns a list of paths to specify the source files you want
   * to generate types from.
   *
   * If `groqCodegenInclude` is provided as a function then `groqCodegenExclude`
   * will not be used.
   */
  groqCodegenInclude: ['./src/**/*.{js,jsx,ts,tsx}'],
  /**
   * Specify a glob (powered by
   * [`globby`](https://github.com/sindresorhus/globby)) or a list of globs to
   * specify which source files you want to exclude from type generation.
   */
  groqCodegenExclude: ['**/*.test.{js,ts,tsx}', '**/node_modules'],
  /**
   * Optionally provide a destination path to the resulting sanity schema types.
   * The default value is `schema-types.d.ts`
   */
  // schemaTypesOutputPath: './schema-types.d.ts',
  /**
   * Optionally provide a destination path to the resulting sanity schema JSON.
   * The default value is `schema-def.json`
   */
  // schemaJsonOutputPath: './schema-def.json',
  /**
   * Optionally provide a destination path to the resulting sanity groq types.
   * The default value is `query-types.d.ts`.
   */
  // queryTypesOutputPath: './query-types.d.ts',
  /**
   * Optionally provide an input `schema-def.json` file to be used for GROQ
   * codegen. This is the `schemaJsonOutputPath` by default.
   */
  // schemaJsonInputPath: './schema-def.json',
  /**
   * Optionally provide a path to a .babelrc file. This will be passed into the
   * babel options of the schema executor.
   *
   * If both `babelOptions` and `babelrcPath` are provided, the results will be
   * merged with `babel-merge`
   */
  // babelrcPath: './babelrc',
  /**
   * Optionally provide babel options inline. This will be passed into the babel
   * options of the schema executor.
   *
   * Note: these options get serialized to JSON so if you need to pass any
   * non-serializable babel options, you must use `babelrcPath` (can be
   * `.babelrc.js`).
   *
   * If both `babelOptions` and `babelrcPath` are provided, the results will be
   * merged with `babel-merge`
   */
  // babelOptions: {
  //   // ...
  // },
  /**
   * Determines from where files are relative to. Defaults to where your
   * sanity-codegen config was found.
   */
  // root: process.cwd(),
  /**
   * You can directly provide a normalized instead of using a schema-def.json.
   * A normalized schema (result of the `schemaNormalizer`)
   * @see schemaNormalizer
   */
  // normalizedSchema: undefined,
  /**
   * Optionally provide a function that generates the typescript type identifer
   * from the sanity type name. Use this function to override the default and
   * prevent naming collisions.
   */
  // generateTypeName: undefined,
  /**
   * This option is fed directly to prettier `resolveConfig`
   *
   * https://prettier.io/docs/en/api.html#prettierresolveconfigfilepath--options
   */
  // prettierResolveConfigPath: undefined,
  /**
   * This options is also fed directly to prettier `resolveConfig`
   *
   * https://prettier.io/docs/en/api.html#prettierresolveconfigfilepath--options
   */
  // prettierResolveConfigOptions: undefined,
};

export default config;
```

<!-- toc -->

- [@sanity-codegen/cli](#sanity-codegencli)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @sanity-codegen/cli
$ sanity-codegen COMMAND
running command...
$ sanity-codegen (-v|--version|version)
@sanity-codegen/cli/1.0.0-alpha.27 linux-x64 node-v16.13.2
$ sanity-codegen --help [COMMAND]
USAGE
  $ sanity-codegen COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`sanity-codegen help [COMMAND]`](#sanity-codegen-help-command)

## `sanity-codegen help [COMMAND]`

display help for sanity-codegen

```
USAGE
  $ sanity-codegen help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.3.1/src/commands/help.ts)_

<!-- commandsstop -->
