import { hash } from './hash';

const referenceCache = new Map<string, Sanity.GroqCodegen.StructureNode>();

function transform(
  node: Sanity.SchemaDef.SchemaNode,
  schema: Sanity.SchemaDef.Schema,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'RegistryReference': {
      const referencedType = [
        ...schema.documents,
        ...schema.registeredTypes,
      ].find((n) => n.name === node.to);

      // TODO: could show warning
      if (!referencedType) return { type: 'Unknown' };

      return {
        type: 'Lazy',
        get: () => {
          const key = hash({ schemaDef: node, referencedType });
          if (referenceCache.has(key)) return referenceCache.get(key)!;

          const result = transform(referencedType, schema);

          referenceCache.set(key, result);
          return result;
        },
      };
    }
    case 'Array': {
      return {
        type: 'Array',
        canBeNull: false,
        canBeUndefined: !node.codegen.required,
        of: {
          type: 'Or',
          children: node.of.map((n) => transform(n, schema)),
        },
      };
    }
    case 'Block': {
      // TODO:
      throw new Error(
        `Schema Definition Type "${node.type}" not implemented yet.`,
      );
    }
    case 'Boolean': {
      return {
        type: 'Boolean',
        canBeNull: false,
        canBeUndefined: !node.codegen.required,
      };
    }
    case 'Date':
    case 'Datetime':
    case 'String':
    case 'Text':
    case 'Url': {
      return {
        type: 'String',
        canBeNull: false,
        canBeUndefined: !node.codegen.required,
        value: null,
      };
    }
    case 'Object':
    case 'Document':
    case 'File':
    case 'Image': {
      type ObjectProperties = Extract<
        Sanity.GroqCodegen.StructureNode,
        { type: 'Object' }
      >['properties'];

      const properties: ObjectProperties = [];

      if (node.type === 'Document') {
        properties.push({
          key: '_type',
          value: {
            type: 'String',
            canBeNull: false,
            canBeUndefined: false,
            value: node.name,
          },
        });

        properties.push({
          key: '_id',
          value: {
            type: 'String',
            canBeNull: false,
            canBeUndefined: false,
            value: null,
          },
        });
      }

      if (node.type === 'File' || node.type === 'Image') {
        properties.push({
          key: 'asset',
          value: {
            type: 'Intrinsic',
            intrinsicType: 'Asset',
            // TODO: is this right?
            canBeNull: false,
            canBeUndefined: false,
          },
        });
      }

      if (node.type === 'Image') {
        properties.push({
          key: 'crop',
          value: {
            type: 'Intrinsic',
            intrinsicType: 'Crop',
            canBeNull: false,
            canBeUndefined: true,
          },
        });

        properties.push({
          key: 'hotspot',
          value: {
            type: 'Intrinsic',
            intrinsicType: 'Hotspot',
            canBeNull: false,
            canBeUndefined: true,
          },
        });
      }

      const fieldProperties = node.fields?.map((field) => ({
        key: field.name,
        value: transform(field.definition, schema),
      }));

      if (fieldProperties) {
        for (const fieldProperty of fieldProperties) {
          properties.push(fieldProperty);
        }
      }

      return {
        type: 'Object',
        properties,
        canBeNull: false,
        canBeUndefined: !node.codegen.required,
      };
    }

    case 'Geopoint': {
      return {
        type: 'Intrinsic',
        intrinsicType: 'Geopoint',
        canBeNull: false,
        canBeUndefined: !node.codegen.required,
      };
    }

    case 'Number': {
      return {
        type: 'Number',
        canBeNull: false,
        canBeUndefined: !node.codegen.required,
        value: null,
      };
    }

    case 'Reference': {
      return {
        type: 'Reference',
        // TODO: this creates repeated types inside of a `Sanity.Reference<{}>`.
        // the desired behavior is to have them named when unmodified
        to: {
          type: 'Or',
          children: node.to.map((n) => transform(n, schema)),
        },
        canBeNull: false,
        canBeUndefined: !node.codegen.required,
      };
    }

    case 'Slug': {
      return {
        type: 'Object',
        properties: [
          {
            key: 'slug',
            value: {
              type: 'Object',
              properties: [
                {
                  key: 'current',
                  value: {
                    type: 'String',
                    canBeNull: false,
                    canBeUndefined: false,
                    value: null,
                  },
                },
              ],
              canBeNull: false,
              canBeUndefined: false,
            },
          },
        ],
        canBeNull: false,
        canBeUndefined: !node.codegen.required,
      };
    }

    default: {
      throw new Error(
        // `schemaDef.type` should be never because we exhausted the list of
        // possible items
        // @ts-expect-error
        `Schema Definition Type "${node.type}" not implemented yet.`,
      );
    }
  }
}

export function transformSchemaToStructure(
  schema: Sanity.SchemaDef.Schema,
): Sanity.GroqCodegen.StructureNode {
  return {
    type: 'Array',
    of: {
      type: 'Or',
      children: schema.documents.map((n) =>
        markAsDefined(transform(n, schema)),
      ),
    },
    canBeNull: false,
    canBeUndefined: false,
  };
}

function markAsDefined(
  node: Sanity.GroqCodegen.StructureNode,
): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'And':
    case 'Or': {
      return { ...node, children: node.children.map(markAsDefined) };
    }
    case 'Lazy': {
      // TODO: will this cause infinite loops?
      return { type: 'Lazy', get: () => markAsDefined(node.get()) };
    }
    default: {
      if ('canBeUndefined' in node) return { ...node, canBeUndefined: false };
      return node;
    }
  }
}
