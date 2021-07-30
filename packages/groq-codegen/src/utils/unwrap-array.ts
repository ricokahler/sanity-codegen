import { createStructure } from './create-structure';
import { isStructure } from './is-structure';

export function unwrapArray(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  if (isStructure(node, (n) => ['Array', 'Tuple'].includes(n.type))) {
    return unwrap(node);
  }
  return node;
}

function unwrap(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'Array': {
      return node.of;
    }
    case 'Tuple': {
      return createStructure({ type: 'Or', children: node.elements });
    }
    case 'And':
    case 'Or': {
      return createStructure({
        ...node,
        children: node.children.map(unwrap),
      });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => unwrap(node.get()),
        hashInput: ['UnwrapArray', node.hash],
      });
    }
    default: {
      throw new Error(
        `unwrap-array found leaf node "${node.type}" but expected either Tuple Or Array. ` +
          `This is a bug in sanity-codegen, please open an issue.`,
      );
    }
  }
}
