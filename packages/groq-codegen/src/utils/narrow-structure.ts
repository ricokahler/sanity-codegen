import * as Groq from 'groq-js/dist/nodeTypes';
import { createStructure } from './create-structure';

// TODO: could include things like defined checks or narrow based on types
// TODO: also think about functions and how they could affect narrowing
//
// e.g. _type == 'foo' && defined(bar) would not accept structure nodes that
// don't `bar` and could mark `bar` as `canBeNull: false`
//
// e.g. description == 'hello' would not accept structure nodes that have the
// type of description as `number`
type LogicExprNode =
  | { type: 'And'; children: LogicExprNode[] }
  | { type: 'Or'; children: LogicExprNode[] }
  | { type: 'Not'; child: LogicExprNode }
  | { type: 'Literal'; value: boolean }
  | {
      type: 'SingleVariableEquality';
      variable: string;
      literal: string | number;
    }
  | { type: 'UnknownExpression'; originalExprNode: Groq.ExprNode };

/**
 * @internal
 *
 * An internal function that takes in an GROQ ExprNode and returns a normalized
 * `LogicExprNode` node used to evaluate against a set of types described by a
 * `StructureNode`
 *
 * @see `accept`
 */
export function transformExprNodeToLogicExpr(
  exprNode: Groq.ExprNode,
): LogicExprNode {
  switch (exprNode.type) {
    case 'And':
    case 'Or': {
      return {
        type: 'And',
        children: [
          transformExprNodeToLogicExpr(exprNode.left),
          transformExprNodeToLogicExpr(exprNode.right),
        ],
      };
    }

    case 'Not': {
      return {
        type: 'Not',
        child: transformExprNodeToLogicExpr(exprNode.base),
      };
    }

    case 'OpCall': {
      switch (exprNode.op) {
        case '!=': {
          return {
            type: 'Not',
            child: transformExprNodeToLogicExpr({ ...exprNode, op: '==' }),
          };
        }
        case '==': {
          // TODO consider AccessAttribute['base'] case
          // e.g. the `_type` of `_type == 'foo'`
          const variableIdentifierNode = [exprNode.left, exprNode.right].find(
            (n): n is Extract<Groq.ExprNode, { type: 'AccessAttribute' }> =>
              n.type === 'AccessAttribute',
          );

          // e.g. the `'foo''` of `_type == 'foo'`
          const valueNode = [exprNode.left, exprNode.right].find(
            (n): n is Extract<Groq.ExprNode, { type: 'Value' }> =>
              n.type === 'Value',
          );

          if (
            variableIdentifierNode &&
            valueNode &&
            (typeof valueNode.value === 'string' ||
              typeof valueNode.value === 'number')
          ) {
            return {
              type: 'SingleVariableEquality',
              variable: variableIdentifierNode.name,
              literal: valueNode.value,
            };
          }

          return {
            type: 'UnknownExpression',
            originalExprNode: exprNode,
          };
        }

        case 'in': {
          if (exprNode.right.type === 'Array') {
            return {
              type: 'Or',
              children: exprNode.right.elements.map(({ value, isSplat }) =>
                transformExprNodeToLogicExpr({
                  ...exprNode,
                  op: isSplat ? 'in' : '==',
                  right: value,
                }),
              ),
            };
          }

          return {
            type: 'UnknownExpression',
            originalExprNode: exprNode,
          };
        }

        default: {
          return { type: 'UnknownExpression', originalExprNode: exprNode };
        }
      }
    }

    default: {
      return { type: 'UnknownExpression', originalExprNode: exprNode };
    }
  }
}

// TODO: probably needs to be memoized
function accept(
  node: Sanity.GroqCodegen.StructureNode,
  filter: LogicExprNode,
): boolean | null {
  switch (filter.type) {
    case 'And': {
      return filter.children
        .map((child) => accept(node, child))
        .filter((result): result is boolean => typeof result === 'boolean')
        .every((result) => result);
    }
    case 'Or': {
      return (
        filter.children
          .map((child) => accept(node, child))
          .filter((result): result is boolean => typeof result === 'boolean')
          // TODO: what happens when the filter removes all items?
          // is it okay that some returns false?
          .some((result) => result)
      );
    }
    case 'Not': {
      const result = accept(node, filter.child);
      if (typeof result === 'boolean') return !result;
      return null;
    }
    case 'Literal': {
      return filter.value;
    }
    case 'SingleVariableEquality': {
      switch (node.type) {
        case 'Lazy': {
          throw new Error('TODO');
        }
        case 'Reference': {
          throw new Error('TODO');
        }
        case 'And': {
          return node.children
            .map((child) => accept(child, filter))
            .filter((result): result is boolean => typeof result === 'boolean')
            .every((result) => result);
        }
        case 'Or': {
          return node.children
            .map((child) => accept(child, filter))
            .filter((result): result is boolean => typeof result === 'boolean')
            .some((result) => result);
        }
        case 'Boolean':
        case 'Intrinsic':
        case 'Number':
        case 'String':
        case 'Array': {
          return false;
        }
        case 'Object': {
          return !!node.properties.find((prop) => {
            return (
              prop.key === filter.variable &&
              (prop.value.type === 'String' || prop.value.type === 'Number') &&
              prop.value.value === filter.literal
            );
          });
        }
        case 'Unknown': {
          throw new Error('TODO');
        }
        default: {
          // @ts-expect-error
          throw new Error(`${node.type} not implemented yet`);
        }
      }
    }

    case 'UnknownExpression': {
      return null;
    }

    default: {
      // @ts-expect-error
      throw new Error(`${filter.type} not implemented yet`);
    }
  }
}

function narrow(
  node: Sanity.GroqCodegen.StructureNode,
  filter: LogicExprNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => narrow(node.get(), filter),
        hashInput: ['Narrow', node.hash],
      });
    }

    case 'Reference': {
      // TODO: think about this
      return node;
    }

    case 'Or': {
      return createStructure({
        ...node,
        children: node.children
          .filter((n) => accept(n, filter))
          .map((n) => narrow(n, filter)),
      });
    }

    case 'And': {
      return createStructure({
        ...node,
        children: node.children.map((n) => narrow(n, filter)),
      });
    }

    case 'Array': {
      return createStructure({
        ...node,
        of: narrow(node.of, filter),
      });
    }

    case 'Object': {
      return createStructure({
        ...node,
        // TODO (future): the GROQ filter may remove some properties
        properties: node.properties.map(({ key, value }) => ({
          key,
          value: narrow(value, filter),
        })),
      });
    }

    case 'Boolean':
    case 'Intrinsic':
    case 'Number':
    case 'String':
    case 'Unknown': {
      return node;
    }

    default: {
      // TODO better comment
      // @ts-expect-error
      throw new Error(node.type);
    }
  }
}

export function narrowStructure(
  node: Sanity.GroqCodegen.StructureNode,
  filter: Groq.ExprNode,
) {
  return narrow(node, transformExprNodeToLogicExpr(filter));
}
