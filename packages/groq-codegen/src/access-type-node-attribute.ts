export function accessTypeNodeAttribute(
  node: Sanity.Groq.TypeNode,
  name: string,
): Sanity.Groq.TypeNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return {
        ...node,
        children: node.children.map((child) =>
          accessTypeNodeAttribute(child, name),
        ),
      };
    }

    case 'Object': {
      const matchingProperty = node.properties.find(
        (property) => property.key === name,
      );

      if (!matchingProperty) {
        return { type: 'Unknown', isArray: false };
      }

      // TODO: do i need to handle `isArray` here?
      return matchingProperty.value;
    }
    case 'Boolean':
    case 'Intrinsic':
    case 'Number':
    case 'String':
    case 'Unknown': {
      return { type: 'Unknown', isArray: false };
    }
    case 'Alias': {
      // TODO: is this right?
      return accessTypeNodeAttribute(node.get(), name);
    }
    case 'Reference': {
      // TODO: is this right?
      return node.to;
    }
    default: {
      // TODO: better comment
      // @ts-expect-error
      throw new Error(`${node.type} not implemented`);
    }
  }
}
