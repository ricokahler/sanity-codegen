import path from 'path';
import fs from 'fs';
// @ts-expect-error no types for this
import babelMerge from 'babel-merge';
// @ts-expect-error no types for this
import register, { revert } from '@babel/register';
import { CLIError } from '@oclif/errors';
import { defaultBabelOptions } from '@sanity-codegen/extractor';
import { fileWalker } from './file-walker';
import { SanityCodegenConfig } from './types';

const requireDefaultExport = (modulePath: string) => {
  const module = require(modulePath);
  return module.default || module;
};

interface GetConfigOptions {
  flags: {
    configPath?: string;
    babelOptions?: string;
    babelrcPath?: string;
  };
  logger: Sanity.Codegen.Logger;
}

export async function getConfig({ flags, logger }: GetConfigOptions) {
  try {
    const configFilename = await fileWalker({
      startingPoint: flags.configPath || process.cwd(),
      filenameIfNotFound: 'sanity-codegen.config',
    });
    const configDirname = configFilename && path.dirname(configFilename);

    if (configFilename) {
      logger.info(
        `Using sanity-codegen config found at: ${path.relative(
          process.cwd(),
          configFilename,
        )}`,
      );
    }

    register(defaultBabelOptions);

    const configFirstPass: SanityCodegenConfig | null =
      configFilename && requireDefaultExport(configFilename);

    const root =
      configDirname && configFirstPass
        ? path.resolve(configDirname, configFirstPass.root || '')
        : process.cwd();

    const babelOptionsLiteralFromFlags = flags.babelOptions
      ? (() => {
          try {
            return JSON.parse(flags.babelOptions) as Record<string, unknown>;
          } catch {
            throw new CLIError(
              'Failed to parse provided `babelOptions`. Please provide an escaped JSON string.',
            );
          }
        })()
      : null;

    const babelOptionsLiteralFromConfig = configFirstPass?.babelOptions || null;
    const unresolvedBabelrcPath =
      flags.babelrcPath || configFirstPass?.babelrcPath;
    const babelrcPath = unresolvedBabelrcPath
      ? path.resolve(root, unresolvedBabelrcPath)
      : null;

    if (babelrcPath && !fs.existsSync(babelrcPath)) {
      throw new CLIError(
        `Could not find babelrc from provided babelrcPath: ${babelrcPath}`,
      );
    }

    // TODO(docs): if no babelrc is found then we don't go looking for one
    const babelOptionsFromBabelrc = (() => {
      if (!babelrcPath) return null;

      const resolvedBabelrcPath = path.resolve(root || '', babelrcPath);

      try {
        return requireDefaultExport(resolvedBabelrcPath);
      } catch {
        throw new CLIError(
          `Failed to load babelrc at path: ${resolvedBabelrcPath} ` +
            `Ensure that this path is valid or remove the \`babelrcPath\` option.`,
        );
      }
    })();

    if (babelOptionsFromBabelrc && babelrcPath) {
      logger.info(
        `Using babelrc config found at: ${path.relative(root, babelrcPath)}`,
      );
    }

    const babelOptions: Record<string, unknown> = babelMerge(
      defaultBabelOptions,
      babelMerge(
        babelOptionsLiteralFromFlags || babelOptionsLiteralFromConfig || {},
        babelOptionsFromBabelrc || {},
      ),
    );

    revert();

    register(babelOptions);

    const config: SanityCodegenConfig | null = configFilename
      ? requireDefaultExport(configFilename)
      : null;

    return { config, babelrcPath, babelOptions, root };
  } finally {
    revert();
  }
}
