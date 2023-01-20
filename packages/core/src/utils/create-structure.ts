import { unorderedHash, objectHash } from './hash';

// LazyNode is a special case, see the jsdoc comment below
type LazyNodeWithoutHash = Omit<Sanity.GroqCodegen.LazyNode, 'hash'> & {
  hashNamespace: string;
  hashInput: string;
};

type StructureNodeTypes = Exclude<
  Sanity.GroqCodegen.StructureNode['type'],
  // LazyNode is a special case, see the jsdoc comment below
  'Lazy'
>;

// creates a type of all the `StructureNode`s but without a hash
type StructureNodeWithoutHash = {
  [P in StructureNodeTypes]: Omit<
    Extract<Sanity.GroqCodegen.StructureNode, { type: P }>,
    'hash'
  >;
}[StructureNodeTypes];

type InputNode = (StructureNodeWithoutHash | LazyNodeWithoutHash) & {
  // adds in `hash` as an optional string for easier use however any
  // pre-existing hashes will be overridden
  hash?: string;
};

type Transform = (
  node: Sanity.GroqCodegen.StructureNode,
) => Sanity.GroqCodegen.StructureNode;

const memoize = (transform: Transform): Transform => {
  const cache = new Map<string, Sanity.GroqCodegen.StructureNode>();

  return (node) => {
    if (cache.has(node.hash)) return cache.get(node.hash)!;
    const result = transform(node);
    cache.set(node.hash, result);
    return result;
  };
};

export const simplify = memoize((node: Sanity.GroqCodegen.StructureNode) => {
  if (node.type !== 'And' && node.type !== 'Or') return node;

  const children = Array.from(
    node.children
      .map(simplify)
      .reduce<Map<string, Sanity.GroqCodegen.StructureNode>>((map, child) => {
        if (child.type === node.type) {
          for (const nestedChild of child.children) {
            map.set(nestedChild.hash, nestedChild);
          }
        } else {
          map.set(child.hash, child);
        }
        return map;
      }, new Map())
      .values(),
  ).sort((a, b) => a.hash.localeCompare(b.hash, 'en'));

  if (children.length === 0) return ensureHash({ type: 'Unknown' });
  if (children.length === 1) return children[0];
  return ensureHash({ ...node, children });
});

function ensureHash({
  // remove an pre-existing hash
  hash: _hash,
  ...node
}: InputNode): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      const { children, ...rest } = node;
      return {
        ...node,
        hash: objectHash([rest, unorderedHash(children.map((i) => i.hash))]),
      };
    }
    case 'Array': {
      const { of, ...rest } = node;
      return {
        ...node,
        hash: objectHash([rest, of.hash]),
      };
    }
    case 'Object': {
      const { properties, ...rest } = node;
      return {
        ...node,
        hash: objectHash([
          rest,
          unorderedHash(properties.map((i) => [i.key, i.value.hash])),
        ]),
      };
    }
    case 'Tuple': {
      const { elements, ...rest } = node;
      return {
        ...node,
        hash: objectHash([rest, elements.map((element) => element.hash)]),
      };
    }
    case 'Reference': {
      const { to, ...rest } = node;
      return {
        ...node,
        hash: objectHash([rest, to.hash]),
      };
    }
    case 'Unknown': {
      return { type: 'Unknown', hash: 'unknown' };
    }
    case 'Lazy': {
      const { hashInput, hashNamespace, ...rest } = node;
      return {
        // this is `rest` on purpose
        ...rest,
        hash: objectHash(['Lazy', hashNamespace, hashInput]),
      };
    }
    default: {
      return {
        ...node,
        hash: objectHash(node),
      };
    }
  }
}

/**
 * Adds hashes to new `StructureNode`s by looking at the current node's
 * properties. If the node has children (e.g. `And`s/`Or`s), then the hash will
 * use the direct children's hash as an input (this makes all hash computation
 * shallow).
 *
 * The result of this is then ran through `simplify` function memoized by the
 * node's resulting hash.
 *
 * Note: the `LazyNode` is a special case because it's not possible to derive a
 * hash automatically without pulling the lazy value so a `hashNamespace` and
 * a `hashInput` are required.
 */
export const createStructure = (node: InputNode) => simplify(ensureHash(node));
