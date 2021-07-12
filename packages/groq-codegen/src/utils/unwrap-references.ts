import { structureIsArray } from './structure-is-array';
import { unwrapArray } from './unwrap-array';
import { wrapArray } from './wrap-array';
// import {} from

function unwrapLazy(n: Sanity.GroqCodegen.StructureNode) {
  switch (n.type) {
    case 'Lazy': {
      return n.get();
    }
    case 'And':
    case 'Or': {
      return {
        ...n,
        children: n.children.map(unwrapLazy),
      };
    }
    default: {
      return n;
    }
  }
}

export function unwrapReferences(node: Sanity.GroqCodegen.StructureNode) {
  switch (node.type) {
    case 'Reference': {
      return unwrapLazy(node.to);
    }
    case 'And':
    case 'Or': {
      return {
        ...node,
        children: node.children.map(unwrapReferences),
      };
    }
    case 'Array': {
      return structureIsArray(node)
        ? wrapArray(unwrapReferences(unwrapArray(node.of)))
        : unwrapReferences(node.of);
    }
    default: {
      return node;
    }
  }
}
