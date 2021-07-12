import { structureIsArray } from './structure-is-array';
import { wrapArray } from './wrap-array';

export function accessAttributeInStructure(
  node: Sanity.GroqCodegen.StructureNode,
  attributeName: string,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return {
        ...node,
        children: node.children.map((child) =>
          accessAttributeInStructure(child, attributeName),
        ),
      };
    }

    case 'Object': {
      const matchingProperty = node.properties.find(
        (property) => property.key === attributeName,
      );

      if (!matchingProperty) return { type: 'Unknown' };
      return matchingProperty.value;
    }
    case 'Array': {
      const nodeHadArray = structureIsArray(node);

      return nodeHadArray
        ? wrapArray(accessAttributeInStructure(node.of, attributeName))
        : accessAttributeInStructure(node.of, attributeName);
    }
    case 'Boolean':
    case 'Intrinsic':
    case 'Number':
    case 'String':
    case 'Unknown': {
      return { type: 'Unknown' };
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
