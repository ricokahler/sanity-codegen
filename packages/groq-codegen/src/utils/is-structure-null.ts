export function isStructureNull(
  structure: Sanity.GroqCodegen.StructureNode,
): boolean {
  return isNull(structure, new Set());
}

function isNull(
  node: Sanity.GroqCodegen.StructureNode,
  visitedNodes: Set<string>,
) {
  switch (node.type) {
    case 'And':
    case 'Or': {
      // we use `some` here because that's the behavior we typically want.
      // if one is marked as null, the whole thing is nullable
      return node.children.some((child) => isNull(child, visitedNodes));
    }
    case 'Lazy': {
      const got = node.get();
      if (visitedNodes.has(got.hash)) return false;
      return isNull(node.get(), new Set([...visitedNodes, got.hash]));
    }
    case 'Unknown': {
      return false;
    }
    default: {
      return node.canBeNull;
    }
  }
}
