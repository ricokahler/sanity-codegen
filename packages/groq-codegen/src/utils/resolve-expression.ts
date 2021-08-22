import * as t from '@babel/types';
import { Scope } from '@babel/traverse';
import generate from '@babel/generator';
import pool from '@ricokahler/pool';
import { resolveIdentifier } from './resolve-identifier';
import { ResolveExpressionError } from '../resolve-expression-error';

const staticPluckerNotice =
  `Note: the current GROQ plucker can only extract static values from your ` +
  `source code with very limited support for resolving template ` +
  `expressions. See here for more info: TODO add link`;

function tryStringifyNode(node: t.Node) {
  try {
    return ` \`${generate(node).code}\``;
  } catch {
    return '';
  }
}

interface ResolveExpressionOptions {
  node: t.Node;
  scope: Scope;
  filename: string;
  // TODO: add docs about resolving relative to another file via `path.resolve`
  resolvePluckedFile: (request: string) => string | Promise<string>;
  parseSourceFile: (source: string, filename: string) => t.File;
}

export async function resolveExpression({
  node,
  scope,
  filename,
  resolvePluckedFile,
  parseSourceFile,
}: ResolveExpressionOptions): Promise<string> {
  if (t.isTaggedTemplateExpression(node)) {
    return await resolveExpression({
      node: node.quasi,
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
      scope,
      filename,
      parseSourceFile,
      resolvePluckedFile,
    });

    return resolveExpression({
      node: result.node,
      filename: result.filename,
      scope: result.scope,
      parseSourceFile,
      resolvePluckedFile,
    });
  }

  throw new ResolveExpressionError(
    `Unable to resolve query expression${tryStringifyNode(
      node,
    )} in ${filename}\n ${staticPluckerNotice}`,
  );
}
