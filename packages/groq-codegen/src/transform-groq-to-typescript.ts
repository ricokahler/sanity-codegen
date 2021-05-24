import { parse } from 'groq-js';
import * as Groq from 'groq-js/dist/nodeTypes';
import * as t from '@babel/types';

/**
 * Normalizes a transform for arrays by checking if the input node is an array.
 * If it is, it'll perform the operation on the unwrapped array expression then
 * re-wrap with an array type
 * (e.g. `Operation<InputNode[number]>[]`).
 *
 * If the input node is not an array, it'll just perform the operation on the
 * input node (e.g. `Operation<InputNode>`)
 */
function normalizeArrayTransform(
  inputNode: any,
  operation: (node: any) => any,
) {
  if (t.isTSArrayType(inputNode)) {
    return t.tsArrayType(
      operation(t.tsIndexedAccessType(inputNode, t.tsNumberKeyword())),
    );
  }

  return operation(inputNode);
}

/**
 * A helper that returns a type reference to the `Sanity.SafeIndexedAccess`
 * type helper made in `@sanity-codegen/types`. The purposes of this is to
 * transform attribute access types in groq that consider `undefined`
 */
function safeIndexedAccess(objectType: any, stringLiteralValue: string) {
  return t.tsTypeReference(
    t.tsQualifiedName(
      t.identifier('Sanity'),
      t.identifier('SafeIndexedAccess'),
    ),
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

      // Sanity.SafeIndexedAccess<Transform<Base>, 'name'>
      return normalizeArrayTransform(base, (n) =>
        safeIndexedAccess(n, node.name),
      );
    }

    case 'Filter': {
      const extractSubject = (() => {
        const { base } = node;

        switch (base.type) {
          case 'Star': {
            // input:  *[_type == 'movie']
            // output: Scope
            return everything;
          }
          case 'Identifier': {
            // input:  actors[name == 'leo']
            // output: Sanity.SafeIndexedAccess<Scope, 'actors'>
            return safeIndexedAccess(scope, base.name);
          }
          default: {
            // TODO: better error messages
            throw new Error('Unsupported');
          }
        }
      })();

      // Extract<ExtractSubject, Transform<Query>>
      return normalizeArrayTransform(extractSubject, (n) =>
        t.tsTypeReference(
          t.identifier('Extract'),
          t.tsTypeParameterInstantiation([
            n,
            transformGroqAstToTsAst({
              everything,
              scope,
              parentScope,
              node: node.query,
            }),
          ]),
        ),
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
      // input:
      // `{ firstProperty, secondProperty, ... }`
      //
      // output:
      //
      // ```
      // {
      //   firstProperty: Transform<AttributeValue>,
      //   secondProperty: Transform<AttributeValue>,
      // } & Omit<Base, 'firstProperty' | 'secondProperty'>
      // ```
      return normalizeArrayTransform(scope, (n) => {
        const hasSplat = attributes.some(
          (attribute) => attribute.type === 'ObjectSplat',
        );

        // { firstProperty: Transform<AttributeValue> }
        const objectAttributesTypeLiteral = t.tsTypeLiteral(
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
                    scope: n,
                    parentScope: scope,
                    node: attribute.value,
                  }),
                ),
              );
            }),
        );

        if (hasSplat) {
          // { firstProperty: Transform<AttributeValue> } & Omit<Base, 'firstProperty'>
          return t.tsIntersectionType([
            objectAttributesTypeLiteral,
            t.tsTypeReference(
              t.identifier('Omit'),
              t.tsTypeParameterInstantiation([
                n,
                t.tsUnionType(
                  attributes
                    .filter(
                      (attribute): attribute is Groq.ObjectAttributeNode =>
                        attribute.type === 'ObjectAttribute',
                    )
                    .map((attribute) =>
                      t.tsLiteralType(t.stringLiteral(attribute.key.value)),
                    ),
                ),
              ]),
            ),
          ]);
        }

        return objectAttributesTypeLiteral;
      });
    }

    case 'Identifier': {
      return normalizeArrayTransform(scope, (n) =>
        safeIndexedAccess(n, node.name),
      );
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

  return transformGroqAstToTsAst({
    everything,
    node: root,
    parentScope: t.tsUnknownKeyword(),
    scope: t.tsUnknownKeyword(),
  });
}
