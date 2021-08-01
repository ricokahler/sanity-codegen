import { createStructure } from './create-structure';

export function reduceObjectStructures(
  source: Sanity.GroqCodegen.StructureNode,
  incoming: Sanity.GroqCodegen.StructureNode,
  mode: 'replace' | 'union',
): Sanity.GroqCodegen.StructureNode {
  switch (source.type) {
    default: {
      throw new Error(
        `Found unsupported source node type "${source.type}" in ` +
          `reduceObjectStructures call. Please open an issue.`,
      );
    }

    // TODO: for `And`s, should we combine the objects?
    case 'And':
    case 'Or': {
      return createStructure({
        ...source,
        children: source.children.map((sourceChild) =>
          reduceObjectStructures(sourceChild, incoming, mode),
        ),
      });
    }
    case 'Lazy': {
      return createStructure({
        type: 'Lazy',
        hashInput: ['ReduceObjectStructuresSource', source.hash],
        get: () => reduceObjectStructures(source.get(), incoming, mode),
      });
    }
    case 'Object': {
      switch (incoming.type) {
        default: {
          // TODO: show contextual warning. potentially throw and catch
          // downstream for more context.
          console.warn(
            `Attempted to use ObjectSplat for unsupported type "${incoming.type}"`,
          );
          return createStructure({ type: 'Unknown' });
        }
        case 'And':
        case 'Or': {
          return createStructure({
            ...incoming,
            children: incoming.children.map((incomingChild) =>
              reduceObjectStructures(source, incomingChild, mode),
            ),
          });
        }
        case 'Lazy': {
          return createStructure({
            type: 'Lazy',
            hashInput: ['ReduceObjectStructuresOverride', incoming.hash],
            get: () => reduceObjectStructures(source, incoming.get(), mode),
          });
        }
        case 'Object': {
          type Property = Sanity.GroqCodegen.ObjectNode['properties'][number];

          const resolvedProperties =
            mode === 'replace'
              ? Array.from(
                  [...source.properties, ...incoming.properties]
                    .reduce<Map<string, Property>>((map, property) => {
                      map.set(property.key, property);
                      return map;
                    }, new Map())
                    .values(),
                )
              : Array.from(
                  [...source.properties, ...incoming.properties]
                    .reduce<Map<string, Property>>((map, property) => {
                      const existingProperty = map.get(property.key);

                      if (existingProperty) {
                        map.set(property.key, {
                          key: property.key,
                          value: createStructure({
                            type: 'Or',
                            children: [existingProperty.value, property.value],
                          }),
                        });
                      } else {
                        map.set(property.key, property);
                      }
                      return map;
                    }, new Map())
                    .values(),
                );

          return createStructure({
            type: 'Object',
            canBeNull: source.canBeNull || incoming.canBeNull,
            canBeOptional: source.canBeOptional || incoming.canBeOptional,
            properties: resolvedProperties,
          });
        }
      }
    }
  }
}
