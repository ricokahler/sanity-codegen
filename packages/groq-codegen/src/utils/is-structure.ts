interface Params {
  accept: (
    node: Exclude<
      Sanity.GroqCodegen.StructureNode,
      { type: 'And' | 'Or' | 'Lazy' }
    >,
  ) => boolean | undefined | null;
  mode: 'some' | 'every';
}

function createIsStructure({ accept, mode }: Params) {
  const cache = new Map<string, boolean>();

  function is(
    node: Sanity.GroqCodegen.StructureNode,
    visitedNodes: Set<string>,
  ): boolean {
    if (node.type === 'Lazy') {
      const got = node.get();
      if (visitedNodes.has(got.hash)) return false;
      return is(got, new Set([...visitedNodes, got.hash]));
    }

    if (node.type === 'And' || node.type === 'Or') {
      return node.children[mode]((child) => is(child, visitedNodes));
    }

    return !!accept(node);
  }

  return function isStructure(structure: Sanity.GroqCodegen.StructureNode) {
    if (cache.has(structure.hash)) return cache.get(structure.hash)!;
    const result = is(structure, new Set());

    cache.set(structure.hash, result);
    return result;
  };
}

export const isStructureNumber = createIsStructure({
  accept: (n) => n.type === 'Number',
  mode: 'every',
});

export const isStructureString = createIsStructure({
  accept: (n) => n.type === 'String',
  mode: 'every',
});

export const isStructureBoolean = createIsStructure({
  accept: (n) => n.type === 'Boolean',
  mode: 'every',
});

export const isStructureArray = createIsStructure({
  accept: (n) => ['Array', 'Tuple'].includes(n.type),
  mode: 'every',
});

export const isStructureNull = createIsStructure({
  accept: (n) => (n.type === 'Unknown' ? false : n.canBeNull),
  mode: 'some',
});

export const isStructureOptional = createIsStructure({
  accept: (n) => (n.type === 'Unknown' ? false : n.canBeOptional),
  mode: 'some',
});

export const isStructureObject = createIsStructure({
  accept: (n) => n.type === 'Object',
  mode: 'every',
});
