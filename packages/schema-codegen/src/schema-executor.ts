import path from 'path';
// @ts-expect-error no types or 3rd party types
import register from '@babel/register';
// @ts-expect-error no types or 3rd party types
import babelMerge from 'babel-merge';
import { resolveConfig, Config, Workspace } from 'sanity';
import { schemaNormalizer } from './schema-normalizer';
import { defaultBabelOptions } from './default-babel-options';

export type ExecutorResult =
  | {
      status: 'success';
      result: Sanity.SchemaDef.Schema;
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

  if (workspaces.length > 1) {
    throw new Error(
      'Found more than one workspace. ' +
        'Multiple workspaces are not supported at this time.',
    );
  }

  const [workspace] = workspaces;

  const result = schemaNormalizer(workspace.schema._original?.types || []);

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
