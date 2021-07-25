import { createStructure } from './create-structure';

export function addNull(node: Sanity.GroqCodegen.StructureNode) {
  switch (node.type) {
    case 'Unknown': {
      return node;
    }
    case 'And':
    case 'Or': {
      return createStructure({
        ...node,
        children: node.children.map(addNull),
      });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => addNull(node.get()),
        hashInput: ['RemoveOptionalAddUndefined', node.hash],
      });
    }
    default: {
      return createStructure({
        ...node,
        canBeNull: true,
      });
    }
  }
}
