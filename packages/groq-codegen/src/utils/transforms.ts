import { createStructure } from './create-structure';
import { isStructureArray } from './is-structure';

type StructureNode = Sanity.GroqCodegen.StructureNode;
type LeafNode = Exclude<StructureNode, { type: 'And' | 'Or' | 'Lazy' }>;

interface Params<R extends LeafNode> {
  namespace: string;
  accept?: (node: LeafNode) => boolean;
  transform: (node: R) => StructureNode;
}

export function createTransform<R extends LeafNode>({
  namespace,
  accept = () => true,
  transform: transformLeaf,
}: Params<R>): (node: StructureNode) => StructureNode {
  function memoize(fn: (node: StructureNode) => StructureNode) {
    const cache = new Map<string, StructureNode>();

    return (node: StructureNode) => {
      if (cache.has(node.hash)) return cache.get(node.hash)!;
      const result = fn(node);
      cache.set(node.hash, result);
      return result;
    };
  }

  const transform = memoize((node) => {
    if (node.type === 'And' || node.type === 'Or') {
      return createStructure({
        ...node,
        children: node.children.map(transform),
      });
    }

    if (node.type === 'Lazy') {
      return createStructure({
        type: 'Lazy',
        get: () => transform(node.get()),
        hashNamespace: namespace,
        hashInput: node.hash,
      });
    }

    if (accept(node)) return transformLeaf(node as R);
    return node;
  });

  return transform;
}

export const addNull = createTransform({
  namespace: 'AddNull',
  accept: (node) => node.type !== 'Unknown',
  transform: (node) => createStructure({ ...node, canBeNull: true }),
});

export const addOptional = createTransform({
  namespace: 'AddNull',
  accept: (node) => node.type !== 'Unknown',
  transform: (node) => createStructure({ ...node, canBeOptional: true }),
});

export const addOptionalToProperties = createTransform<
  Extract<LeafNode, { type: 'Object' }>
>({
  namespace: 'AddOptionalToProperties',
  accept: (node) => node.type === 'Object',
  transform: (node) =>
    createStructure({
      type: 'Object',
      canBeNull: node.canBeNull,
      canBeOptional: node.canBeOptional,
      properties: node.properties.map(({ key, value }) => ({
        key,
        value: addOptional(value),
      })),
    }),
});

export const removeOptional = createTransform({
  namespace: 'RemoveOptional',
  accept: (node) => node.type !== 'Unknown',
  transform: (node) => createStructure({ ...node, canBeOptional: false }),
});

const _unwrapArray = createTransform<
  Extract<LeafNode, { type: 'Array' | 'Tuple' }>
>({
  namespace: 'UnwrapArray',
  accept: (node) => node.type === 'Array' || node.type === 'Tuple',
  transform: (node) => {
    switch (node.type) {
      case 'Array': {
        return node.of;
      }
      case 'Tuple': {
        return createStructure({ type: 'Or', children: node.elements });
      }
    }
  },
});

export const unwrapArray = (node: StructureNode) => {
  if (!isStructureArray(node)) return node;
  return _unwrapArray(node);
};

export const unwrapReferences = createTransform<
  Extract<LeafNode, { type: 'Reference' }>
>({
  namespace: 'UnwrapReferences',
  accept: (node) => node.type === 'Reference',
  // this is a bit of a special case since the transform is
  // 1. find reference
  // 2. unwrap one level of lazy
  transform: (node) => unwrapLazy(node.to),
});

function unwrapLazy(n: StructureNode): StructureNode {
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
