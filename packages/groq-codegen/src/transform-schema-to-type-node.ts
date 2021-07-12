import { hash } from './hash';

const referenceCache = new Map<string, Sanity.Groq.TypeNode>();

function transform(
  node: Sanity.SchemaDef.Def,
  schema: Sanity.SchemaDef.Schema,
): Sanity.Groq.TypeNode {
  if (node.definitionType === 'alias') {
    const referencedType = [
      ...schema.topLevelTypes,
      ...schema.documentTypes,
    ].find((n) => n.name === node.type);

    if (!referencedType) return { type: 'Unknown', isArray: false };

    return {
      type: 'Alias',
      isArray: false,
      // TODO: this probably doesn't make sense
      canBeNull: false,
      canBeUndefined: false,
      get: () => {
        const key = hash({ schemaDef: node, referencedType });
        if (referenceCache.has(key)) return referenceCache.get(key)!;

        const result = transform(referencedType, schema);

        referenceCache.set(key, result);
        return result;
      },
    };
  }

  switch (node.type) {
    case 'array': {
      const children = node.of.map((n) => ({
        ...transform(n, schema),
        isArray: false,
      }));

      if (children.length === 1) return children[0];

      return {
        type: 'Or',
        children: children,
        isArray: true,
        // TODO: implement this
        canBeNull: false,
        canBeUndefined: false,
      };
    }
    case 'block': {
      // TODO:
      throw new Error(
        `Schema Definition Type "${node.type}" not implemented yet.`,
      );
    }
    case 'boolean': {
      return {
        type: 'Boolean',
        canBeNull: !node.codegen.required,
        canBeUndefined: !node.codegen.required,
        isArray: false,
      };
    }
    case 'date':
    case 'datetime':
    case 'string':
    case 'text':
    case 'url': {
      return {
        type: 'String',
        canBeNull: !node.codegen.required,
        canBeUndefined: !node.codegen.required,
        value: null,
        isArray: false,
      };
    }
    case 'object':
    case 'document':
    case 'file':
    case 'image': {
      type ObjectProperties = Extract<
        Sanity.Groq.TypeNode,
        { type: 'Object' }
      >['properties'];

      const properties: ObjectProperties = [];

      if (node.type === 'document') {
        properties.push({
          key: '_type',
          value: {
            type: 'String',
            canBeNull: false,
            canBeUndefined: false,
            value: node.name,
            isArray: false,
          },
        });

        properties.push({
          key: '_id',
          value: {
            type: 'String',
            canBeNull: false,
            canBeUndefined: false,
            value: null,
            isArray: false,
          },
        });
      }

      if (node.type === 'file' || node.type === 'image') {
        properties.push({
          key: 'asset',
          value: {
            type: 'Intrinsic',
            intrinsicType: 'Asset',
            canBeNull: false,
            canBeUndefined: false,
            isArray: false,
          },
        });
      }

      if (node.type === 'image') {
        properties.push({
          key: 'crop',
          value: {
            type: 'Intrinsic',
            intrinsicType: 'Crop',
            canBeNull: false,
            canBeUndefined: true,
            isArray: false,
          },
        });

        properties.push({
          key: 'hotspot',
          value: {
            type: 'Intrinsic',
            intrinsicType: 'Hotspot',
            canBeNull: false,
            canBeUndefined: true,
            isArray: false,
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
        canBeUndefined: false,
        isArray: false,
      };
    }

    case 'geopoint': {
      return {
        type: 'Intrinsic',
        intrinsicType: 'Geopoint',
        canBeNull: !node.codegen.required,
        canBeUndefined: !node.codegen.required,
        isArray: false,
      };
    }

    case 'number': {
      return {
        type: 'Number',
        canBeNull: !node.codegen.required,
        canBeUndefined: !node.codegen.required,
        value: null,
        isArray: false,
      };
    }

    case 'reference': {
      return {
        type: 'Reference',
        // TODO: this creates repeated types inside of a `Sanity.Reference<{}>`.
        // the desired behavior is to have them named when unmodified
        to: {
          type: 'Or',
          children: node.to.map((n) => transform(n, schema)),
          isArray: false,
          // TODO: implement this
          canBeNull: false,
          canBeUndefined: false,
        },
        canBeNull: !node.codegen.required,
        canBeUndefined: !node.codegen.required,
        isArray: false,
      };
    }

    case 'slug': {
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
                    isArray: false,
                  },
                },
              ],
              canBeNull: false,
              canBeUndefined: false,
              isArray: false,
            },
          },
        ],
        canBeNull: !node.codegen.required,
        canBeUndefined: !node.codegen.required,
        isArray: false,
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

export function transformSchemaToTypeNode(
  schema: Sanity.SchemaDef.Schema,
): Sanity.Groq.TypeNode {
  return {
    type: 'Or',
    children: schema.documentTypes.map((n) => ({
      ...transform(n, schema),
      isArray: false,
    })),
    isArray: true,
    // TODO: implement this
    canBeNull: false,
    canBeUndefined: false,
  };
}
