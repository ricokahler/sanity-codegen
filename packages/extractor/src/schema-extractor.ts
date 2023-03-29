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
    sanityConfigPath: path.resolve(root, params.sanityConfigPath),
    babelrcPath: params.babelrcPath
      ? path.resolve(root, params.babelrcPath)
      : undefined,
    // TODO: consider throwing if babel options is not JSON serializable
    babelOptions: params.babelOptions,
    cwd: root,
  };

  childProcess.send(JSON.stringify(normalizedOptions));

  const messageOrResult = await Promise.race([
    new Promise<string>((resolve) => {
      // this covers the handled cases by the executor process, either being
      // successful or an error
      childProcess.on('message', resolve);
    }),
    new Promise<ExecutorResult>((resolve) => {
      // this covers the unhandled errors by the executor process, such
      // as top level syntax errors or not found modules
      childProcess.on('error', (error) => resolve({ status: 'error', error }));
    }),
    new Promise<ExecutorResult>((resolve) => {
      // this is a fallback in case the executor process does not send a
      // message or error, as should always be the last promise to resolve
      childProcess.on('close', (exitCode) =>
        resolve({
          status: 'error',
          error:
            typeof exitCode === 'number'
              ? `'schema-executor' process exited with status code ${exitCode}`
              : `'schema-executor' process exited without status code`,
        }),
      );
    }),
  ]);

  childProcess.kill();

  const executorResult: ExecutorResult =
    typeof messageOrResult === 'string'
      ? JSON.parse(messageOrResult)
      : messageOrResult;

  if (executorResult.status === 'error') {
    // TODO: ensure this serializes correctly and errors bubble up correctly
    throw new Error(executorResult.error);
  }

  return executorResult.result;
}
