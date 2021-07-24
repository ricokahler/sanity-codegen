import path from 'path';
import fs from 'fs';
import { fileWalker } from './file-walker';

const nestedFolderPath = path.resolve(
  __dirname,
  './__example-folders__/example-folder/nested-module/nested-folder/nested-folder-again',
);

beforeAll(() => {
  expect(fs.existsSync(nestedFolderPath)).toBe(true);
});

describe('fileWalker', () => {
  it('resolves to the starting point if the starting point is a file', async () => {
    const startingPoint = require.resolve('./__example-folders__/root-level');
    const result = await fileWalker({
      filenameIfNotFound: 'root-level',
      startingPoint,
    });

    expect(result).toBe(startingPoint);
    expect(path.relative(__dirname, result!)).toMatchInlineSnapshot(
      `"__example-folders__/root-level.ts"`,
    );
  });

  it('walks up the tree looking for the given filename if the starting point is a directory', async () => {
    const result = await fileWalker({
      filenameIfNotFound: 'root-level',
      startingPoint: nestedFolderPath,
    });

    expect(result).toBe(require.resolve('./__example-folders__/root-level'));
    expect(path.relative(__dirname, result!)).toMatchInlineSnapshot(
      `"__example-folders__/root-level.ts"`,
    );
  });

  it('resolves modules with indexes', async () => {
    // this module is in a folder and has an `index.ts` file.
    const resolvedPath = require.resolve(
      './__example-folders__/module-with-index',
    );
    const result = await fileWalker({
      filenameIfNotFound: 'module-with-index',
      startingPoint: nestedFolderPath,
    });

    expect(result).toBe(resolvedPath);
    expect(path.relative(__dirname, result!)).toMatchInlineSnapshot(
      `"__example-folders__/module-with-index/index.ts"`,
    );
  });

  it('works with a relative starting point', async () => {
    const resolvedPath = require.resolve('./__example-folders__/root-level');
    const result = await fileWalker({
      filenameIfNotFound: 'root-level',
      startingPoint: path.relative(process.cwd(), nestedFolderPath),
    });

    expect(result).toBe(resolvedPath);
    expect(path.relative(__dirname, result!)).toMatchInlineSnapshot(
      `"__example-folders__/root-level.ts"`,
    );
  });

  it('returns null if no matching file was found', async () => {
    const result = await fileWalker({
      filenameIfNotFound: 'non-existent',
      startingPoint: nestedFolderPath,
    });

    expect(result).toBe(null);
  });
});
