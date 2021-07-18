import { Command, flags } from '@oclif/command';
import * as Parser from '@oclif/parser';
import { stripIndents } from 'common-tags';
// @ts-expect-error no types for this
import register from '@babel/register';
import path from 'path';
import fs from 'fs';
import { generateGroqTypes } from '@sanity-codegen/groq-codegen';
import { defaultBabelOptions } from '@sanity-codegen/schema-codegen';
import { findFile } from '../find-file';
import { SanityCodegenConfig } from '../types';

export default class GroqCodegen extends Command {
  static description = stripIndents`
    parses source code files for GROQ queries and outputs TypeScript types from them
  `;

  static flags = {
    help: flags.help({ char: 'h' }),
    cwd: flags.string({
      name: 'cwd',
      description: stripIndents`
        Optionally provide a working directory. The working directory is used
        as a root when resolving relative blobs.
      `,
    }),
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
    groqTypesOutputPath: flags.string({
      name: 'groqTypesOutputPath',
      description: stripIndents`
        Optionally provide a destination path to the resulting sanity groq
        types. The default value is \`groq-types.d.ts\`.
      `,
    }),
    schemaJsonInputPath: flags.string({
      name: 'schemaJsonInputPath',
      description: stripIndents`
        Optionally provide an input \`schema-def.json\` file to be used for GROQ
        codegen. This is the \`schemaJsonOutputPath\` by default.
      `,
    }),
  };

  static args: Parser.args.IArg[] = [
    {
      name: 'filenames',
      description: stripIndents`
        Provide a glob to match source files you wish to parse for GROQ queries.
      `,
      required: true,
    },
  ];

  async run() {
    const { args, flags } = this.parse(GroqCodegen);

    register(defaultBabelOptions);

    const config: SanityCodegenConfig | null = await (async () => {
      const configPath = await findFile(
        'sanity-codegen.config',
        flags.configPath,
      );

      const configValue = configPath && require(configPath);

      return configValue?.default || configValue;
    })();

    const schemaJsonInputPath = path.resolve(
      process.cwd(),
      flags.schemaJsonInputPath ||
        config?.schemaJsonInputPath ||
        config?.schemaJsonOutputPath ||
        'schema-def.json',
    );

    if (!fs.existsSync(schemaJsonInputPath)) {
      throw new Error(
        `Could not find \`schemaJsonInputPath\`. You may need to run \`npx sanity-codegen schema-codegen first.\``,
      );
    }

    const schemaBuffer = await fs.promises.readFile(
      path.resolve(process.cwd(), schemaJsonInputPath),
    );
    const schema = JSON.parse(schemaBuffer.toString());

    const result = await generateGroqTypes({
      filenames: args.filenames,
      cwd: path.resolve(flags.cwd || config?.cwd || process.cwd()),
      schema,
    });

    await fs.promises.writeFile(
      path.resolve(process.cwd(), flags.groqTypesOutputPath || 'queries.d.ts'),
      result,
    );
  }
}
