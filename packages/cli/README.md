@sanity-codegen/cli
====================

CLI for Sanity CodeGen

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@sanity-codegen/cli.svg)](https://npmjs.org/package/@sanity-codegen/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@sanity-codegen/cli.svg)](https://npmjs.org/package/@sanity-codegen/cli)
[![License](https://img.shields.io/npm/l/@sanity-codegen/cli.svg)](https://github.com/ricokahler/sanity-codegen/blob/master/package.json)

<!-- toc -->
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
* [`sanity-codegen help [COMMAND]`](#sanity-codegen-help-command)
* [`sanity-codegen schema-codegen [SCHEMAPATH]`](#sanity-codegen-schema-codegen-schemapath)

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

  --outputPath=outputPath
      Optionally provide a destination path to the resulting sanity schema
      types. The default value is ./schema.d.ts.
```

_See code: [src/commands/schema-codegen.ts](https://github.com/ricokahler/sanity-codegen/blob/v1.0.0-alpha.0/src/commands/schema-codegen.ts)_
<!-- commandsstop -->
