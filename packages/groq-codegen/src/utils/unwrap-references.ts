import { createStructure } from './create-structure';
import { isStructureArray } from './is-structure-array';
import { unwrapArray } from './unwrap-array';
import { wrapArray } from './wrap-array';

function unwrapLazy(n: Sanity.GroqCodegen.StructureNode) {
  switch (n.type) {
    case 'Lazy': {
      const got = n.get();
      if (n.hash === got.hash) {
        throw new Error(
          'Found self-referencing node when trying to unwrap a reference. ' +
            'This is most likely a bug in sanity codegen. Please open an issue.',
        );
      }
      return got;
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
    case 'Array': {
      return isStructureArray(node)
        ? wrapArray(unwrapReferences(unwrapArray(node.of)))
        : unwrapReferences(node.of);
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
