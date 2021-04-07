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

  childProcess.send(
    JSON.stringify({
      schemaPath: path.resolve(process.cwd(), params.schemaPath),
      babelrcPath: params.babelrcPath
        ? path.resolve(process.cwd(), params.babelrcPath)
        : undefined,
      babelOptions: params.babelOptions,
      cwd: params.cwd || process.cwd(),
    })
  );

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
