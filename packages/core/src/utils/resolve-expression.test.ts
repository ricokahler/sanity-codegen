import fs from 'fs';
import * as t from '@babel/types';
import { parse, traverse } from '@babel/core';
import { Scope } from '@babel/traverse';
import { boundedFind } from './bounded-find';
import { resolveExpression } from './resolve-expression';

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

describe('resolveExpression', () => {
  it('resolves expressions to strings', async () => {
    const file = parseSourceFile('groq`tagged-template-literal`');
    const { node, scope } = boundedFind<{ node: t.Node; scope: Scope }>(
      (resolve) => {
        traverse(file, {
          TaggedTemplateExpression(n) {
            resolve(n);
          },
        });
      },
    )!;

    const resolvedExpression = await resolveExpression({
      node,
      file,
      scope,
      filename: '',
      parseSourceFile: jest.fn(),
      resolvePluckedFile: jest.fn(),
    });

    expect(resolvedExpression).toMatchInlineSnapshot(
      `"tagged-template-literal"`,
    );
  });

  it('resolves expressions within expression', async () => {
    const file = parseSourceFile(`
      const expression = 'book';
      groq\`*[_type == '\${expression}']\`
    `);

    const { node, scope } = boundedFind<{ node: t.Node; scope: Scope }>(
      (resolve) => {
        traverse(file, {
          TaggedTemplateExpression(n) {
            resolve(n);
          },
        });
      },
    )!;

    const resolvedExpression = await resolveExpression({
      node,
      file,
      scope,
      filename: '',
      parseSourceFile: jest.fn(),
      resolvePluckedFile: jest.fn(),
    });

    expect(resolvedExpression).toMatchInlineSnapshot(`"*[_type == 'book']"`);
  });

  it('resolves string, number, and boolean literals', async () => {
    const file = parseSourceFile(`groq\`*[
        _type == '\${'book'}' &&
        count(amount) > \${5} &&
        isCool == \${false}
      ]\`
    `);

    const { node, scope } = boundedFind<{ node: t.Node; scope: Scope }>(
      (resolve) => {
        traverse(file, {
          TaggedTemplateExpression(n) {
            resolve(n);
          },
        });
      },
    )!;

    const resolvedExpression = await resolveExpression({
      node,
      file,
      scope,
      filename: '',
      parseSourceFile: jest.fn(),
      resolvePluckedFile: jest.fn(),
    });

    expect(resolvedExpression).toMatchInlineSnapshot(`
      "*[
              _type == 'book' &&
              count(amount) > 5 &&
              isCool == false
            ]"
      `);
  });

  it('resolves `import *` member expressions', async () => {
    const file = parseSourceFile(`
      import * as Everything from './module';
      
      const id = Everything.type
    `);

    const scope = boundedFind<Scope>((resolve) => {
      traverse(file, {
        Program(n) {
          resolve(n.scope);
        },
      });
    })!;

    const binding = scope.getBinding('id')!;

    const resolvedExpression = await resolveExpression({
      node: binding.path.node,
      file,
      scope: binding.scope,
      filename: '',
      parseSourceFile: jest.fn(() =>
        parseSourceFile(`
          export const type = 'from-other-file'
        `),
      ),
      resolvePluckedFile: jest.fn(),
    });

    expect(resolvedExpression).toMatchInlineSnapshot(`"from-other-file"`);
  });

  it("throws if the expression can't be serialized", async () => {
    // eslint bug?
    // eslint-disable-next-line no-template-curly-in-string
    const file = parseSourceFile("groq`*[_type == '${new Date()}']`");

    const { node, scope } = boundedFind<{ node: t.Node; scope: Scope }>(
      (resolve) => {
        traverse(file, {
          TaggedTemplateExpression(n) {
            resolve(n);
          },
        });
      },
    )!;

    const promise = resolveExpression({
      node,
      file,
      scope,
      filename: '',
      parseSourceFile: jest.fn(),
      resolvePluckedFile: jest.fn(),
    });

    await expect(promise).rejects.toMatchInlineSnapshot(`
[Error: Unable to resolve query expression \`new Date()\` in 
 Note: the current GROQ plucker can only extract static values from your source code with very limited support for resolving template expressions. See here for more info:
https://github.com/ricokahler/sanity-codegen/tree/alpha/packages/core#expression-support]
`);
  });

  it("throws if the variable declaration doesn't include an assignment", async () => {
    // this won't work because the expression doesn't include the assignment
    const file = parseSourceFile(`
      let expression;

      if (true) {
        expression = 'book'
      }

      groq\`*[_type == '\${expression}']\`
    `);

    const { node, scope } = boundedFind<{ node: t.Node; scope: Scope }>(
      (resolve) => {
        traverse(file, {
          TaggedTemplateExpression(n) {
            resolve(n);
          },
        });
      },
    )!;

    const promise = resolveExpression({
      node,
      file,
      scope,
      filename: '',
      parseSourceFile: jest.fn(),
      resolvePluckedFile: jest.fn(),
    });

    await expect(promise).rejects.toMatchInlineSnapshot(
      `[Error: Could not resolve variable declarator \`expression\`.]`,
    );
  });
});
