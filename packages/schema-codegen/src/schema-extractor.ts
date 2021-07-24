import { fork } from 'child_process';
import path from 'path';
import type { ExecutorResult, ExecutorOptions } from './schema-executor';

/**
 * Takes in a Sanity Schema file path and returns a validated and normalized
 * schema.
 *
 * Spins up a forked process where a new babel config is loaded to mimic a
 * Sanity Studio browser environment.
 */
export async function schemaExtractor(params: ExecutorOptions) {
  const childProcess = fork(path.resolve(__dirname, './schema-executor'));

  const root = params.cwd || process.cwd();

  const normalizedOptions: ExecutorOptions = {
    schemaPath: path.resolve(root, params.schemaPath),
    babelrcPath: params.babelrcPath
      ? path.resolve(root, params.babelrcPath)
      : undefined,
    // TODO: consider throwing if babel options is not JSON serializable
    babelOptions: params.babelOptions,
    cwd: root,
  };

  childProcess.send(JSON.stringify(normalizedOptions));

  const message = await new Promise<string>((resolve) => {
    childProcess.on('message', resolve);
  });

  childProcess.kill();

  const executorResult: ExecutorResult = JSON.parse(message);

  if (executorResult.status === 'error') {
    // TODO: ensure this serializes correctly and errors bubble up correctly
    throw new Error(executorResult.error);
  }

  return executorResult.result;
}
