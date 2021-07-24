import path from 'path';
// @ts-expect-error no types or 3rd party types
import register from '@babel/register';
// @ts-expect-error no types or 3rd party types
import babelMerge from 'babel-merge';
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
   * Path of the schema entry point
   */
  schemaPath: string;
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
    schemaPath,
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

  const types: any[] =
    // this executes the schema using the previously configured babel to shim
    // out the parts
    require(path.resolve(schemaPath)).default ||
    require(path.resolve(schemaPath));

  const result = schemaNormalizer(types);

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
