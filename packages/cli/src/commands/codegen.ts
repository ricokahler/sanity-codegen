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
import { registerDotEnv } from '../register-dot-env';

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
    output: flags.string({
      name: 'output',
      description: stripIndents`
        Optionally provide a destination path to the resulting sanity groq
        types. The default value is \`sanity-codegen.d.ts\`.
      `,
    }),
    include: flags.string({
      name: 'include',
      description: stripIndents`
        Specify a glob or a list of globs to specify which source files you want
        to include from type generation. Powered by globby.
      `,
    }),
    exclude: flags.string({
      name: 'exclude',
      description: stripIndents`
        Specify a glob or a list of globs to specify which source files you want
        to exclude from type generation. Powered by globby.
      `,
    }),
    ignoreSchemas: flags.string({
      name: 'ignoreSchemas',
      description: stripIndents`
        A common separated list that tells the codegen to ignores workspace
        schemas and exclude them from codegen. Useful if you have a workspace
        that mirrors another one in schema (e.g. staging env).
      `,
    }),
  };

  static args: Parser.args.IArg[] = [
    {
      name: 'include',
      description: stripIndents`
        Provide a glob to match source files you wish to parse for GROQ queries.
      `,
    },
  ];

  async run() {
    const { logger } = this;
    logger.verbose('Starting codegen…');

    const { args, flags } = this.parse(GroqCodegen);
    const { config, root, babelOptions } = await getConfig({ flags, logger });

    registerDotEnv(
      process.env.NODE_ENV === 'production' ? 'production' : 'development',
      root,
    );

    let normalizedSchemas;

    if (config?.normalizedSchemas) {
      normalizedSchemas = config.normalizedSchemas;
    } else {
      const { babelOptions, config, babelrcPath, root } = await getConfig({
        flags,
        logger,
      });

      const sanityConfigPath = await getSanityConfigPath({
        config,
        args,
        root,
        logger,
      });

      logger.verbose(
        `Extracting schema from sanity config (this may take some time)…`,
      );

      normalizedSchemas = await schemaExtractor({
        sanityConfigPath,
        babelrcPath: babelrcPath || undefined,
        babelOptions,
        cwd: root,
      });

      logger.success(`Extracted schema.`);
    }

    const include = flags.include ||
      config?.include || ['./src/**/*.{js,ts,tsx}'];

    const exclude = flags.exclude || config?.exclude || ['**/node_modules'];

    const ignoreSchemasFromFlags = flags.ignoreSchemas
      ?.split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    const ignoreSchemas = ignoreSchemasFromFlags || config?.ignoreSchemas;

    const result = await generateTypes({
      include,
      exclude,
      babelOptions,
      prettierResolveConfigOptions: config?.prettierResolveConfigOptions,
      prettierResolveConfigPath: config?.prettierResolveConfigPath,
      root,
      normalizedSchemas,
      logger,
      ignoreSchemas,
    });

    const output = path.resolve(
      root,
      flags.output || config?.output || 'sanity-codegen.d.ts',
    );

    logger.verbose('Writing query types output…');
    await fs.promises.writeFile(output, result);
    logger.success(`Wrote types to: ${path.relative(root, output)}`);
  }
}
