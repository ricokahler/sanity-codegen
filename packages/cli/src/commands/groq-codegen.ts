import { Command, flags } from '@oclif/command';
import * as Parser from '@oclif/parser';
import { stripIndents } from 'common-tags';
import path from 'path';
import fs from 'fs';
import { generateGroqTypes } from '@sanity-codegen/groq-codegen';
import { getConfig } from '../get-config';

export default class GroqCodegen extends Command {
  static description = stripIndents`
    parses source code files for GROQ queries and outputs TypeScript types from them
  `;

  static flags = {
    help: flags.help({ char: 'h' }),
    root: flags.string({
      name: 'root',
      description: stripIndents`
        Determines from where files are relative to. Defaults to where your
        sanity-codegen config was found (if any) or the current working
        directory.
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
    queryTypesOutputPath: flags.string({
      name: 'queryTypesOutputPath',
      description: stripIndents`
        Optionally provide a destination path to the resulting sanity groq
        types. The default value is \`query-types.d.ts\`.
      `,
    }),
    schemaJsonInputPath: flags.string({
      name: 'schemaJsonInputPath',
      description: stripIndents`
        Optionally provide an input \`schema-def.json\` file to be used for GROQ
        codegen. This is the \`schemaJsonOutputPath\` by default.
      `,
    }),
    groqCodegenExclude: flags.string({
      name: 'groqCodegenExclude',
      description: stripIndents`
        Specify a glob or a list of globs to specify which source files you want
        to exclude from type generation.
      `,
    }),
  };

  static args: Parser.args.IArg[] = [
    {
      name: 'groqCodegenInclude',
      description: stripIndents`
        Provide a glob to match source files you wish to parse for GROQ queries.
      `,
    },
  ];

  async run() {
    const { args, flags } = this.parse(GroqCodegen);
    const { config, root, babelOptions } = await getConfig({ flags });

    const schemaJsonInputPath = path.resolve(
      root,
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

    const schemaBuffer = await fs.promises.readFile(schemaJsonInputPath);
    const normalizedSchema = JSON.parse(schemaBuffer.toString());

    const groqCodegenInclude =
      (args.groqCodegenInclude as string | undefined) ||
      config?.groqCodegenInclude;

    if (!groqCodegenInclude) {
      throw new Error(
        `No \`groqCodegenInclude\` pattern was provided. Please add this to your config or provide via the CLI.`,
      );
    }

    const result = await generateGroqTypes({
      groqCodegenInclude,
      groqCodegenExclude:
        flags.groqCodegenExclude || config?.groqCodegenExclude,
      babelOptions,
      prettierResolveConfigOptions: config?.prettierResolveConfigOptions,
      prettierResolveConfigPath: config?.prettierResolveConfigPath,
      root,
      normalizedSchema,
    });

    await fs.promises.writeFile(
      path.resolve(
        root,
        flags.queryTypesOutputPath ||
          config?.queryTypesOutputPath ||
          'query-types.d.ts',
      ),
      result,
    );
  }
}
