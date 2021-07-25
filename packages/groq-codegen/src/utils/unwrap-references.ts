import { createStructure } from './create-structure';

function unwrapLazy(n: Sanity.GroqCodegen.StructureNode) {
  switch (n.type) {
    case 'Lazy': {
      return n.get();
    }
    case 'And':
    case 'Or': {
      return createStructure({
        ...n,
        children: n.children.map(unwrapLazy),
      });
    }
    default: {
      return n;
    }
  }
}

export function unwrapReferences(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'Reference': {
      return unwrapLazy(node.to);
    }
    case 'And':
    case 'Or': {
      return createStructure({
        ...node,
        children: node.children.map(unwrapReferences),
      });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => unwrapReferences(node.get()),
        hashInput: ['UnwrapReferences', node.hash],
      });
    }
    default: {
      return node;
    }
  }
}
