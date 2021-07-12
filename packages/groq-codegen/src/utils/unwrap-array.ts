import { createStructure } from './create-structure';

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
      return createStructure({
        ...node,
        children: node.children.map(unwrapArray),
      });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => unwrapArray(node.get()),
        hashInput: ['UnwrapArray', node.hash],
      });
    }
    default: {
      return node;
    }
  }
}
