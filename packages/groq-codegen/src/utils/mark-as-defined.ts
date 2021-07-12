import { createStructure } from './create-structure';

export function markAsDefined(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return createStructure({
        ...node,
        children: node.children.map(markAsDefined),
      });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => markAsDefined(node.get()),
        hashInput: ['MarkAsDefined', node.hash],
      });
    }
    case 'Unknown': {
      return node;
    }
    default: {
      return createStructure({ ...node, canBeUndefined: false });
    }
  }
}
