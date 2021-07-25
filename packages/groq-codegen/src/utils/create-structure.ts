import { unorderedHash, objectHash } from './hash';

// LazyNode is a special case, see the jsdoc comment below
type LazyNodeWithoutHash = Omit<Sanity.GroqCodegen.LazyNode, 'hash'> & {
  hashInput: any[];
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

/**
 * Adds hashes new `StructureNode`s by looking at the current node's properties.
 * If the node has children (e.g. `And`s/`Or`s), then the hash will also use
 * the direct children's hash as an input.
 *
 * Note: the `LazyNode` is a special case because it's not possible to derive a
 * hash automatically without pulling the lazy value.
 */
export function createStructure({
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
      const { hashInput, ...rest } = node;
      return {
        // this is `rest` on purpose
        ...rest,
        hash: objectHash(['Lazy', ...hashInput]),
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
