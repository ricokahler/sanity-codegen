import { Command, flags } from '@oclif/command';
import * as Parser from '@oclif/parser';
import { stripIndents } from 'common-tags';
import path from 'path';
import fs from 'fs';
import { generateTypes } from '@sanity-codegen/core';
import { schemaExtractor } from '@sanity-codegen/extractor';
import { getConfig } from '../get-config';
import { createAnimatedLogger } from '../create-animated-logger';
import { simpleLogger } from '../simple-logger';
import { getSanityConfigPath } from '../get-sanity-config-path';

export default class GroqCodegen extends Command {
  logger =
    process.env.CI === 'true' || process.env.NODE_ENV === 'test'
      ? simpleLogger
      : createAnimatedLogger();

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
    sanityConfigPath: flags.string({
      name: 'sanityConfigPath',
      description: stripIndents`
        Optionally provide an exact path for the CLI to look for a sanity
        configuration file (sanity.config.[t|j]s). If not provided, the CLI will
        try to default to the current working directory.

        Any CLI flags passed with override the config options.
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
    typesOutputPath: flags.string({
      name: 'typesOutputPath',
      description: stripIndents`
        Optionally provide a destination path to the resulting sanity groq
        types. The default value is \`sanity-codegen-types.d.ts\`.
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
    const { logger } = this;
    const { args, flags } = this.parse(GroqCodegen);
    const { config, root, babelOptions } = await getConfig({ flags, logger });

    const normalizedSchema = config?.normalizedSchema
      ? config.normalizedSchema
      : await (async () => {
          const { babelOptions, config, babelrcPath, root } = await getConfig({
            flags,
            logger,
          });

          const normalizedSchema = config?.normalizedSchema
            ? config.normalizedSchema
            : await schemaExtractor({
                sanityConfigPath: await getSanityConfigPath({
                  config,
                  args,
                  root,
                  logger,
                }),
                babelrcPath: babelrcPath || undefined,
                babelOptions,
                cwd: root,
              });

          // TODO: add better logging messages
          // logger.info(`Using schemaJson at "${schemaJsonInputPath}"`);

          return normalizedSchema;
        })();

    const groqCodegenInclude =
      (args.groqCodegenInclude as string | undefined) ||
      config?.groqCodegenInclude;

    if (!groqCodegenInclude) {
      throw new Error(
        `No \`groqCodegenInclude\` pattern was provided. Please add this to your config or provide via the CLI.`,
      );
    }

    const result = await generateTypes({
      groqCodegenInclude,
      groqCodegenExclude:
        flags.groqCodegenExclude || config?.groqCodegenExclude,
      babelOptions,
      prettierResolveConfigOptions: config?.prettierResolveConfigOptions,
      prettierResolveConfigPath: config?.prettierResolveConfigPath,
      root,
      normalizedSchema,
      logger,
    });

    const typesOutputPath = path.resolve(
      root,
      flags.typesOutputPath ||
        config?.typesOutputPath ||
        'sanity-codegen-types.d.ts',
    );

    logger.verbose('Writing query types output…');
    await fs.promises.writeFile(typesOutputPath, result);
    logger.success(`Wrote query types output to: ${typesOutputPath}`);
  }
}
