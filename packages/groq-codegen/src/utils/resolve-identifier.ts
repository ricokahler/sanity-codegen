import fs from 'fs';
import path from 'path';
import * as t from '@babel/types';
import { traverse } from '@babel/core';
import { Scope } from '@babel/traverse';
import { boundedFind } from './bounded-find';
import { ResolveExpressionError } from '../resolve-expression-error';

interface ResolveIdentifierOptions {
  identifierName: string;
  scope: Scope;
  filename: string;
  resolvePluckedFile: (request: string) => string | Promise<string>;
  parseSourceFile: (source: string, filename: string) => t.File;
}

export async function resolveIdentifier({
  identifierName,
  scope,
  filename,
  resolvePluckedFile,
  parseSourceFile,
}: ResolveIdentifierOptions): Promise<{
  node: t.Node;
  scope: Scope;
  filename: string;
}> {
  const getNextFilename = (source: string) => {
    const resolvedSource = source.startsWith('.')
      ? path.resolve(
          // resolve relative to the incoming filename. `path.resolve` should
          // properly handle whether or not to use the previous dirname or not
          // based on whether or not the incoming source file is a relative
          // path or not.
          // see here: https://nodejs.org/api/path.html#path_path_resolve_paths
          path.dirname(filename),
          source,
        )
      : // if the source does not start with a `.` then leave as-is
        source;

    return resolvePluckedFile(resolvedSource);
  };

  const binding = scope.getBinding(identifierName);

  const found = binding
    ? { node: binding.path.node, scope: binding.scope }
    : boundedFind<{ node: t.ExportSpecifier; scope: Scope }>((resolve) => {
        traverse(scope.path.node, {
          ExportNamedDeclaration(n) {
            const matchingExportSpecifier = n.node.specifiers.find(
              (specifier) => {
                const exportedName =
                  'value' in specifier.exported
                    ? specifier.exported.value
                    : specifier.exported.name;

                return exportedName === identifierName;
              },
            );

            if (matchingExportSpecifier?.type === 'ExportSpecifier') {
              resolve({ node: matchingExportSpecifier, scope: n.scope });
            }
          },
        });
      });

  if (!found && identifierName === 'default') {
    const exportDefaultDeclarationResult = boundedFind<{
      node: t.ExportDefaultDeclaration;
      scope: Scope;
    }>((resolve) => {
      traverse(scope.block, {
        ExportDefaultDeclaration(n) {
          resolve({ node: n.node, scope: n.scope });
        },
      });
    });

    if (!exportDefaultDeclarationResult) {
      throw new ResolveExpressionError(
        `Could not find default export in: ${filename}`,
      );
    }

    return {
      node: exportDefaultDeclarationResult.node.declaration,
      scope: exportDefaultDeclarationResult.scope,
      filename,
    };
  }

  if (!found) {
    throw new ResolveExpressionError(
      `Could not find identifier \`${identifierName}\` in file: ${filename}`,
    );
  }

  const { node } = found;

  switch (node.type) {
    case 'ImportDefaultSpecifier':
    case 'ImportSpecifier': {
      const importDeclaration = boundedFind<t.ImportDeclaration>((resolve) => {
        traverse(found.scope.block, {
          ImportDeclaration(n) {
            if (n.node.specifiers.includes(node)) {
              resolve(n.node);
            }
          },
        });
      })!;

      const nextIdentifier =
        'imported' in node
          ? 'value' in node.imported
            ? node.imported.value
            : node.imported.name
          : 'default';
      const nextFilename = await getNextFilename(
        importDeclaration.source.value,
      );
      const source = await fs.promises.readFile(nextFilename);
      const file = parseSourceFile(source.toString(), nextFilename);

      const nextScope = boundedFind<Scope>((resolve) => {
        traverse(file, {
          Program(n) {
            resolve(n.scope);
          },
        });
      })!;

      return resolveIdentifier({
        identifierName: nextIdentifier,
        scope: nextScope,
        filename: nextFilename,
        resolvePluckedFile,
        parseSourceFile,
      });
    }
    case 'ExportSpecifier': {
      const exportNamedDeclaration = boundedFind<t.ExportNamedDeclaration>(
        (resolve) => {
          traverse(found.scope.block, {
            ExportNamedDeclaration(n) {
              if (n.node.specifiers.includes(node)) {
                resolve(n.node);
              }
            },
          });
        },
      )!;

      // if not source then the ExportSpecifier is exporting from current file
      if (!exportNamedDeclaration.source) {
        return resolveIdentifier({
          identifierName: node.local.name,
          scope,
          filename,
          resolvePluckedFile,
          parseSourceFile,
        });
      }

      // otherwise, it's a re-export and needs to be resolved again
      const nextIdentifier = node.local.name;
      const nextFilename = await getNextFilename(
        exportNamedDeclaration.source.value,
      );
      const source = await fs.promises.readFile(nextFilename);
      const file = parseSourceFile(source.toString(), nextFilename);

      const nextScope = boundedFind<Scope>((resolve) => {
        traverse(file, {
          Program(n) {
            resolve(n.scope);
          },
        });
      })!;

      return resolveIdentifier({
        identifierName: nextIdentifier,
        scope: nextScope,
        filename: nextFilename,
        resolvePluckedFile,
        parseSourceFile,
      });
    }
    default: {
      return { node, scope, filename };
    }
  }
}
