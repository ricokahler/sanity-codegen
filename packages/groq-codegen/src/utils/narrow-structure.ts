import * as Groq from 'groq-js/dist/nodeTypes';
import { createStructure } from './create-structure';
import { objectHash, unorderedHash } from './hash';

// TODO: could include things like defined checks or narrow based on types
// TODO: also think about functions and how they could affect narrowing
//
// e.g. _type == 'foo' && defined(bar) would not accept structure nodes that
// don't `bar` and could mark `bar` as `canBeNull: false`
//
// e.g. description == 'hello' would not accept structure nodes that have the
// type of description as `number`
type LogicExprNode =
  | { type: 'And'; children: LogicExprNode[]; hash: string }
  | { type: 'Or'; children: LogicExprNode[]; hash: string }
  | { type: 'Not'; child: LogicExprNode; hash: string }
  | { type: 'Literal'; value: boolean; hash: 'true' | 'false' }
  | {
      type: 'SingleVariableEquality';
      variable: string;
      literal: string | number;
      hash: string;
    }
  | {
      type: 'UnknownExpression';
      originalExprNode: Groq.ExprNode;
      hash: 'unknown';
    };

/**
 * An internal function that takes in an GROQ ExprNode and returns a normalized
 * `LogicExprNode` node used to evaluate against a set of types described by a
 * `StructureNode`
 *
 * @see `accept`
 */
export function transformExprNodeToLogicExpr(
  groqNode: Groq.ExprNode,
): LogicExprNode {
  switch (groqNode.type) {
    case 'And':
    case 'Or': {
      const children = [
        transformExprNodeToLogicExpr(groqNode.left),
        transformExprNodeToLogicExpr(groqNode.right),
      ];
      return {
        type: groqNode.type,
        children,
        hash: objectHash([
          groqNode.type,
          unorderedHash(children.map((i) => i.hash)),
        ]),
      };
    }

    case 'Group': {
      return transformExprNodeToLogicExpr(groqNode.base);
    }

    case 'Not': {
      const child = transformExprNodeToLogicExpr(groqNode.base);
      return {
        type: 'Not',
        child,
        hash: objectHash(['Not', child.hash]),
      };
    }

    case 'OpCall': {
      switch (groqNode.op) {
        case '!=': {
          const child = transformExprNodeToLogicExpr({ ...groqNode, op: '==' });
          return {
            type: 'Not',
            child,
            hash: objectHash(['Not', child.hash]),
          };
        }
        case '==': {
          const variableIdentifierNode = [groqNode.left, groqNode.right].find(
            (n): n is Groq.AccessAttributeNode => n.type === 'AccessAttribute',
          );

          // TODO consider this case
          // e.g. `base._type == 'foo'`
          if (variableIdentifierNode?.base) {
            return {
              type: 'UnknownExpression',
              originalExprNode: groqNode,
              hash: 'unknown',
            };
          }

          // e.g. the `'foo''` of `_type == 'foo'`
          const valueNode = [groqNode.left, groqNode.right].find(
            (n): n is Extract<Groq.ExprNode, { type: 'Value' }> =>
              n.type === 'Value',
          );

          if (
            variableIdentifierNode &&
            valueNode &&
            (typeof valueNode.value === 'string' ||
              typeof valueNode.value === 'number')
          ) {
            const result = {
              variable: variableIdentifierNode.name,
              literal: valueNode.value,
            };

            return {
              type: 'SingleVariableEquality',
              ...result,
              hash: objectHash(['SingleVariableEquality', result]),
            };
          }

          return {
            type: 'UnknownExpression',
            originalExprNode: groqNode,
            hash: 'unknown',
          };
        }

        case 'in': {
          if (groqNode.right.type === 'Array') {
            const children = groqNode.right.elements.map(({ value, isSplat }) =>
              transformExprNodeToLogicExpr({
                ...groqNode,
                op: isSplat ? 'in' : '==',
                right: value,
              }),
            );

            return {
              type: 'Or',
              children,
              hash: objectHash([
                'Or',
                unorderedHash(children.map((i) => i.hash)),
              ]),
            };
          }

          return {
            type: 'UnknownExpression',
            originalExprNode: groqNode,
            hash: 'unknown',
          };
        }

        default: {
          return {
            type: 'UnknownExpression',
            originalExprNode: groqNode,
            hash: 'unknown',
          };
        }
      }
    }

    case 'Value': {
      if (groqNode.value === false) {
        return {
          type: 'Literal',
          hash: 'false',
          value: false,
        };
      }

      if (groqNode.value === true) {
        return {
          type: 'Literal',
          hash: 'true',
          value: true,
        };
      }

      return {
        type: 'UnknownExpression',
        originalExprNode: groqNode,
        hash: 'unknown',
      };
    }

    default: {
      return {
        type: 'UnknownExpression',
        originalExprNode: groqNode,
        hash: 'unknown',
      };
    }
  }
}

const withMemo = <
  Fn extends (
    node: Sanity.GroqCodegen.StructureNode,
    condition: LogicExprNode,
    visitedNodes: Set<string>,
  ) => any,
>(
  fn: Fn,
): Fn => {
  const cache = new Map<string, any>();

  return ((node, condition, visitedNodes) => {
    const key = `${node.hash}__${condition.hash}`;
    if (cache.has(key)) return cache.get(key);

    const result = fn(node, condition, visitedNodes);
    cache.set(key, result);
    return result;
  }) as Fn;
};

export const accept = withMemo(
  (structure, condition, visitedNodes): 'yes' | 'no' | 'unknown' => {
    switch (condition.type) {
      case 'And': {
        const results = condition.children.map((child) =>
          accept(structure, child, visitedNodes),
        );

        let foundUnknown = false;
        for (const result of results) {
          if (result === 'no') return 'no';
          if (result === 'unknown') foundUnknown = true;
        }
        if (foundUnknown) return 'unknown';
        return 'yes';
      }
      case 'Or': {
        const results = condition.children.map((child) =>
          accept(structure, child, visitedNodes),
        );

        let foundUnknown = false;
        for (const result of results) {
          if (result === 'yes') return 'yes';
          if (result === 'unknown') foundUnknown = true;
        }
        if (foundUnknown) return 'unknown';
        return 'no';
      }
      case 'Not': {
        const result = accept(structure, condition.child, visitedNodes);
        if (result === 'yes') return 'no';
        if (result === 'no') return 'yes';
        return 'unknown';
      }
      case 'Literal': {
        return condition.value ? 'yes' : 'no';
      }
      case 'SingleVariableEquality': {
        switch (structure.type) {
          case 'Lazy': {
            const got = structure.get();
            if (visitedNodes.has(got.hash)) return 'no';
            return accept(got, condition, new Set([...visitedNodes, got.hash]));
          }
          case 'And': {
            const results = structure.children.map((child) =>
              accept(child, condition, visitedNodes),
            );

            for (const result of results) {
              if (result === 'unknown') return 'unknown';
              if (result === 'no') return 'no';
            }

            return 'yes';
          }
          case 'Or': {
            const results = structure.children.map((child) =>
              accept(child, condition, visitedNodes),
            );

            for (const result of results) {
              if (result === 'unknown') return 'unknown';
              if (result === 'yes') return 'yes';
            }

            return 'no';
          }
          case 'Boolean':
          case 'Intrinsic':
          case 'Number':
          case 'String':
          case 'Tuple':
          case 'Array': {
            return 'no';
          }
          case 'Reference': {
            // TODO: this could be updated to fallback to an object structure
            // with {_type: 'reference', _ref: string}
            return 'no';
          }
          case 'Object': {
            const matchingProperty = structure.properties.find(
              (property) => property.key === condition.variable,
            );

            if (!matchingProperty) return 'unknown';

            if (
              'value' in matchingProperty.value &&
              matchingProperty.value.value === condition.literal
            ) {
              return 'yes';
            }

            return 'no';
          }
          case 'Unknown': {
            return 'unknown';
          }
          default: {
            // @ts-expect-error
            throw new Error(`${structure.type} not implemented yet`);
          }
        }
      }

      case 'UnknownExpression': {
        return 'unknown';
      }

      default: {
        // @ts-expect-error
        throw new Error(`${condition.type} not implemented yet`);
      }
    }
  },
);

function narrowOr(
  node: Sanity.GroqCodegen.StructureNode,
  condition: LogicExprNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'Or': {
      const result = node.children
        .filter((child) => accept(child, condition, new Set()) !== 'no')
        .map((child) => narrowOr(child, condition));

      if (!result.length) {
        return createStructure({ type: 'Unknown' });
      }

      return createStructure({ type: 'Or', children: result });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => narrowOr(node.get(), condition),
        hashInput: ['NarrowOr', node.hash],
      });
    }
    default: {
      switch (accept(node, condition, new Set())) {
        case 'yes':
          return node;
        case 'no':
          return createStructure({ type: 'Unknown' });
        case 'unknown':
          return node;
      }
    }
  }
}

function narrow(
  node: Sanity.GroqCodegen.StructureNode,
  condition: LogicExprNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => narrow(node.get(), condition),
        hashInput: ['Narrow', node.hash],
      });
    }

    case 'Or': {
      return narrowOr(node, condition);
    }

    case 'And': {
      // TODO: should intersections combine object properties?
      return createStructure({
        ...node,
        children: node.children.map((n) => narrow(n, condition)),
      });
    }

    default: {
      switch (accept(node, condition, new Set())) {
        case 'yes':
          return node;
        case 'unknown':
          // benefit of the doubt, leave the node in the structure
          return node;
        case 'no':
          return createStructure({ type: 'Unknown' });
      }
    }
  }
}

export function narrowStructure(
  node: Sanity.GroqCodegen.StructureNode,
  condition: Groq.ExprNode,
) {
  return narrow(node, transformExprNodeToLogicExpr(condition));
}
