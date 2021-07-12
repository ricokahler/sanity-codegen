function unwrapAlias(n: Sanity.Groq.TypeNode) {
  switch (n.type) {
    case 'Alias': {
      return n.get();
    }
    case 'And':
    case 'Or': {
      return {
        ...n,
        children: n.children.map(unwrapAlias),
      };
    }
    default: {
      return n;
    }
  }
}

export function unwrapReferences(n: Sanity.Groq.TypeNode) {
  switch (n.type) {
    case 'Reference': {
      return unwrapAlias(n.to);
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
