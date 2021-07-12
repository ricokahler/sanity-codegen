export function structureIsArray(
  node: Sanity.GroqCodegen.StructureNode,
): boolean {
  switch (node.type) {
    case 'Array': {
      return true;
    }
    case 'And':
    case 'Or': {
      return node.children.some(structureIsArray);
    }
    case 'Lazy': {
      // TODO: will this cause any unnecessary churn or infinite loops?
      return structureIsArray(node.get());
    }
    default: {
      return false;
    }
  }
}
