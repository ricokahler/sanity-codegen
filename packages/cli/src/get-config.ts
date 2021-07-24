import path from 'path';
import fs from 'fs';
// @ts-expect-error no types for this
import babelMerge from 'babel-merge';
// @ts-expect-error no types for this
import register, { revert } from '@babel/register';
import { fileWalker } from './file-walker';
import { defaultBabelOptions } from '@sanity-codegen/schema-codegen';
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
}

export async function getConfig({ flags }: GetConfigOptions) {
  register(defaultBabelOptions);

  const configFilename = await fileWalker({
    startingPoint: flags.configPath || process.cwd(),
    filenameIfNotFound: 'sanity-codegen.config',
  });
  const configDirname = configFilename && path.dirname(configFilename);

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
          throw new Error(
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
    throw new Error(
      `Could not find babelrc from provided babelrcPath "${babelrcPath}"`,
    );
  }

  // TODO(docs): if no babelrc is found then we don't go looking for one
  const babelOptionsFromBabelrc = (() => {
    if (!babelrcPath) return null;

    try {
      return requireDefaultExport(path.resolve(root || '', babelrcPath));
    } catch {
      return null;
    }
  })();

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

  revert();

  const schemaPath = await (async () => {})();

  return { config, babelrcPath, babelOptions, root, schemaPath };
}
