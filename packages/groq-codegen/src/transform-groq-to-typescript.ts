import { parse } from 'groq-js';
import * as Groq from 'groq-js/dist/nodeTypes';
import * as t from '@babel/types';

/**
 * A helper that returns a type reference to the `Sanity.SafeIndexedAccess`
 * type helper made in `@sanity-codegen/types`. The purposes of this is to
 * transform attribute access types in groq that consider `undefined`
 */
function indexedAccess(objectType: any, stringLiteralValue: string) {
  return t.tsTypeReference(
    t.tsQualifiedName(t.identifier('Sanity'), t.identifier('IndexedAccess')),
    t.tsTypeParameterInstantiation([
      objectType,
      t.tsLiteralType(t.stringLiteral(stringLiteralValue)),
    ]),
  );
}

export interface TransformGroqAstToTsAstParams {
  /**
   * A type that represents everything i.e. all documents. This is typically
   * `Sanity.Schema.Document[]`
   */
  everything: t.TSType;
  /**
   * The type that represents the current scope (as defined by the
   * [GROQ spec](https://sanity-io.github.io/GROQ/draft/#sec-Scope)).
   * This is used to derive types that refer to the current scope where
   * applicable,
   */
  scope: t.TSType;
  /**
   * Similar to the `scope` but refers to the scope one layer above the current
   * scope. This is used to derive types that refer to that parent scope.
   */
  parentScope: t.TSType;
  /**
   * The input GROQ syntax AST node you wish to convert to a `TSType`
   */
  node: Groq.SyntaxNode;
}

/**
 * A lower-level API (when compared to `transformGroqToTypescript`) that takes
 * in a GROQ AST (and some extra context) and returns a TS type AST node.
 */
export function transformGroqAstToTsAst({
  scope,
  parentScope,
  node,
  everything,
}: TransformGroqAstToTsAstParams): t.TSType {
  switch (node.type) {
    case 'Attribute': {
      const base = transformGroqAstToTsAst({
        everything,
        scope,
        parentScope,
        node: node.base,
      });

      // Sanity.IndexedAccess<Transform<Base>, 'name'>
      return indexedAccess(base, node.name);
    }

    case 'Star': {
      return everything;
    }

    case 'Filter': {
      const extractSubject = transformGroqAstToTsAst({
        everything,
        scope,
        parentScope,
        node: node.base,
      });

      // Extract<ExtractSubject, Transform<Query>>
      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier('Sanity'), t.identifier('MultiExtract')),
        t.tsTypeParameterInstantiation([
          extractSubject,
          transformGroqAstToTsAst({
            everything,
            scope,
            parentScope,
            node: node.query,
          }),
        ]),
      );
    }

    case 'OpCall': {
      const typeName = (() => {
        if (
          node.left.type === 'Identifier' &&
          node.left.name === '_type' &&
          node.right.type === 'Value' &&
          typeof node.right.value === 'string'
        ) {
          return node.right.value;
        }

        if (
          node.right.type === 'Identifier' &&
          node.right.name === '_type' &&
          node.left.type === 'Value' &&
          typeof node.left.value === 'string'
        ) {
          return node.left.value;
        }

        return null;
      })();

      if (
        // if the op call is type equality and
        // @ts-expect-error: `==` is missing from the first party types
        node.op === '==' &&
        !!typeName
      ) {
        // then return { _type: 'book' }

        return t.tsTypeLiteral([
          t.tsPropertySignature(
            t.identifier('_type'),
            t.tsTypeAnnotation(t.tsLiteralType(t.stringLiteral(typeName))),
          ),
        ]);
      }

      return t.tsUnknownKeyword();
    }

    case 'Element': {
      const base = transformGroqAstToTsAst({
        everything,
        node: node.base,
        scope,
        parentScope,
      });

      return t.tsTypeReference(
        t.tsQualifiedName(
          t.identifier('Sanity'),
          t.identifier('ArrayElementAccess'),
        ),
        t.tsTypeParameterInstantiation([base]),
      );
    }

    case 'Projection': {
      return transformGroqAstToTsAst({
        everything,
        scope: transformGroqAstToTsAst({
          everything,
          parentScope,
          scope,
          node: node.base,
        }),
        parentScope: scope,
        node: node.query,
      });
    }

    case 'Object': {
      const { attributes } = node;

      const hasSplat = attributes.some(
        (attribute) => attribute.type === 'ObjectSplat',
      );

      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier('Sanity'), t.identifier('ObjectMap')),
        t.tsTypeParameterInstantiation([
          scope,
          t.tsTypeLiteral(
            attributes
              .filter(
                (attribute): attribute is Groq.ObjectAttributeNode =>
                  attribute.type === 'ObjectAttribute',
              )
              .map((attribute) => {
                return t.tsPropertySignature(
                  t.identifier(attribute.key.value),
                  t.tsTypeAnnotation(
                    transformGroqAstToTsAst({
                      everything,
                      scope: scope,
                      parentScope: scope,
                      node: attribute.value,
                    }),
                  ),
                );
              }),
          ),
          t.tsLiteralType(
            t.stringLiteral(hasSplat ? 'with_splat' : 'without_splat'),
          ),
        ]),
      );
    }

    case 'Identifier': {
      return indexedAccess(scope, node.name);
    }

    case 'Parenthesis': {
      // TODO: is there more to this? (why is this in the AST?)
      return transformGroqAstToTsAst({
        everything,
        scope,
        parentScope,
        node: node.base,
      });
    }

    case 'And': {
      return t.tsIntersectionType([
        transformGroqAstToTsAst({
          everything,
          scope,
          parentScope,
          node: node.left,
        }),
        transformGroqAstToTsAst({
          everything,
          scope,
          parentScope,
          node: node.right,
        }),
      ]);
    }

    case 'Or': {
      return t.tsUnionType([
        transformGroqAstToTsAst({
          everything,
          scope,
          parentScope,
          node: node.left,
        }),
        transformGroqAstToTsAst({
          everything,
          scope,
          parentScope,
          node: node.right,
        }),
      ]);
    }

    case 'Deref': {
      return t.tsTypeReference(
        t.tsQualifiedName(
          t.identifier('Sanity'),
          t.identifier('ReferenceType'),
        ),
        t.tsTypeParameterInstantiation([
          transformGroqAstToTsAst({
            everything,
            scope,
            parentScope,
            node: node.base,
          }),
        ]),
      );
    }

    case 'Mapper': {
      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier('Sanity'), t.identifier('Mapper')),
        t.tsTypeParameterInstantiation([
          transformGroqAstToTsAst({
            everything,
            scope,
            parentScope,
            node: node.base,
          }),
        ]),
      );
    }

    default: {
      console.warn(`"${node.type}" not implemented yet`);
      return t.tsUnknownKeyword();
    }
  }
}

export interface TransformGroqToTypescriptOptions {
  /**
   * The query to generate a TypeScript type for
   */
  query: string;
}

/**
 * Given a GROQ query, returns a babel TSType node
 */
export function transformGroqToTypescript({
  query,
}: TransformGroqToTypescriptOptions) {
  const root: Groq.SyntaxNode = parse(query);
  // Sanity.Schema.Document[]
  const everything = t.tsArrayType(
    t.tsTypeReference(
      t.tsQualifiedName(
        t.tsQualifiedName(t.identifier('Sanity'), t.identifier('Schema')),
        t.identifier('Document'),
      ),
    ),
  );

  return t.tsTypeReference(
    t.tsQualifiedName(t.identifier('Sanity'), t.identifier('UnwrapMapper')),
    t.tsTypeParameterInstantiation([
      transformGroqAstToTsAst({
        everything,
        node: root,
        parentScope: t.tsUnknownKeyword(),
        scope: t.tsUnknownKeyword(),
      }),
    ]),
  );
}
