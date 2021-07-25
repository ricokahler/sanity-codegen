import { createStructure } from './create-structure';

export function reduceObjectStructures(
  source: Sanity.GroqCodegen.StructureNode,
  override: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (source.type) {
    default: {
      throw new Error(
        `Found unsupported source node type "${source.type}" in ` +
          `reduceObjectStructures call. Please open an issue.`,
      );
    }
    case 'And':
    case 'Or': {
      return createStructure({
        ...source,
        children: source.children.map((sourceChild) =>
          reduceObjectStructures(sourceChild, override),
        ),
      });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        hashInput: ['ReduceObjectStructures', source.hash],
        get: () => reduceObjectStructures(source.get(), override),
      });
    }
    case 'Object': {
      switch (override.type) {
        default: {
          // TODO: show contextual warning. potentially throw and catch
          // downstream for more context.
          console.warn(
            `Attempted to use ObjectSplat for unsupported type "${override.type}"`,
          );
          return createStructure({ type: 'Unknown' });
        }
        case 'And':
        case 'Or': {
          return createStructure({
            ...override,
            children: override.children.map((overrideChilde) =>
              reduceObjectStructures(source, overrideChilde),
            ),
          });
        }
        case 'Lazy': {
          return createStructure({
            type: 'Lazy',
            hashInput: ['ReduceObjectStructures', override.hash],
            get: () => reduceObjectStructures(source, override.get()),
          });
        }
        case 'Object': {
          type Property = Sanity.GroqCodegen.ObjectNode['properties'][number];

          const resolvedProperties = Array.from(
            [...source.properties, ...override.properties]
              .reduce<Map<string, Property>>((map, property) => {
                map.set(property.key, property);
                return map;
              }, new Map())
              .values(),
          );

          return createStructure({
            type: 'Object',
            canBeNull: source.canBeNull || override.canBeNull,
            canBeOptional: source.canBeOptional || override.canBeOptional,
            properties: resolvedProperties,
          });
        }
      }
    }
  }
}
