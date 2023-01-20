import fs from 'fs';
import path from 'path';
// @ts-expect-error no types for this
import register, { revert } from '@babel/register';
import { defaultBabelOptions } from '@sanity-codegen/extractor';

interface Options {
  filenameIfNotFound: string;
  startingPoint: string;
}

// Note: @babel/register must be hooked prior to this file running because this
// resolving method uses `require.resolve`.
/**
 * Given a starting point and a back up filename, this function will first check
 * to see if there is a file at the starting point. If so it will return the
 * resolved version of that file.
 *
 * Otherwise it will walk up the file tree looking for the given filename if a
 * file was not found at the starting point.
 */
export async function fileWalker({
  startingPoint,
  filenameIfNotFound,
}: Options) {
  // enables require.resolve to find `.ts` extensions
  register(defaultBabelOptions);

  const resolvedRoot = path.resolve(startingPoint);
  const stats = await fs.promises.stat(resolvedRoot);

  // if the resolved root already references a file, don't walk up the tree
  // looking for the filename
  if (!stats.isDirectory()) return require.resolve(resolvedRoot);

  async function find(pathname: string): Promise<string | null> {
    try {
      return require.resolve(`${pathname}/${filenameIfNotFound}`);
    } catch {
      const currentFolder = path.resolve(pathname, './');
      const parentFolder = path.resolve(pathname, '../');

      if (currentFolder === parentFolder) return null;
      return await find(parentFolder);
    }
  }

  const result = await find(resolvedRoot);

  revert();

  return result;
}
