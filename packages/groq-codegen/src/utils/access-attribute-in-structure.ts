import { wrapArray } from './wrap-array';
import { createStructure } from './create-structure';
import { removeOptional } from './remove-optional';
import { isStructureNull, isStructureOptional } from './is-structure';
import { addNull } from './add-null';
import { unwrapArray } from './unwrap-array';

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
        hashInput: ['AccessAttributeInStructure', node.hash],
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
