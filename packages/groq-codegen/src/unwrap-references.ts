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

export function unwrapReferences(n: Sanity.GroqCodegen.StructureNode) {
  switch (n.type) {
    case 'Reference': {
      return unwrapLazy(n.to);
    }
    case 'And':
    case 'Or': {
      return {
        ...n,
        children: n.children.map(unwrapReferences),
      };
    }
    default: {
      return n;
    }
  }
}
