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

  // use the current scope to try to get a [binding][0] for the current identifier
  // we're looking for.
  // [0]: https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#bindings
  const binding = scope.getBinding(identifierName);

  if (binding) {
    const node = binding.path.node;

    // if a binding is found for current identifier, and that binding is not an
    // import specifier, then we can assume we're done resolving
    if (
      node.type !== 'ImportDefaultSpecifier' &&
      node.type !== 'ImportSpecifier'
    ) {
      return { node, scope, filename };
    }

    const importDeclaration = boundedFind<t.ImportDeclaration>((resolve) => {
      traverse(binding.scope.block, {
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

    const nextFilename = await getNextFilename(importDeclaration.source.value);
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

  const matchingExportSpecifier = boundedFind<{
    node: t.ExportSpecifier;
    scope: Scope;
  }>((resolve) => {
    traverse(scope.path.node, {
      // export { named } // from './re-export';
      ExportNamedDeclaration(n) {
        const matchingExportSpecifier = n.node.specifiers.find((specifier) => {
          const exportedName =
            'value' in specifier.exported
              ? specifier.exported.value
              : specifier.exported.name;

          return exportedName === identifierName;
        });

        if (matchingExportSpecifier?.type === 'ExportSpecifier') {
          resolve({ node: matchingExportSpecifier, scope: n.scope });
        }
      },
    });
  });

  if (!matchingExportSpecifier && identifierName === 'default') {
    // if we couldn't find a matching export specifier but the identifier we're
    // looking for is the default export, then try to match an expression like
    // `export default someExpression`
    const exportDefaultDeclarationResult = boundedFind<{
      node: t.ExportDefaultDeclaration;
      scope: Scope;
    }>((resolve) => {
      traverse(scope.block, {
        // export default someExpression;
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

  if (matchingExportSpecifier) {
    const { node } = matchingExportSpecifier;

    const exportNamedDeclaration = boundedFind<t.ExportNamedDeclaration>(
      (resolve) => {
        traverse(matchingExportSpecifier.scope.block, {
          ExportNamedDeclaration(n) {
            if (n.node.specifiers.includes(node)) {
              resolve(n.node);
            }
          },
        });
      },
    )!;

    if (exportNamedDeclaration.source) {
      // if there is a source, then it's a re-export
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
    } else {
      // otherwise the ExportSpecifier is exporting from current file
      return resolveIdentifier({
        identifierName: node.local.name,
        scope,
        filename,
        resolvePluckedFile,
        parseSourceFile,
      });
    }
  } else {
    // if there isn't a matching default export, then look for an `export *`
    const exportAll = boundedFind<t.ExportAllDeclaration>((resolve) => {
      traverse(scope.block, {
        ExportAllDeclaration(n) {
          resolve(n.node);
        },
      });
    });

    if (exportAll) {
      // if found follow the `export *` `from` source value
      const nextFilename = await getNextFilename(exportAll.source.value);
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
        identifierName,
        scope: nextScope,
        filename: nextFilename,
        resolvePluckedFile,
        parseSourceFile,
      });
    } else {
      throw new ResolveExpressionError(
        `Could not find identifier \`${identifierName}\` in file: ${filename}`,
      );
    }
  }
}
