export function wrapArray(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return {
        ...node,
        children: node.children.map(wrapArray),
      };
    }
    case 'Lazy': {
      return {
        type: 'Lazy',
        // TODO: will this cause any unnecessary churn or infinite loops?
        get: () => wrapArray(node.get()),
      };
    }
    default: {
      return {
        type: 'Array',
        of: node,
        // TODO: what about `undefined`s and `null`s?
        canBeNull: false,
        canBeUndefined: false,
      };
    }
  }
}
