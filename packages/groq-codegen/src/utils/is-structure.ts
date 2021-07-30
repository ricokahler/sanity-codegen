const cache = new Map<string, boolean>();

export function isStructure(
  structure: Sanity.GroqCodegen.StructureNode,
  accept: (
    node: Exclude<
      Sanity.GroqCodegen.StructureNode,
      { type: 'And' | 'Or' | 'Lazy' }
    >,
  ) => boolean | undefined | null,
  visitedNodes: Set<string> = new Set(),
): boolean {
  if (cache.has(structure.hash)) return cache.get(structure.hash)!;

  if (structure.type === 'Lazy') {
    const got = structure.get();
    if (visitedNodes.has(got.hash)) return false;
    return isStructure(
      structure.get(),
      accept,
      new Set([...visitedNodes, got.hash]),
    );
  }

  if (structure.type === 'And' || structure.type === 'Or') {
    return structure.children.every((child) =>
      isStructure(child, accept, visitedNodes),
    );
  }

  const result = !!accept(structure);
  cache.set(structure.hash, result);
  return result;
}
