import { isStructureArray } from './is-structure-array';
import { wrapArray } from './wrap-array';
import { createStructure } from './create-structure';

export function accessAttributeInStructure(
  node: Sanity.GroqCodegen.StructureNode,
  attributeName: string,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return createStructure({
        ...node,
        children: node.children.map((child) =>
          accessAttributeInStructure(child, attributeName),
        ),
      });
    }

    case 'Object': {
      const matchingProperty = node.properties.find(
        (property) => property.key === attributeName,
      );

      if (!matchingProperty) return { type: 'Unknown', hash: 'unknown' };
      return matchingProperty.value;
    }
    case 'Array': {
      return isStructureArray(node)
        ? wrapArray(accessAttributeInStructure(node.of, attributeName))
        : accessAttributeInStructure(node.of, attributeName);
    }
    case 'Boolean':
    case 'Intrinsic':
    case 'Number':
    case 'String':
    case 'Unknown': {
      return { type: 'Unknown', hash: 'unknown' };
    }
    case 'Lazy': {
      // TODO: is this right?
      return accessAttributeInStructure(node.get(), attributeName);
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
