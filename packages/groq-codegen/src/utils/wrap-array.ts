import { createStructure } from './create-structure';

export function wrapArray(
  node: Sanity.GroqCodegen.StructureNode,
  options: { canBeNull: boolean; canBeOptional: boolean },
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return createStructure({
        ...node,
        children: node.children.map((child) => wrapArray(child, options)),
      });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => wrapArray(node.get(), options),
        hashInput: ['WrapArray', node.hash],
      });
    }
    default: {
      return createStructure({
        ...options,
        type: 'Array',
        of: node,
      });
    }
  }
}
