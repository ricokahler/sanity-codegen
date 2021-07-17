import { createStructure } from './create-structure';

export function addNull(node: Sanity.GroqCodegen.StructureNode) {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return createStructure({
        ...node,
        children: node.children.map(addNull),
      });
    }
    case 'Object':
    case 'Array':
    case 'String':
    case 'Number':
    case 'Boolean':
    case 'Intrinsic':
    case 'Reference': {
      return createStructure({
        ...node,
        canBeNull: true,
      });
    }
    case 'Unknown': {
      return node;
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => addNull(node.get()),
        hashInput: ['RemoveOptionalAddUndefined', node.hash],
      });
    }
    default: {
      throw new Error(
        // @ts-expect-error this should never happen because the above covers
        // all cases
        `Node type "${node.type}" is not implemented in isOptional`,
      );
    }
  }
}
