import fs from 'fs';
import * as t from '@babel/types';
import { traverse } from '@babel/core';
import { Scope } from '@babel/traverse';
import { boundedFind } from './bounded-find';
import { getNextFilename } from './get-next-filename';
import { ResolveExpressionError } from '../resolve-expression-error';

interface ResolveIdentifierOptions {
  identifierName: string;
  file: t.File;
  scope: Scope;
  filename: string;
  resolvePluckedFile: (request: string) => string | Promise<string>;
  parseSourceFile: (source: string, filename: string) => t.File;
}

export async function resolveIdentifier({
  identifierName,
  file,
  scope,
  filename,
  resolvePluckedFile,
  parseSourceFile,
}: ResolveIdentifierOptions): Promise<{
  node: t.Node;
  file: t.File;
  scope: Scope;
  filename: string;
}> {
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
      return { node, file, scope, filename };
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

    const nextFilename = await getNextFilename({
      currentFilename: filename,
      targetFilename: importDeclaration.source.value,
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

    return resolveIdentifier({
      identifierName: nextIdentifier,
      file: nextFile,
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
      file,
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
      const nextFilename = await getNextFilename({
        currentFilename: filename,
        targetFilename: exportNamedDeclaration.source.value,
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

      return resolveIdentifier({
        identifierName: nextIdentifier,
        file: nextFile,
        scope: nextScope,
        filename: nextFilename,
        resolvePluckedFile,
        parseSourceFile,
      });
    } else {
      // otherwise the ExportSpecifier is exporting from current file
      return resolveIdentifier({
        identifierName: node.local.name,
        file,
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
      const nextFilename = await getNextFilename({
        currentFilename: filename,
        targetFilename: exportAll.source.value,
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

      return resolveIdentifier({
        identifierName,
        file: nextFile,
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
