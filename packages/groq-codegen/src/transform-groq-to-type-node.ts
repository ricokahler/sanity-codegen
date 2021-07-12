import * as Groq from 'groq-js/dist/nodeTypes';
import { narrowTypeNode } from './narrow-type-node';
import { accessTypeNodeAttribute } from './access-type-node-attribute';
import { getEverything } from './transform-schema-to-type-node';
import { unwrapReferences } from './unwrap-references';

interface TransformGroqToTypeNodeOptions {
  node: Groq.ExprNode;
  schema: Sanity.SchemaDef.Schema;
  scopes: Sanity.Groq.TypeNode[];
}

export function transformGroqToTypeNode({
  node,
  schema,
  scopes,
}: TransformGroqToTypeNodeOptions): Sanity.Groq.TypeNode {
  const scope = scopes[scopes.length - 1] as Sanity.Groq.TypeNode | undefined;

  switch (node.type) {
    case 'Everything': {
      return getEverything(schema);
    }

    case 'Map': {
      const baseResult = transformGroqToTypeNode({
        node: node.base,
        scopes,
        schema,
      });

      const exprResult = transformGroqToTypeNode({
        node: node.expr,
        scopes: [...scopes, baseResult],
        schema,
      });

      return exprResult;
    }

    case 'Filter': {
      // e.g. the return type from everything
      const baseResult = transformGroqToTypeNode({
        node: node.base,
        scopes,
        schema,
      });

      return narrowTypeNode(baseResult, node.expr);
    }

    case 'This': {
      return scope || { type: 'Unknown', isArray: false };
    }

    case 'OpCall': {
      throw new Error('TODO not implemented yet');
    }

    case 'AccessElement': {
      const baseResult = transformGroqToTypeNode({
        node: node.base,
        scopes,
        schema,
      });

      if (baseResult.type === 'Unknown') {
        return { type: 'Unknown', isArray: false };
      }

      if (baseResult.type === 'Alias') {
        throw new Error('TODO');
      }

      return {
        ...baseResult,
        isArray: false,
        canBeUndefined: true,
      };
    }

    case 'Projection': {
      // e.g. the result of a filter
      const baseResult = transformGroqToTypeNode({
        node: node.base,
        scopes,
        schema,
      });

      const exprResult = transformGroqToTypeNode({
        node: node.expr,
        scopes: [...scopes, { ...baseResult, isArray: false }],
        schema,
      });

      return {
        ...exprResult,
        isArray: baseResult.isArray,
      };
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
            value: transformGroqToTypeNode({
              node: attribute.value,
              schema,
              scopes,
            }),
          })),
        isArray: scope?.isArray || false,
      };
    }

    case 'Or': {
      return {
        type: 'Or',
        children: [
          transformGroqToTypeNode({ node: node.left, scopes, schema }),
          transformGroqToTypeNode({ node: node.right, scopes, schema }),
        ],
        isArray: scope?.isArray || false,
        // TODO: figure this out
        canBeUndefined: false,
        canBeNull: false,
      };
    }

    case 'AccessAttribute': {
      if (node.base) {
        const baseResult = transformGroqToTypeNode({
          node: node.base,
          scopes: scopes,
          schema,
        });

        const next = { ...node };
        delete next.base;

        return transformGroqToTypeNode({
          node: next,
          scopes: [...scopes, baseResult],
          schema,
        });
      }

      if (!scope) return { type: 'Unknown', isArray: false };

      return accessTypeNodeAttribute(scope, node.name);
    }

    case 'Deref': {
      const baseResult = transformGroqToTypeNode({
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
