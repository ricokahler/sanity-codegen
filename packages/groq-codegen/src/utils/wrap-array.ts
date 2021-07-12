import { createStructure } from './create-structure';

export function wrapArray(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return createStructure({
        ...node,
        children: node.children.map(wrapArray),
      });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => wrapArray(node.get()),
        hashInput: ['WrapArray', node.hash],
      });
    }
    case 'Array': {
      // TODO: does this make sense?
      return node;
    }
    default: {
      return createStructure({
        type: 'Array',
        of: node,
        // TODO: what about `undefined`s and `null`s?
        canBeNull: false,
        canBeUndefined: false,
      });
    }
  }
}
