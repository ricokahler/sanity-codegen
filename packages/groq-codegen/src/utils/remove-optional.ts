import { createStructure } from './create-structure';

export function removeOptional(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return createStructure({
        ...node,
        children: node.children.map(removeOptional),
      });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => removeOptional(node.get()),
        hashInput: ['MarkAsDefined', node.hash],
      });
    }
    case 'Unknown': {
      return node;
    }
    default: {
      return createStructure({ ...node, canBeOptional: false });
    }
  }
}
