import * as Groq from 'groq-js/dist/nodeTypes';
import { narrowStructure, createStructure } from './utils';
import { transformSchemaToStructure } from './transform-schema-to-structure';
import {
  accessAttributeInStructure,
  unwrapArray,
  isStructureArray,
  wrapArray,
  unwrapReferences,
  reduceObjectStructures,
} from './utils';

export interface TransformGroqToStructureOptions {
  /**
   * A GROQ AST node from `groq-js`'s `parse` method
   */
  node: Groq.ExprNode;
  /**
   * An extracted and normalized schema result from the
   * `@sanity-codegen/schema-codegen` package.
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

      return narrowStructure(baseResult, node.expr);
    }

    case 'This': {
      return scope || createStructure({ type: 'Unknown' });
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

      return unwrapArray(baseResult);
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

      return baseResultHadArray ? wrapArray(exprResult) : exprResult;
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
                  properties: [{ key: attribute.name, value }],
                });

                return reduceObjectStructures(acc, singlePropertyObject);
              }
              case 'ObjectSplat': {
                const value = transformGroqToStructure({
                  node: attribute.value,
                  normalizedSchema,
                  scopes,
                });

                return reduceObjectStructures(acc, value);
              }
              case 'ObjectConditionalSplat': {
                console.warn('Conditional splats are not current supported');
                return createStructure({ type: 'Unknown' });
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

    case 'Or': {
      return createStructure({
        type: 'Or',
        children: [
          transformGroqToStructure({
            node: node.left,
            scopes,
            normalizedSchema,
          }),
          transformGroqToStructure({
            node: node.right,
            scopes,
            normalizedSchema,
          }),
        ],
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
    case 'ArrayCoerce': {
      return transformGroqToStructure({
        node: node.base,
        scopes,
        normalizedSchema,
      });
    }

    default: {
      console.warn(`"${node.type}" not implemented yet.`);

      return createStructure({ type: 'Unknown' });
    }
  }
}
