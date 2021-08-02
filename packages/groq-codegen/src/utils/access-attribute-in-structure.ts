import { createStructure } from './create-structure';
import { isStructureNull, isStructureOptional } from './is-structure';
import { addNull, unwrapArray, removeOptional } from './transforms';
import { wrapArray } from './wrap-array';

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

      if (isStructureOptional(matchingProperty.value)) {
        return removeOptional(addNull(matchingProperty.value));
      }

      return matchingProperty.value;
    }
    case 'Array': {
      return wrapArray(
        accessAttributeInStructure(unwrapArray(node.of), attributeName),
        {
          canBeNull: isStructureNull(node),
          canBeOptional: isStructureOptional(node),
        },
      );
    }
    case 'Intrinsic': {
      throw new Error('Not implemented yet');
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        get: () => accessAttributeInStructure(node.get(), attributeName),
        hashNamespace: 'AccessAttributeInStructure',
        hashInput: node.hash,
      });
    }
    case 'Reference': {
      return accessAttributeInStructure(node.to, attributeName);
    }
    default: {
      return { type: 'Unknown', hash: 'unknown' };
    }
  }
}
