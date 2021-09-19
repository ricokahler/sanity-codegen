import * as t from '@babel/types';
import fs from 'fs';
import { traverse } from '@babel/core';
import { Scope } from '@babel/traverse';
import generate from '@babel/generator';
import pool from '@ricokahler/pool';
import { resolveIdentifier } from './resolve-identifier';
import { ResolveExpressionError } from '../resolve-expression-error';
import { boundedFind } from './bounded-find';
import { getNextFilename } from './get-next-filename';

const staticPluckerNotice =
  `Note: the current GROQ plucker can only extract static values from your ` +
  `source code with very limited support for resolving template ` +
  `expressions. See here for more info:\n` +
  `https://github.com/ricokahler/sanity-codegen/tree/alpha/packages/groq-codegen#expression-support`;

function tryStringifyNode(node: t.Node) {
  try {
    return ` \`${generate(node).code}\``;
  } catch {
    return '';
  }
}

interface ResolveExpressionOptions {
  node: t.Node;
  file: t.File;
  scope: Scope;
  filename: string;
  // TODO: add docs about resolving relative to another file via `path.resolve`
  resolvePluckedFile: (request: string) => string | Promise<string>;
  parseSourceFile: (source: string, filename: string) => t.File;
}

export async function resolveExpression({
  node,
  file,
  scope,
  filename,
  resolvePluckedFile,
  parseSourceFile,
}: ResolveExpressionOptions): Promise<string> {
  if (t.isTaggedTemplateExpression(node)) {
    return await resolveExpression({
      node: node.quasi,
      file,
      scope,
      filename,
      parseSourceFile,
      resolvePluckedFile,
    });
  }

  if (t.isTemplateLiteral(node)) {
    const resolvedExpressions = await pool({
      collection: node.expressions,
      task: (nestedExpression) =>
        resolveExpression({
          node: nestedExpression,
          file,
          scope,
          filename,
          parseSourceFile,
          resolvePluckedFile,
        }),
      maxConcurrency: 1,
    });

    return node.quasis
      .map(
        (quasi, index) =>
          `${quasi.value.cooked || ''}${resolvedExpressions[index] || ''}`,
      )
      .join('');
  }

  if (t.isVariableDeclarator(node)) {
    if (!node.init) {
      throw new ResolveExpressionError(
        `Could not resolve variable declarator${tryStringifyNode(node.id)}.`,
      );
    }

    return resolveExpression({
      node: node.init,
      file,
      scope,
      filename,
      parseSourceFile,
      resolvePluckedFile,
    });
  }

  if (t.isLiteral(node)) {
    if ('value' in node) {
      return node.value.toString();
    }

    throw new ResolveExpressionError(
      `Could not get value from literal${tryStringifyNode(node)}.`,
    );
  }

  if (t.isIdentifier(node)) {
    const result = await resolveIdentifier({
      identifierName: node.name,
      file,
      scope,
      filename,
      parseSourceFile,
      resolvePluckedFile,
    });

    return resolveExpression({
      node: result.node,
      file: result.file,
      filename: result.filename,
      scope: result.scope,
      parseSourceFile,
      resolvePluckedFile,
    });
  }

  if (t.isMemberExpression(node)) {
    const { object, property } = node;

    if (!t.isIdentifier(object) || !t.isIdentifier(property)) {
      throw new ResolveExpressionError(
        `Unable to resolve member expression${tryStringifyNode(
          node,
        )} in ${filename}\n ${staticPluckerNotice}`,
      );
    }

    const importStarImportDeclaration = boundedFind<t.ImportDeclaration>(
      (resolve) => {
        traverse(file, {
          ImportDeclaration(n) {
            for (const specifier of n.node.specifiers) {
              if (specifier.local.name === object.name) {
                resolve(n.node);
              }
            }
          },
        });
      },
    );

    if (importStarImportDeclaration) {
      const nextFilename = await getNextFilename({
        currentFilename: filename,
        targetFilename: importStarImportDeclaration.source.value,
        resolvePluckedFile,
      });
      const source = await fs.promises.readFile(nextFilename);
      const nextFile = parseSourceFile(source.toString(), nextFilename);
      const nextScope = boundedFind<Scope>((resolve) => {
        traverse(nextFile, {
          Program(n) {
            resolve(n.scope);
          },
        });
      })!;

      const result = await resolveIdentifier({
        identifierName: property.name,
        file: nextFile,
        scope: nextScope,
        filename: nextFilename,
        parseSourceFile,
        resolvePluckedFile,
      });

      return resolveExpression({
        node: result.node,
        file: result.file,
        filename: result.filename,
        scope: result.scope,
        parseSourceFile,
        resolvePluckedFile,
      });
    }
  }

  throw new ResolveExpressionError(
    `Unable to resolve query expression${tryStringifyNode(
      node,
    )} in ${filename}\n ${staticPluckerNotice}`,
  );
}
