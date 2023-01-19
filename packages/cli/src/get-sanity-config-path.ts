import path from 'path';
import { CLIError } from '@oclif/errors';
import { fileWalker } from './file-walker';
import { SanityCodegenConfig } from './types';

interface GetSanityConfigPathOptions {
  config: SanityCodegenConfig | null;
  args: { sanityConfigPath?: string };
  root: string;
  logger: Sanity.Codegen.Logger;
}

export async function getSanityConfigPath({
  config,
  args,
  root,
  logger,
}: GetSanityConfigPathOptions) {
  if (args.sanityConfigPath) {
    try {
      const resolvedSanityConfigPath = require.resolve(
        path.resolve(process.cwd(), args.sanityConfigPath),
      );

      logger.info(`Using sanity config at: ${resolvedSanityConfigPath}`);

      return resolvedSanityConfigPath;
    } catch {
      throw new CLIError(
        `Could not resolve \`sanityConfigPath\` ${args.sanityConfigPath} provided via CLI args.`,
      );
    }
  }

  if (config?.sanityConfigPath) {
    try {
      const resolvedSanityConfigPath = require.resolve(
        path.resolve(process.cwd(), config.sanityConfigPath),
      );

      logger.info(`Using sanity config at: ${resolvedSanityConfigPath}`);

      return resolvedSanityConfigPath;
    } catch {
      throw new CLIError(
        `Could not resolve \`sanityConfigPath\` "${config.sanityConfigPath}" provided via the config.`,
      );
    }
  }

  const sanityConfigPath = await fileWalker({
    filenameIfNotFound: 'sanity.config',
    startingPoint: root,
  });

  logger.info(`Found sanity config at: ${sanityConfigPath}`);

  if (!sanityConfigPath) {
    throw new CLIError(
      `Failed to find sanityConfigPath. No config path was provided through CLI args, ` +
        `configs, and no sanity.config.ts was found.`,
    );
  }

  return sanityConfigPath;
}
