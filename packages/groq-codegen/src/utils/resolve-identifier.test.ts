import fs from 'fs';
import path from 'path';
import * as t from '@babel/types';
import generate from '@babel/generator';
import { parse, traverse } from '@babel/core';
import { Scope } from '@babel/traverse';
import { boundedFind } from './bounded-find';
import { resolveIdentifier } from './resolve-identifier';

jest
  .spyOn(fs.promises, 'readFile')
  .mockImplementation((request) => Promise.resolve(request?.toString() || ''));

function parseSourceFile(source: string, filename: string = ''): t.File {
  const result = parse(source, {
    presets: [
      ['@babel/preset-env', { targets: 'maintained node versions' }],
      '@babel/preset-typescript',
    ],
    rootMode: 'upward-optional',
    filename,
  })!;
  return result as t.File;
}

function getScopeFromFile(file: t.File) {
  const scope = boundedFind<Scope>((resolve) => {
    traverse(file, {
      Program(n) {
        resolve(n.scope);
      },
    });
  })!;

  return scope;
}

describe('resolveIdentifier', () => {
  it('follows identifiers to expressions', async () => {
    const file = parseSourceFile("const someIdentifier = 'hey'; ");

    const result = await resolveIdentifier({
      filename: '',
      identifierName: 'someIdentifier',
      resolvePluckedFile: jest.fn(),
      parseSourceFile: jest.fn(),
      scope: getScopeFromFile(file),
    });

    expect(result.node.type).toMatchInlineSnapshot(`"VariableDeclarator"`);
    expect(generate(result.node).code).toMatchInlineSnapshot(
      `"someIdentifier = 'hey'"`,
    );
  });

  it('works with: import default; export default', async () => {
    const startFile = parseSourceFile(
      "import bookType from './via-default-export';",
    );

    const result = await resolveIdentifier({
      filename: '',
      identifierName: 'bookType',
      resolvePluckedFile: jest.fn(),
      parseSourceFile: () => parseSourceFile("export default 'book';"),
      scope: getScopeFromFile(startFile),
    });

    expect(result.node.type).toMatchInlineSnapshot(`"StringLiteral"`);
    expect(generate(result.node).code).toMatchInlineSnapshot(`"'book'"`);
  });

  it('works with: import named; export named', async () => {
    const startFile = parseSourceFile(
      "import {myType as bookType} from './via-default-export';",
    );

    const result = await resolveIdentifier({
      filename: '',
      identifierName: 'bookType',
      resolvePluckedFile: jest.fn(),
      parseSourceFile: () => parseSourceFile("export const myType = 'book';"),
      scope: getScopeFromFile(startFile),
    });

    expect(result.node.type).toMatchInlineSnapshot(`"VariableDeclarator"`);
    expect(generate(result.node).code).toMatchInlineSnapshot(
      `"myType = 'book'"`,
    );
  });

  it('works with a default re-export, 3 files', async () => {
    const startFile = parseSourceFile(
      "import myType from './via-default-reexport';",
    );

    const mockParseSourceFile = (_: string, filename: string) => {
      switch (filename) {
        case 'via-default-reexport': {
          return parseSourceFile(
            "export { default } from './via-default-export';",
          );
        }
        case 'via-default-export': {
          return parseSourceFile("export default 'book';");
        }
        default: {
          throw new Error();
        }
      }
    };

    const result = await resolveIdentifier({
      filename: '',
      identifierName: 'myType',
      resolvePluckedFile: path.basename,
      parseSourceFile: mockParseSourceFile,
      scope: getScopeFromFile(startFile),
    });

    expect(result.node.type).toMatchInlineSnapshot(`"StringLiteral"`);
    expect(generate(result.node).code).toMatchInlineSnapshot(`"'book'"`);
  });

  it('works with named default re-export, 3 files', async () => {
    const startFile = parseSourceFile(
      "import myType from './via-default-reexport';",
    );

    const mockParseSourceFile = (_: string, filename: string) => {
      switch (filename) {
        case 'via-default-reexport': {
          return parseSourceFile(
            "export { named as default } from './via-named-export';",
          );
        }
        case 'via-named-export': {
          return parseSourceFile(`
            export const type = 'book';
            export { type as named }
          `);
        }
        default: {
          throw new Error();
        }
      }
    };

    const result = await resolveIdentifier({
      filename: '',
      identifierName: 'myType',
      resolvePluckedFile: path.basename,
      parseSourceFile: mockParseSourceFile,
      scope: getScopeFromFile(startFile),
    });

    expect(result.node.type).toMatchInlineSnapshot(`"VariableDeclarator"`);
    expect(generate(result.node).code).toMatchInlineSnapshot(`"type = 'book'"`);
  });

  it('throws if the default export could not be found', async () => {
    const startFile = parseSourceFile(
      "import myType from './via-default-reexport';",
    );

    const resultPromise = resolveIdentifier({
      filename: '',
      identifierName: 'myType',
      resolvePluckedFile: path.basename,
      parseSourceFile: () =>
        // this shouldn't work because it's not the default export
        parseSourceFile("export const myType = 'hey'"),
      scope: getScopeFromFile(startFile),
    });

    await expect(resultPromise).rejects.toMatchInlineSnapshot(
      `[Error: Could not find default export in: via-default-reexport]`,
    );
  });

  it('throws if the default export could not be found', async () => {
    const startFile = parseSourceFile(
      "import myType from './via-default-reexport';",
    );

    const resultPromise = resolveIdentifier({
      filename: '',
      identifierName: 'myType',
      resolvePluckedFile: path.basename,
      parseSourceFile: () =>
        // this shouldn't work because it's not the default export
        parseSourceFile("export const myType = 'hey'"),
      scope: getScopeFromFile(startFile),
    });

    await expect(resultPromise).rejects.toMatchInlineSnapshot(
      `[Error: Could not find default export in: via-default-reexport]`,
    );
  });

  it('throws if the identifier could not be found in the file', async () => {
    const startFile = parseSourceFile(
      "import { myType } from './example-file';",
    );

    const resultPromise = resolveIdentifier({
      filename: '',
      identifierName: 'myType',
      resolvePluckedFile: path.basename,
      parseSourceFile: () =>
        // this shouldn't work because it's not `myType`
        parseSourceFile("export const wrongType = 'hey'"),
      scope: getScopeFromFile(startFile),
    });

    await expect(resultPromise).rejects.toMatchInlineSnapshot(
      `[Error: Could not find identifier \`myType\` in file: example-file]`,
    );
  });

  it('resolves relative files using the last filename', async () => {
    const startFile = parseSourceFile(
      "import bookType from './via-default-export';",
    );
    const mockResolvePluckedFile = jest.fn();

    await resolveIdentifier({
      filename: '/usr/home/my-example-file.ts',
      identifierName: 'bookType',
      resolvePluckedFile: mockResolvePluckedFile,
      parseSourceFile: () => parseSourceFile("export default 'book';"),
      scope: getScopeFromFile(startFile),
    });

    expect(mockResolvePluckedFile).toHaveBeenCalledTimes(1);
    expect(mockResolvePluckedFile.mock.calls[0][0]).toMatchInlineSnapshot(
      `"/usr/home/via-default-export"`,
    );
  });

  it("doesn't use the last filename for non-relative files", async () => {
    const startFile = parseSourceFile(
      "import { myType } from 'non-relative-from';",
    );
    const mockResolvePluckedFile = jest.fn();

    await resolveIdentifier({
      filename: '/usr/home/my-example-file.ts',
      identifierName: 'myType',
      resolvePluckedFile: mockResolvePluckedFile,
      parseSourceFile: () => parseSourceFile("export const myType = 'hey'"),
      scope: getScopeFromFile(startFile),
    });

    expect(mockResolvePluckedFile).toHaveBeenCalledTimes(1);
    expect(mockResolvePluckedFile.mock.calls[0][0]).toMatchInlineSnapshot(
      `"non-relative-from"`,
    );
  });
});
