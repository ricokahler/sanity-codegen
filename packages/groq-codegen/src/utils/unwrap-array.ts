import { createStructure } from './create-structure';
import { isStructureArray } from './is-structure-array';

export function unwrapArray(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  if (isStructureArray(node)) return unwrap(node);
  return node;
}

function unwrap(
  node: Sanity.GroqCodegen.Only<
    Sanity.GroqCodegen.ArrayNode | Sanity.GroqCodegen.TupleNode
  >,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'Array': {
      return node.of;
    }
    case 'Tuple': {
      return createStructure({ type: 'Or', children: node.elements });
    }
    case 'And':
    case 'Or': {
      return createStructure({
        ...node,
        children: node.children.map(unwrap),
      });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => unwrap(node.get()),
        hashInput: ['UnwrapArray', node.hash],
      });
    }
  }
}
