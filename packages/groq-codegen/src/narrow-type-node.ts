import * as Groq from 'groq-js/dist/nodeTypes';

// TODO: could include things like defined checks or narrow based on types
// TODO: also think about functions and how they could affect narrowing
//
// e.g. _type == 'foo' && defined(bar) would not accept type nodes that don't
// `bar` and could mark `bar` as `canBeNull: false`
//
// e.g. description == 'hello' would not accept type nodes that have the type of
// description as `number`
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
 * `TypeNode`
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
  typeNode: Sanity.Groq.TypeNode,
  filter: LogicExprNode,
): boolean | null {
  switch (filter.type) {
    case 'And': {
      return filter.children
        .map((child) => accept(typeNode, child))
        .filter((result): result is boolean => typeof result === 'boolean')
        .every((result) => result);
    }
    case 'Or': {
      return (
        filter.children
          .map((child) => accept(typeNode, child))
          .filter((result): result is boolean => typeof result === 'boolean')
          // TODO: what happens when the filter removes all items?
          // is it okay that some returns false?
          .some((result) => result)
      );
    }
    case 'Not': {
      const result = accept(typeNode, filter.child);
      if (typeof result === 'boolean') return !result;
      return null;
    }
    case 'Literal': {
      return filter.value;
    }
    case 'SingleVariableEquality': {
      switch (typeNode.type) {
        case 'Alias': {
          throw new Error('TODO');
        }
        case 'Reference': {
          throw new Error('TODO');
        }
        case 'And': {
          return typeNode.children
            .map((child) => accept(child, filter))
            .filter((result): result is boolean => typeof result === 'boolean')
            .every((result) => result);
        }
        case 'Or': {
          return typeNode.children
            .map((child) => accept(child, filter))
            .filter((result): result is boolean => typeof result === 'boolean')
            .some((result) => result);
        }
        case 'Boolean':
        case 'Intrinsic':
        case 'Number':
        case 'String': {
          return false;
        }
        case 'Object': {
          return !!typeNode.properties.find((prop) => {
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
          throw new Error(`${typeNode.type} not implemented yet`);
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
  typeNode: Sanity.Groq.TypeNode,
  filter: LogicExprNode,
): Sanity.Groq.TypeNode {
  switch (typeNode.type) {
    case 'Alias': {
      // TODO: this may create infinite loops
      return narrow(typeNode.get(), filter);
    }

    case 'Reference': {
      // TODO: think about this
      return typeNode;
    }

    case 'Or': {
      return {
        ...typeNode,
        children: typeNode.children
          .filter((n) => accept(n, filter))
          .map((n) => narrow(n, filter)),
      };
    }

    case 'And': {
      return {
        ...typeNode,
        children: typeNode.children.map((n) => narrow(n, filter)),
      };
    }

    case 'Object': {
      return {
        ...typeNode,
        // TODO (future): the GROQ filter may remove some properties
        properties: typeNode.properties.map(({ key, value }) => ({
          key,
          value: narrow(value, filter),
        })),
      };
    }

    case 'Boolean':
    case 'Intrinsic':
    case 'Number':
    case 'String':
    case 'Unknown': {
      return typeNode;
    }

    default: {
      // TODO better comment
      // @ts-expect-error
      throw new Error(typeNode.type);
    }
  }
}

export function narrowTypeNode(
  typeNode: Sanity.Groq.TypeNode,
  filter: Groq.ExprNode,
) {
  return narrow(typeNode, transformExprNodeToLogicExpr(filter));
}
