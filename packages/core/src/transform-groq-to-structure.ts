import type { parse } from 'groq-js';
import {
  addNull,
  removeOptional,
  addOptionalToProperties,
  narrowStructure,
  createStructure,
  isStructureOptional,
  isStructureNull,
  isStructureArray,
  isStructureBoolean,
  isStructureNumber,
  isStructureString,
  accessAttributeInStructure,
  unwrapArray,
  wrapArray,
  unwrapReferences,
  reduceObjectStructures,
  isStructureObject,
} from './utils';
import { transformSchemaToStructure } from './transform-schema-to-structure';

type ExprNode = ReturnType<typeof parse>;

export interface TransformGroqToStructureOptions {
  /**
   * A GROQ AST node from `groq-js`'s `parse` method
   */
  node: ExprNode;
  /**
   * An extracted and normalized schema result from the
   * `@sanity-codegen/extractor` package.
   */
  normalizedSchema: Sanity.SchemaDef.Schema;
  /**
   * An array of scopes. These scopes stack as the GROQ AST is traversed and new
   * contexts are created. This should be an empty array to start with.
   */
  scopes: Sanity.GroqCodegen.StructureNode[];
}

/**
 * Used to transform a GROQ AST (e.g. `ExprNode`) into a `StructureNode`
 */
export function transformGroqToStructure({
  node,
  normalizedSchema,
  scopes,
}: TransformGroqToStructureOptions): Sanity.GroqCodegen.StructureNode {
  const scope = scopes[scopes.length - 1] as
    | Sanity.GroqCodegen.StructureNode
    | undefined;

  switch (node.type) {
    case 'Everything': {
      return transformSchemaToStructure({ normalizedSchema: normalizedSchema });
    }

    // TODO: are these actually the same?
    case 'Map':
    case 'FlatMap': {
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        normalizedSchema,
      });

      const exprResult = transformGroqToStructure({
        node: node.expr,
        scopes: [...scopes, baseResult],
        normalizedSchema,
      });

      return exprResult;
    }

    case 'Filter': {
      // e.g. the return type from everything
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        normalizedSchema,
      });

      if (!isStructureArray(baseResult)) {
        // TODO: warn that filter was used on non-array base
        return createStructure({ type: 'Unknown' });
      }

      return wrapArray(narrowStructure(unwrapArray(baseResult), node.expr), {
        canBeOptional: false,
        canBeNull: isStructureNull(baseResult),
      });
    }

    case 'This': {
      // TODO: could warn here
      return scope || createStructure({ type: 'Unknown' });
    }

    case 'Parent': {
      // TODO: support parent `n` operator
      const parentScope = scopes[scopes.length - 2];
      // TODO: could warn here
      return parentScope || createStructure({ type: 'Unknown' });
    }

    case 'Parameter': {
      // Not very easy to know what the intended type of a parameter is so we
      // convert it to `Unknown`. For some cases (such as filtering), this
      // shouldn't have an impact on the resulting types
      return createStructure({ type: 'Unknown' });
    }

    case 'AccessElement': {
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        normalizedSchema,
      });

      if (baseResult.type === 'Unknown') {
        return createStructure({ type: 'Unknown' });
      }

      return addNull(removeOptional(unwrapArray(baseResult)));
    }

    case 'Projection': {
      // e.g. the result of a filter
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        normalizedSchema,
      });

      const baseResultHadArray = isStructureArray(baseResult);

      const exprResult = transformGroqToStructure({
        node: node.expr,
        scopes: [
          ...scopes,
          baseResultHadArray ? unwrapArray(baseResult) : baseResult,
        ],
        normalizedSchema,
      });

      return baseResultHadArray
        ? wrapArray(exprResult, {
            canBeNull: isStructureNull(baseResult),
            canBeOptional: isStructureOptional(baseResult),
          })
        : exprResult;
    }

    case 'Object': {
      if (!node.attributes.length) {
        return createStructure({ type: 'Unknown' });
      }

      const emptyObject = createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties: [],
      });

      const combinedObject =
        node.attributes.reduce<Sanity.GroqCodegen.StructureNode>(
          (acc, attribute) => {
            switch (attribute.type) {
              case 'ObjectAttributeValue': {
                const value = transformGroqToStructure({
                  node: attribute.value,
                  normalizedSchema,
                  scopes,
                });

                const singlePropertyObject = createStructure({
                  type: 'Object',
                  canBeNull: false,
                  canBeOptional: false,
                  properties: [
                    {
                      key: attribute.name,
                      value: isStructureOptional(value)
                        ? addNull(removeOptional(value))
                        : value,
                    },
                  ],
                });

                return reduceObjectStructures(
                  acc,
                  singlePropertyObject,
                  'replace',
                );
              }
              case 'ObjectSplat': {
                const value = transformGroqToStructure({
                  node: attribute.value,
                  normalizedSchema,
                  scopes,
                });

                return reduceObjectStructures(acc, value, 'replace');
              }
              case 'ObjectConditionalSplat': {
                const value = transformGroqToStructure({
                  node: attribute.value,
                  scopes,
                  normalizedSchema,
                });

                return reduceObjectStructures(
                  acc,
                  addOptionalToProperties(value),
                  'union',
                );
              }
              default: {
                console.warn(
                  // @ts-expect-error `attribute` should be of type never
                  `Found unsupported object attribute type "${attribute.type}"`,
                );
                return createStructure({ type: 'Unknown' });
              }
            }
          },
          emptyObject,
        );

      return combinedObject;
    }

    case 'Select': {
      const children = node.alternatives.map((alternative) =>
        transformGroqToStructure({
          node: alternative.value,
          scopes,
          normalizedSchema,
        }),
      );

      if (node.fallback) {
        children.push(
          transformGroqToStructure({
            node: node.fallback,
            scopes,
            normalizedSchema,
          }),
        );
      }

      return createStructure({ type: 'Or', children });
    }

    case 'Array': {
      // if there is a splat in the array literal then…
      if (node.elements.some((element) => element.isSplat)) {
        return createStructure({
          // …we can't map to tuple type
          type: 'Array',
          canBeNull: false,
          canBeOptional: false,
          of: createStructure({
            type: 'Or',
            children: node.elements.map((element) => {
              if (element.isSplat) {
                return unwrapArray(
                  transformGroqToStructure({
                    node: element.value,
                    scopes,
                    normalizedSchema,
                  }),
                );
              }

              return transformGroqToStructure({
                node: element.value,
                scopes,
                normalizedSchema,
              });
            }),
          }),
        });
      }

      // if there are no splats found, we can list each type out as a tuple
      // to allow for better DX with decomposition
      return createStructure({
        type: 'Tuple',
        canBeNull: false,
        canBeOptional: false,
        elements: node.elements.map((element) =>
          transformGroqToStructure({
            node: element.value,
            scopes,
            normalizedSchema,
          }),
        ),
      });
    }

    case 'AccessAttribute': {
      if (node.base) {
        const baseResult = transformGroqToStructure({
          node: node.base,
          scopes: scopes,
          normalizedSchema,
        });

        const next = { ...node };
        delete next.base;

        return transformGroqToStructure({
          node: next,
          scopes: [...scopes, baseResult],
          normalizedSchema,
        });
      }

      if (!scope) return createStructure({ type: 'Unknown' });

      return accessAttributeInStructure(scope, node.name);
    }

    case 'Deref': {
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        normalizedSchema,
      });

      return unwrapReferences(baseResult);
    }

    case 'Slice':
    case 'Group':
    case 'ArrayCoerce':
    case 'Asc':
    case 'Desc': {
      return transformGroqToStructure({
        node: node.base,
        scopes,
        normalizedSchema,
      });
    }

    case 'Value': {
      switch (typeof node.value) {
        case 'string': {
          return createStructure({
            type: 'String',
            canBeNull: false,
            canBeOptional: false,
            value: node.value,
          });
        }
        case 'number': {
          return createStructure({
            type: 'Number',
            canBeNull: false,
            canBeOptional: false,
            value: node.value,
          });
        }
        case 'boolean': {
          return createStructure({
            type: 'Boolean',
            canBeNull: false,
            canBeOptional: false,
          });
        }
        default: {
          return createStructure({ type: 'Unknown' });
        }
      }
    }

    case 'Or':
    case 'And': {
      const leftResult = transformGroqToStructure({
        node: node.left,
        normalizedSchema,
        scopes,
      });

      const rightResult = transformGroqToStructure({
        node: node.right,
        normalizedSchema,
        scopes,
      });

      // TODO: could warn in these cases
      if (!isStructureBoolean(leftResult)) {
        return createStructure({ type: 'Unknown' });
      }

      if (!isStructureBoolean(rightResult)) {
        return createStructure({ type: 'Unknown' });
      }

      return createStructure({
        type: 'Boolean',
        canBeNull: isStructureNull(leftResult) || isStructureNull(rightResult),
        canBeOptional:
          isStructureOptional(leftResult) || isStructureOptional(rightResult),
      });
    }

    case 'Not': {
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        normalizedSchema,
      });

      if (!isStructureBoolean(baseResult)) {
        return createStructure({ type: 'Unknown' });
      }

      return createStructure({
        type: 'Boolean',
        canBeNull: isStructureNull(baseResult),
        canBeOptional: isStructureOptional(baseResult),
      });
    }

    case 'Pos':
    case 'Neg': {
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        normalizedSchema,
      });

      if (!isStructureNumber(baseResult)) {
        return createStructure({ type: 'Unknown' });
      }

      return createStructure({
        type: 'Number',
        canBeNull: isStructureNull(baseResult),
        canBeOptional: isStructureOptional(baseResult),
        value: null,
      });
    }

    case 'OpCall': {
      const leftStructure = transformGroqToStructure({
        node: node.left,
        scopes,
        normalizedSchema,
      });
      const rightStructure = transformGroqToStructure({
        node: node.right,
        scopes,
        normalizedSchema,
      });

      const canBeNull =
        isStructureNull(leftStructure) || isStructureNull(rightStructure);
      const canBeOptional =
        isStructureOptional(leftStructure) ||
        isStructureOptional(rightStructure);

      switch (node.op) {
        case '*':
        case '**':
        case '-':
        case '/':
        case '%': {
          if (
            !isStructureNumber(leftStructure) ||
            !isStructureNumber(rightStructure)
          ) {
            return createStructure({ type: 'Unknown' });
          }

          return createStructure({
            type: 'Number',
            canBeNull,
            canBeOptional,
            value: null,
          });
        }
        case '<=':
        case '<':
        case '>':
        case '>=': {
          if (
            !isStructureNumber(leftStructure) ||
            !isStructureNumber(rightStructure)
          ) {
            return createStructure({ type: 'Unknown' });
          }

          return createStructure({
            type: 'Boolean',
            canBeNull:
              isStructureNull(leftStructure) || isStructureNull(rightStructure),
            canBeOptional:
              isStructureOptional(leftStructure) ||
              isStructureOptional(rightStructure),
          });
        }
        case '!=':
        case '==':
        case 'in':
        case 'match': {
          return createStructure({
            type: 'Boolean',
            canBeNull:
              isStructureNull(leftStructure) || isStructureNull(rightStructure),
            canBeOptional:
              isStructureOptional(leftStructure) ||
              isStructureOptional(rightStructure),
          });
        }
        case '+': {
          if (
            isStructureNumber(leftStructure) &&
            isStructureNumber(rightStructure)
          ) {
            return createStructure({
              type: 'Number',
              canBeNull,
              canBeOptional,
              value: null,
            });
          }

          if (
            isStructureString(leftStructure) &&
            isStructureString(rightStructure)
          ) {
            const leftStringStructure =
              leftStructure as Sanity.GroqCodegen.StringNode;
            const rightStringStructure =
              rightStructure as Sanity.GroqCodegen.StringNode;

            return createStructure({
              type: 'String',
              canBeNull,
              canBeOptional,
              value:
                leftStringStructure.value === null
                  ? null
                  : rightStringStructure.value === null
                  ? null
                  : `${leftStringStructure.value}${rightStringStructure.value}`,
            });
          }

          return createStructure({ type: 'Unknown' });
        }
        default: {
          throw new Error(
            `Found expected operator "${node.op}". Please open an issue.`,
          );
        }
      }
    }

    case 'InRange': {
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        normalizedSchema,
      });

      const leftResult = transformGroqToStructure({
        node: node.left,
        scopes,
        normalizedSchema,
      });

      const rightResult = transformGroqToStructure({
        node: node.right,
        scopes,
        normalizedSchema,
      });

      if (!isStructureNumber(baseResult)) {
        return createStructure({ type: 'Unknown' });
      }

      return createStructure({
        type: 'Boolean',
        canBeNull:
          isStructureNull(baseResult) ||
          isStructureNull(leftResult) ||
          isStructureNull(rightResult),
        canBeOptional:
          isStructureOptional(baseResult) ||
          isStructureOptional(leftResult) ||
          isStructureOptional(rightResult),
      });
    }

    case 'FuncCall': {
      switch (node.name) {
        case 'coalesce': {
          return createStructure({
            type: 'Or',
            children: node.args.map((arg) =>
              transformGroqToStructure({
                node: arg,
                scopes,
                normalizedSchema,
              }),
            ),
          });
        }

        case 'count': {
          if (node.args.length !== 1) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          const [base] = node.args;
          const baseResult = transformGroqToStructure({
            node: base,
            scopes,
            normalizedSchema,
          });

          if (!isStructureArray(baseResult)) {
            return createStructure({ type: 'Unknown' });
          }

          return createStructure({
            type: 'Number',
            canBeNull: isStructureNull(baseResult),
            canBeOptional: false,
            value: null,
          });
        }

        case 'defined':
        case 'references': {
          if (node.args.length !== 1) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          return createStructure({
            type: 'Boolean',
            canBeNull: false,
            canBeOptional: false,
          });
        }

        case 'identity': {
          if (node.args.length) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          // https://www.sanity.io/docs/groq-functions#ba5eef75ed4a
          return createStructure({
            type: 'String',
            canBeNull: false,
            canBeOptional: false,
            value: null,
          });
        }

        case 'length': {
          if (node.args.length !== 1) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          const [base] = node.args;
          const baseResult = transformGroqToStructure({
            node: base,
            scopes,
            normalizedSchema,
          });

          if (!isStructureArray(baseResult) && !isStructureString(baseResult)) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          return createStructure({
            type: 'Number',
            canBeNull:
              isStructureNull(baseResult) || isStructureOptional(baseResult),
            canBeOptional: false,
            value: null,
          });
        }

        case 'lower':
        case 'upper': {
          if (node.args.length !== 1) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          const [base] = node.args;
          const baseResult = transformGroqToStructure({
            node: base,
            scopes,
            normalizedSchema,
          });

          if (!isStructureString(baseResult)) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          return createStructure({
            type: 'String',
            canBeNull:
              isStructureNull(baseResult) || isStructureOptional(baseResult),
            canBeOptional: false,
            value:
              baseResult.type !== 'String'
                ? null
                : typeof baseResult.value !== 'string'
                ? null
                : node.name === 'upper'
                ? baseResult.value.toUpperCase()
                : baseResult.value.toLowerCase(),
          });
        }

        case 'now': {
          if (node.args.length) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          return createStructure({
            type: 'String',
            canBeNull: false,
            canBeOptional: false,
            value: null,
          });
        }

        case 'round': {
          if (node.args.length <= 0 || node.args.length > 2) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          const [first, second] = node.args.map((n) =>
            transformGroqToStructure({
              node: n,
              scopes,
              normalizedSchema,
            }),
          );

          if (!isStructureNumber(first) && !isStructureNumber(second)) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          return createStructure({
            type: 'Number',
            canBeNull: isStructureNull(first) || isStructureOptional(first),
            canBeOptional: false,
            value: null,
          });
        }

        default: {
          console.warn(
            `Function "${node.name}" is not currently supported in the given context. Please open an issue.`,
          );
          return createStructure({ type: 'Unknown' });
        }
      }
    }

    case 'PipeFuncCall': {
      switch (node.name) {
        case 'order': {
          const baseResult = transformGroqToStructure({
            node: node.base,
            scopes,
            normalizedSchema,
          });

          return baseResult;
        }
        case 'score': {
          const baseResult = transformGroqToStructure({
            node: node.base,
            scopes,
            normalizedSchema,
          });

          const baseIsArray = isStructureArray(baseResult);

          if (!baseIsArray) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          const arrayOf = unwrapArray(baseResult);
          if (!isStructureObject(arrayOf)) {
            // TODO: warn here
            return createStructure({ type: 'Unknown' });
          }

          const objectWithUnderscoreScore = createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
              {
                key: '_score',
                value: createStructure({
                  type: 'Number',
                  canBeNull: false,
                  canBeOptional: false,
                  value: null,
                }),
              },
            ],
          });

          return wrapArray(
            reduceObjectStructures(
              arrayOf,
              objectWithUnderscoreScore,
              'replace',
            ),
            {
              canBeNull: isStructureNull(baseResult),
              canBeOptional: isStructureOptional(baseResult),
            },
          );
        }
        default: {
          console.warn(
            `Pipped function "${node.name}" is not currently supported.`,
          );
          return createStructure({ type: 'Unknown' });
        }
      }
    }

    // TODO: implement these operators
    case 'Context':
    case 'Selector':
    case 'Tuple': {
      console.warn(`"${node.type}" not implemented yet.`);

      return createStructure({ type: 'Unknown' });
    }

    default: {
      // @ts-expect-error Should never happen because we support all nodes
      console.warn(`"${node.type}" not implemented yet.`);

      return createStructure({ type: 'Unknown' });
    }
  }
}
