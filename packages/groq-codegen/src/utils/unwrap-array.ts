export function unwrapArray(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'Array': {
      // TODO: what about `undefined`s and `null`s?
      return node.of;
    }
    case 'And':
    case 'Or': {
      return {
        ...node,
        children: node.children.map(unwrapArray),
      };
    }
    case 'Lazy': {
      // TODO: will this cause any unnecessary churn or infinite loops?
      return {
        type: 'Lazy',
        get: () => unwrapArray(node.get()),
      };
    }
    default: {
      return node;
    }
  }
}
