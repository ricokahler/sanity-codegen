import * as Groq from 'groq-js/dist/nodeTypes';
import { narrowStructure } from './utils';
import { transformSchemaToStructure } from './transform-schema-to-structure';
import {
  accessAttributeInStructure,
  unwrapArray,
  structureIsArray,
  wrapArray,
  unwrapReferences,
} from './utils';

export interface TransformGroqToStructureOptions {
  node: Groq.ExprNode;
  schema: Sanity.SchemaDef.Schema;
  scopes: Sanity.GroqCodegen.StructureNode[];
}

export function transformGroqToStructure({
  node,
  schema,
  scopes,
}: TransformGroqToStructureOptions): Sanity.GroqCodegen.StructureNode {
  const scope = scopes[scopes.length - 1] as
    | Sanity.GroqCodegen.StructureNode
    | undefined;

  switch (node.type) {
    case 'Everything': {
      return transformSchemaToStructure({ schema });
    }

    case 'Map': {
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        schema,
      });

      const exprResult = transformGroqToStructure({
        node: node.expr,
        scopes: [...scopes, baseResult],
        schema,
      });

      return exprResult;
    }

    case 'Filter': {
      // e.g. the return type from everything
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        schema,
      });

      return narrowStructure(baseResult, node.expr);
    }

    case 'This': {
      return scope || { type: 'Unknown' };
    }

    case 'OpCall': {
      throw new Error('TODO not implemented yet');
    }

    case 'AccessElement': {
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        schema,
      });

      if (baseResult.type === 'Unknown') {
        return { type: 'Unknown' };
      }

      return unwrapArray(baseResult);
    }

    case 'Projection': {
      // e.g. the result of a filter
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        schema,
      });

      const baseResultHadArray = structureIsArray(baseResult);

      const exprResult = transformGroqToStructure({
        node: node.expr,
        scopes: [
          ...scopes,
          baseResultHadArray ? unwrapArray(baseResult) : baseResult,
        ],
        schema,
      });

      return baseResultHadArray ? wrapArray(exprResult) : exprResult;
    }

    case 'Object': {
      return {
        type: 'Object',
        canBeNull: false,
        canBeUndefined: false,
        properties: node.attributes
          .filter(
            (attribute): attribute is Groq.ObjectAttributeValueNode =>
              attribute.type === 'ObjectAttributeValue',
          )
          .map((attribute) => ({
            key: attribute.name,
            value: transformGroqToStructure({
              node: attribute.value,
              schema,
              scopes,
            }),
          })),
      };
    }

    case 'Or': {
      return {
        type: 'Or',
        children: [
          transformGroqToStructure({ node: node.left, scopes, schema }),
          transformGroqToStructure({ node: node.right, scopes, schema }),
        ],
      };
    }

    case 'AccessAttribute': {
      if (node.base) {
        const baseResult = transformGroqToStructure({
          node: node.base,
          scopes: scopes,
          schema,
        });

        const next = { ...node };
        delete next.base;

        return transformGroqToStructure({
          node: next,
          scopes: [...scopes, baseResult],
          schema,
        });
      }

      if (!scope) return { type: 'Unknown' };

      return accessAttributeInStructure(scope, node.name);
    }

    case 'Deref': {
      const baseResult = transformGroqToStructure({
        node: node.base,
        scopes,
        schema,
      });

      return unwrapReferences(baseResult);
    }

    default: {
      throw new Error(`"${node.type}" not implemented yet.`);
    }
  }
}
