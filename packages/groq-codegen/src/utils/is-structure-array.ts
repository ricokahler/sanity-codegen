export function isStructureArray(
  structure: Sanity.GroqCodegen.StructureNode,
): boolean {
  return isArray(structure, new Set());
}

function isArray(
  node: Sanity.GroqCodegen.StructureNode,
  visitedNodes: Set<string>,
) {
  switch (node.type) {
    case 'Array': {
      return true;
    }
    case 'And':
    case 'Or': {
      // TODO: is this `some` logic right?
      return node.children.some((child) => isArray(child, visitedNodes));
    }
    case 'Lazy': {
      const got = node.get();
      if (visitedNodes.has(got.hash)) return false;

      return isArray(node.get(), new Set([...visitedNodes, got.hash]));
    }
    default: {
      return false;
    }
  }
}
