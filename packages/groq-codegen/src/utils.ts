export function unwrapArray(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'Array': {
      // TODO: what about `undefined`s and `null`s?
      return node.of;
    }
    case 'And':
    case 'Or': {
      return {
        ...node,
        children: node.children.map(unwrapArray),
      };
    }
    case 'Lazy': {
      // TODO: will this cause any unnecessary churn or infinite loops?
      return {
        type: 'Lazy',
        get: () => unwrapArray(node.get()),
      };
    }
    default: {
      return node;
    }
  }
}

export function wrapArray(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return {
        ...node,
        children: node.children.map(wrapArray),
      };
    }
    case 'Lazy': {
      return {
        type: 'Lazy',
        // TODO: will this cause any unnecessary churn or infinite loops?
        get: () => wrapArray(node.get()),
      };
    }
    default: {
      return {
        type: 'Array',
        of: node,
        // TODO: what about `undefined`s and `null`s?
        canBeNull: false,
        canBeUndefined: false,
      };
    }
  }
}

export function hasArray(node: Sanity.GroqCodegen.StructureNode): boolean {
  switch (node.type) {
    case 'Array': {
      return true;
    }
    case 'And':
    case 'Or': {
      return node.children.some(hasArray);
    }
    case 'Lazy': {
      // TODO: will this cause any unnecessary churn or infinite loops?
      return hasArray(node.get());
    }
    default: {
      return false;
    }
  }
}
