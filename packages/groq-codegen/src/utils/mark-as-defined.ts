export function markAsDefined(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return { ...node, children: node.children.map(markAsDefined) };
    }
    case 'Lazy': {
      // TODO: will this cause infinite loops?
      return { type: 'Lazy', get: () => markAsDefined(node.get()) };
    }
    default: {
      if ('canBeUndefined' in node) return { ...node, canBeUndefined: false };
      return node;
    }
  }
}
