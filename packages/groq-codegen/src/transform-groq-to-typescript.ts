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

  interface TransformParams {
    scope: t.TSType;
    parentScope: t.TSType | null;
    node: Groq.SyntaxNode;
  }

  function transform({ scope, parentScope, node }: TransformParams): t.TSType {
    switch (node.type) {
      case 'Attribute': {
        const base = transform({
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
              return scope;
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
              transform({
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
        const base = transform({
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
        if (node.query.type !== 'Object') {
          throw new Error('unsupported');
        }

        const { attributes } = node.query;
        const base = transform({ scope, parentScope, node: node.base });

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
        return normalizeArrayTransform(base, (n) => {
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
                    transform({
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
        return transform({ scope, parentScope, node: node.base });
      }

      case 'And': {
        return t.tsIntersectionType([
          transform({ scope, parentScope, node: node.left }),
          transform({ scope, parentScope, node: node.right }),
        ]);
      }

      case 'Or': {
        return t.tsUnionType([
          transform({ scope, parentScope, node: node.left }),
          transform({ scope, parentScope, node: node.right }),
        ]);
      }

      default: {
        throw new Error(`"${node.type}" not implemented yet`);
      }
    }
  }

  // Sanity.Schema.Document[]
  const rootScope = t.tsArrayType(
    t.tsTypeReference(
      t.tsQualifiedName(
        t.tsQualifiedName(t.identifier('Sanity'), t.identifier('Schema')),
        t.identifier('Document'),
      ),
    ),
  );

  return transform({
    node: root,
    parentScope: null,
    scope: rootScope,
  });
}
