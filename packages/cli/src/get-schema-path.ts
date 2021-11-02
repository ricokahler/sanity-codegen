import path from 'path';
import { CLIError } from '@oclif/errors';
import { fileWalker } from './file-walker';
import { SanityCodegenConfig } from './types';

interface GetSchemaPathOptions {
  config: SanityCodegenConfig | null;
  args: { schemaPath?: string };
  root: string;
  logger: Sanity.Codegen.Logger;
}

export async function getSchemaPath({
  config,
  args,
  root,
  logger,
}: GetSchemaPathOptions) {
  if (args.schemaPath) {
    try {
      const resolvedSchemaPath = require.resolve(
        path.resolve(process.cwd(), args.schemaPath),
      );

      logger.info(`Using schema at: ${resolvedSchemaPath}`);

      return resolvedSchemaPath;
    } catch {
      throw new CLIError(
        `Could not resolve \`schemaPath\` ${args.schemaPath} provided via CLI args.`,
      );
    }
  }

  if (config?.schemaPath) {
    try {
      const resolvedSchemaPath = require.resolve(
        path.resolve(process.cwd(), config.schemaPath),
      );

      logger.info(`Using schema at: ${resolvedSchemaPath}`);

      return resolvedSchemaPath;
    } catch {
      throw new CLIError(
        `Could not resolve \`schemaPath\` "${config.schemaPath}" provided via the config.`,
      );
    }
  }

  const sanityJsonPath = await fileWalker({
    filenameIfNotFound: 'sanity.json',
    startingPoint: root,
  });

  logger.info(`Found sanity.json at: ${sanityJsonPath}`);

  if (!sanityJsonPath) {
    throw new CLIError(
      `Failed to find schemaPath. No schemaPath was provided through CLI args, ` +
        `configs, and no sanity.json was found.`,
    );
  }

  try {
    const sanityJson: unknown = require(sanityJsonPath);

    if (typeof sanityJson !== 'object' || !sanityJson) {
      throw new CLIError(
        `Expected type of sanity.json to be an object but found "${
          !sanityJson ? 'null' : typeof sanityJson
        }" instead.`,
      );
    }

    // no parts in sanity.json
    if (!('parts' in sanityJson)) {
      throw new CLIError(`sanity.json did not include a \`parts\` array.`);
    }

    const parts = (sanityJson as any).parts;

    // parts is not an array
    if (!Array.isArray(parts)) {
      throw new CLIError(
        `Expected \`parts\` in sanity.json to be an Array but found "${typeof parts}" instead.`,
      );
    }

    // parts doesn't contain `part:@sanity/base/schema`
    const schemaPart = parts.find(
      (part) => part.name === 'part:@sanity/base/schema',
    );
    if (!schemaPart) {
      throw new CLIError(
        `Could not find schema part \`part:@sanity/base/schema\` in sanity.json.`,
      );
    }

    const resolvedSchemaPath = require.resolve(
      path.resolve(path.dirname(sanityJsonPath), schemaPart.path),
    );

    logger.info(`Using schema at ${resolvedSchemaPath} found in sanity.json`);

    return resolvedSchemaPath;
  } catch (e) {
    throw new CLIError(
      'Failed to get schema path from `sanity.json`. ' +
        'Please fix your sanity.json or provide the schemaPath via CLI args or the config. Error: ' +
        e.message,
    );
  }
}
