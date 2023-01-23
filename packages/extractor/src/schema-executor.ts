import path from 'path';
// @ts-expect-error no types or 3rd party types
import register from '@babel/register';
// @ts-expect-error no types or 3rd party types
import babelMerge from 'babel-merge';
import { resolveConfig, Config, Workspace } from 'sanity';
import { schemaNormalizer } from '@sanity-codegen/core';
import { defaultBabelOptions } from './default-babel-options';

const jsdomDefaultHtml = `<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body></body>
</html>`;

export type ExecutorResult =
  | {
      status: 'success';
      result: Sanity.SchemaDef.Schema[];
    }
  | {
      status: 'error';
      error: any;
    };

export interface ExecutorOptions {
  /**
   * Path of the sanity config entry point
   */
  sanityConfigPath: string;
  /**
   * Optionally provide a path to a .babelrc file. This will be sent to the
   * babel options while loading the schema.
   *
   * `babelOptions` takes precedence over `babelrcPath`
   */
  babelrcPath?: string;
  /**
   * Optionally provide babel options inline. These are serialized as JSON
   * and sent over to the forked process normalizing the schema.
   *
   * `babelOptions` takes precedence over `babelrcPath`
   */
  babelOptions?: any;
  /**
   * Optionally provide a working directory. This will be passed down to
   * `@babel/register` as `cwd`
   */
  cwd?: string;
}

async function loadAndExecute() {
  const {
    sanityConfigPath,
    babelOptions: babelOptionsFromArgs,
    babelrcPath,
    cwd,
  } = await new Promise<ExecutorOptions>((resolve) => {
    process.on('message', (message: string) => {
      resolve(JSON.parse(message));
    });
  });

  const babelConfigFromBabelrcPath = (() => {
    if (!babelrcPath) return {};

    const requiredBabelrc = require(babelrcPath);
    return requiredBabelrc.default || requiredBabelrc;
  })();

  register({
    ...babelMerge(
      defaultBabelOptions,
      babelMerge(babelOptionsFromArgs || {}, babelConfigFromBabelrcPath),
    ),
    cwd,
  });

  require('jsdom-global')(jsdomDefaultHtml, {
    url: 'http://localhost:3333/',
  });

  const sanityConfig: Config =
    // this executes the schema using the previously configured babel to shim
    // out browser requirements
    require(path.resolve(sanityConfigPath)).default ||
    require(path.resolve(sanityConfigPath));

  const workspaces = await new Promise<Workspace[]>((resolve, reject) => {
    const subscription = resolveConfig(sanityConfig).subscribe({
      next: (workspaces) => {
        subscription.unsubscribe();
        resolve(workspaces);
      },
      error: reject,
    });
  });

  if (!workspaces.length) {
    throw new Error('Expected at one workspace.');
  }

  for (const workspace of workspaces) {
    if (!workspace.name) {
      throw new Error('Expected all workspaces to have a `name`');
    }
  }

  const result = workspaces.map((workspace) => {
    try {
      return schemaNormalizer({
        name: workspace.name,
        types: workspace.schema._original?.types || [],
        // this is true here to prevent serialization errors
        omitOriginalNode: true,
      });
    } catch (e) {
      const error = new Error(
        `Failed to normalize workspace \`${workspace.name}\`. ${e}`,
      );
      error.cause = e;
      throw error;
    }
  });

  if (!result.length) {
    throw new Error(`Sanity config did not have any workspaces.`);
  }

  const executorResult: ExecutorResult = {
    status: 'success',
    result,
  };

  process.send!(JSON.stringify(executorResult));
}

loadAndExecute().catch((e) => {
  const executorResult: ExecutorResult = {
    status: 'error',
    error: JSON.stringify({ message: e?.message, stack: e?.stack }, null, 2),
  };

  process.send!(JSON.stringify(executorResult));
  process.exit(1);
});
