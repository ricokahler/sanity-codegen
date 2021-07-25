export function isStructureArray(
  structure: Sanity.GroqCodegen.StructureNode,
): structure is Sanity.GroqCodegen.Only<
  Sanity.GroqCodegen.ArrayNode | Sanity.GroqCodegen.TupleNode
> {
  return isArray(structure, new Set());
}

function isArray(
  node: Sanity.GroqCodegen.StructureNode,
  visitedNodes: Set<string>,
) {
  switch (node.type) {
    case 'Tuple':
    case 'Array': {
      return true;
    }
    case 'And':
    case 'Or': {
      return node.children.every((child) => isArray(child, visitedNodes));
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
