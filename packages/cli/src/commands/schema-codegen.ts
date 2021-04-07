import { Command, flags } from '@oclif/command';
import * as Parser from '@oclif/parser';
import { stripIndents } from 'common-tags';
// @ts-ignore
import register from '@babel/register';
import path from 'path';
import fs from 'fs';
import {
  schemaExtractor,
  generateTypes,
  defaultBabelOptions,
} from '@sanity-codegen/schema-codegen';
import { findFile } from '../find-file';
import { SanityCodegenConfig } from '../types';

export default class SchemaCodegen extends Command {
  static description = stripIndents`
    loads a sanity schema and generates TypeScript types from it
  `;

  static flags = {
    help: flags.help({ char: 'h' }),
    configPath: flags.string({
      name: 'configPath',
      description: stripIndents`
        Optionally provide an exact path for the CLI to look for a
        sanity-codegen configuration file. If not provided, the CLI will walk up
        the file system checking for \`sanity-codegen.config.js\` or
        \`sanity-codegen.config.ts\`.

        Any CLI flags passed with override the config options.
      `,
    }),
    babelrcPath: flags.string({
      name: 'babelrcPath',
      description: stripIndents`
        Optionally provide a path to a .babelrc file. This will be passed into
        the babel options of the schema executor.

        \`babelOptions\` takes precedence over \`babelrcPath\`
      `,
    }),
    babelOptions: flags.string({
      name: 'babelOptions',
      description: stripIndents`
        Optionally provide babel options inline in a JSON blob. This will be
        passed into the babel options of the schema executor.

        \`babelOptions\` takes precedence over \`babelrcPath\`
      `,
    }),
    cwd: flags.string({
      name: 'cwd',
      description: stripIndents`
        Optionally provide a working directory. All of the sanity schema files
        must be inside the current working directory. If not, you may get errors
        like "Cannot use import statement outside a module".
      `,
    }),
    outputPath: flags.string({
      name: 'outputPath',
      description: stripIndents`
        Optionally provide a destination path to the resulting sanity schema
        types. The default value is ./schema.d.ts.
      `,
    }),
  };

  static args: Parser.args.IArg[] = [
    {
      name: 'schemaPath',
      description: stripIndents`
        Optionally provide the path to your sanity schema entry point. If not
        provided, the CLI will try to get this value from your sanity.json file.
      `,
    },
  ];

  async run() {
    const { args, flags } = this.parse(SchemaCodegen);

    register({ ...defaultBabelOptions });

    const config: SanityCodegenConfig | null = await (async () => {
      const configPath = await findFile(
        'sanity-codegen.config',
        flags.configPath
      );

      const configValue = configPath && require(configPath);

      return configValue?.default || configValue;
    })();

    const schemaPath = await (async () => {
      if (args.schemaPath) {
        try {
          return require.resolve(path.resolve(process.cwd(), args.schemaPath));
        } catch {
          throw new Error(
            `Could not resolve \`schemaPath\` "${args.schemaPath}" provided via CLI args.`
          );
        }
      }

      if (config?.schemaPath) {
        try {
          return require.resolve(
            path.resolve(process.cwd(), config.schemaPath)
          );
        } catch {
          throw new Error(
            `Could not resolve \`schemaPath\` "${config.schemaPath}" provided via the config.`
          );
        }
      }

      const sanityJsonPath = await findFile('sanity.json');
      if (sanityJsonPath) {
        try {
          const sanityJson: unknown = require(sanityJsonPath);

          if (typeof sanityJson !== 'object' || !sanityJson) {
            throw new Error();
          }

          // no parts in sanity.json
          if (!('parts' in sanityJson)) {
            throw new Error();
          }

          const parts = (sanityJson as any).parts;

          // parts is not an array
          if (!Array.isArray(parts)) {
            throw new Error();
          }

          // parts doesn't contain `part:@sanity/base/schema`
          const schemaPart = parts.find(
            (part) => part.name === 'part:@sanity/base/schema'
          );
          if (!schemaPart) {
            throw new Error();
          }

          return require.resolve(
            path.resolve(path.dirname(sanityJsonPath), schemaPart.path)
          );
        } catch {
          throw new Error('Failed to get schema path from `sanity.json`');
        }
      }

      throw new Error('Failed to find schema path.');
    })();

    const babelrcPath = (() => {
      if (flags.babelrcPath) {
        try {
          return require.resolve(
            path.resolve(process.cwd(), flags.babelrcPath)
          );
        } catch {
          throw new Error(
            `Could not resolve \`babelrcPath\` "${args.babelrcPath}" provided via CLI args.`
          );
        }
      }

      if (config?.babelrcPath) {
        try {
          return require.resolve(
            path.resolve(process.cwd(), config.babelrcPath)
          );
        } catch {
          throw new Error(
            `Could not resolve \`babelrcPath\` "${config.babelrcPath}" provided via the config.`
          );
        }
      }
    })();

    const babelOptions = (() => {
      if (flags.babelOptions) {
        return JSON.parse(flags.babelOptions);
      }

      if (config?.babelOptions) {
        return config.babelOptions;
      }

      return undefined;
    })();

    const schema = await schemaExtractor({
      schemaPath,
      babelrcPath,
      babelOptions,
      cwd: path.resolve(flags.cwd || config?.cwd || process.cwd()),
    });

    const result = await generateTypes({
      schema,
      generateTypeName: config?.generateTypeName,
      prettierResolveConfigOptions: config?.prettierResolveConfigOptions,
      prettierResolveConfigPath: config?.prettierResolveConfigPath,
    });

    await fs.promises.writeFile(
      path.resolve(
        process.cwd(),
        flags.outputPath || config?.outputPath || 'schema.d.ts'
      ),
      result
    );
  }
}
