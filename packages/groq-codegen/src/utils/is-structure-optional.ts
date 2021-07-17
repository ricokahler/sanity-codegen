export function isStructureOptional(
  structure: Sanity.GroqCodegen.StructureNode,
): boolean {
  return isOptional(structure, new Set());
}

function isOptional(
  node: Sanity.GroqCodegen.StructureNode,
  visitedNodes: Set<string>,
) {
  switch (node.type) {
    case 'Object':
    case 'String':
    case 'Number':
    case 'Boolean':
    case 'Reference':
    case 'Intrinsic':
    case 'Array': {
      return node.canBeOptional;
    }
    case 'And':
    case 'Or': {
      return node.children.every((child) => isOptional(child, visitedNodes));
    }
    case 'Lazy': {
      const got = node.get();
      if (visitedNodes.has(got.hash)) return false;

      return isOptional(node.get(), new Set([...visitedNodes, got.hash]));
    }
    case 'Unknown': {
      return false;
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
