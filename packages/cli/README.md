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
  // schemaPath: './path/to/your/schema',
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
   * Mutually exclusive with \`babelOptions\`.
   */
  // babelrcPath: './.babelrc',
  /**
   * Optionally provide babel options inline. This will be passed into the babel
   * options of the schema executor.
   *
   * Note: these options get serialized to JSON so if you need to pass any
   * non-serializable babel options, you must use `babelrcPath` (can be
   * `.babelrc.js`).
   */
  // babelOptions: {/* ... */},
  /**
   * Optionally provide a working directory. All of the sanity schema files must
   * be inside the current working directory. If not, you may get errors like
   * "Cannot use import statement outside a module".
   *
   * Defaults to `process.cwd()`
   */
  // cwd: process.cwd(),
};

export default config;
```

<!-- toc -->
* [@sanity-codegen/cli](#sanity-codegencli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @sanity-codegen/cli
$ sanity-codegen COMMAND
running command...
$ sanity-codegen (-v|--version|version)
@sanity-codegen/cli/1.0.0-alpha.0 darwin-x64 node-v14.15.3
$ sanity-codegen --help [COMMAND]
USAGE
  $ sanity-codegen COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`sanity-codegen groq-codegen FILENAMES`](#sanity-codegen-groq-codegen-filenames)
* [`sanity-codegen help [COMMAND]`](#sanity-codegen-help-command)
* [`sanity-codegen schema-codegen [SCHEMAPATH]`](#sanity-codegen-schema-codegen-schemapath)

## `sanity-codegen groq-codegen FILENAMES`

parses source code files for GROQ queries and outputs TypeScript types from them

```
USAGE
  $ sanity-codegen groq-codegen FILENAMES

ARGUMENTS
  FILENAMES  Provide a glob to match source files you wish to parse for GROQ queries.

OPTIONS
  -h, --help
      show CLI help

  --configPath=configPath
      Optionally provide an exact path for the CLI to look for a
      sanity-codegen configuration file. If not provided, the CLI will walk up
      the file system checking for `sanity-codegen.config.js` or
      `sanity-codegen.config.ts`.

      Any CLI flags passed with override the config options.

  --cwd=cwd
      Optionally provide a working directory. The working directory is used
      as a root when resolving relative blobs.

  --queryTypesOutputPath=queryTypesOutputPath
      Optionally provide a destination path to the resulting sanity groq
      types. The default value is `query-types.d.ts`.

  --schemaJsonInputPath=schemaJsonInputPath
      Optionally provide an input `schema-def.json` file to be used for GROQ
      codegen. This is the `schemaJsonOutputPath` by default.
```

_See code: [lib/commands/groq-codegen.js](https://github.com/ricokahler/sanity-codegen/blob/v1.0.0-alpha.0/lib/commands/groq-codegen.js)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

## `sanity-codegen schema-codegen [SCHEMAPATH]`

loads a sanity schema and generates TypeScript types from it

```
USAGE
  $ sanity-codegen schema-codegen [SCHEMAPATH]

ARGUMENTS
  SCHEMAPATH  Optionally provide the path to your sanity schema entry point. If not
              provided, the CLI will try to get this value from your sanity.json file.

OPTIONS
  -h, --help
      show CLI help

  --babelOptions=babelOptions
      Optionally provide babel options inline in a JSON blob. This will be
      passed into the babel options of the schema executor.

      `babelOptions` takes precedence over `babelrcPath`

  --babelrcPath=babelrcPath
      Optionally provide a path to a .babelrc file. This will be passed into
      the babel options of the schema executor.

      `babelOptions` takes precedence over `babelrcPath`

  --configPath=configPath
      Optionally provide an exact path for the CLI to look for a
      sanity-codegen configuration file. If not provided, the CLI will walk up
      the file system checking for `sanity-codegen.config.js` or
      `sanity-codegen.config.ts`.

      Any CLI flags passed with override the config options.

  --cwd=cwd
      Optionally provide a working directory. All of the sanity schema files
      must be inside the current working directory. If not, you may get errors
      like "Cannot use import statement outside a module".

  --schemaJsonOutputPath=schemaJsonOutputPath
      Optionally provide a destination path to the resulting sanity schema
      JSON. The default value is ./schema-def.json.

  --schemaTypesOutputPath=schemaTypesOutputPath
      Optionally provide a destination path to the resulting sanity schema
      types. The default value is ./schema-types.d.ts.
```

_See code: [lib/commands/schema-codegen.js](https://github.com/ricokahler/sanity-codegen/blob/v1.0.0-alpha.0/lib/commands/schema-codegen.js)_
<!-- commandsstop -->
