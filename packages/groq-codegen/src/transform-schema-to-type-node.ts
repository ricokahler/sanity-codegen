import { hash } from './hash';

export interface TransformSchemaToTypeNodeOptions {
  schemaDef: Sanity.SchemaDef.Def;
  schema: Sanity.SchemaDef.Schema;
}

const referenceCache = new Map<string, Sanity.Groq.TypeNode>();

export function transformSchemaToTypeNode({
  schema,
  schemaDef,
}: TransformSchemaToTypeNodeOptions): Sanity.Groq.TypeNode {
  if (schemaDef.definitionType === 'alias') {
    const referencedType = [
      ...schema.topLevelTypes,
      ...schema.documentTypes,
    ].find((x) => x.name === schemaDef.type);

    if (!referencedType) {
      return { type: 'Unknown', isArray: false };
    }

    return {
      type: 'Alias',
      isArray: false,
      // TODO: this probably doesn't make sense
      canBeNull: false,
      canBeUndefined: false,
      get: () => {
        const key = hash({ schemaDef, referencedType });
        if (referenceCache.has(key)) return referenceCache.get(key)!;

        const result = transformSchemaToTypeNode({
          schema,
          schemaDef: referencedType,
        });

        referenceCache.set(key, result);
        return result;
      },
    };
  }

  switch (schemaDef.type) {
    case 'array': {
      const children = schemaDef.of.map((i) => ({
        ...transformSchemaToTypeNode({ schema, schemaDef: i }),
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
        `Schema Definition Type "${schemaDef.type}" not implemented yet.`,
      );
    }
    case 'boolean': {
      return {
        type: 'Boolean',
        canBeNull: !schemaDef.codegen.required,
        canBeUndefined: !schemaDef.codegen.required,
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
        canBeNull: !schemaDef.codegen.required,
        canBeUndefined: !schemaDef.codegen.required,
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

      if (schemaDef.type === 'document') {
        properties.push({
          key: '_type',
          value: {
            type: 'String',
            canBeNull: false,
            canBeUndefined: false,
            value: schemaDef.name,
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

      if (schemaDef.type === 'file' || schemaDef.type === 'image') {
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

      if (schemaDef.type === 'image') {
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

      const fieldProperties = schemaDef.fields?.map((field) => ({
        key: field.name,
        value: transformSchemaToTypeNode({
          schemaDef: field.definition,
          schema,
        }),
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
        canBeNull: !schemaDef.codegen.required,
        canBeUndefined: !schemaDef.codegen.required,
        isArray: false,
      };
    }

    case 'number': {
      return {
        type: 'Number',
        canBeNull: !schemaDef.codegen.required,
        canBeUndefined: !schemaDef.codegen.required,
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
          children: schemaDef.to.map((n) =>
            transformSchemaToTypeNode({ schemaDef: n, schema }),
          ),
          isArray: false,
          // TODO: implement this
          canBeNull: false,
          canBeUndefined: false,
        },
        canBeNull: !schemaDef.codegen.required,
        canBeUndefined: !schemaDef.codegen.required,
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
        canBeNull: !schemaDef.codegen.required,
        canBeUndefined: !schemaDef.codegen.required,
        isArray: false,
      };
    }

    default: {
      throw new Error(
        // `schemaDef.type` should be never because we exhausted the list of
        // possible items
        // @ts-expect-error
        `Schema Definition Type "${schemaDef.type}" not implemented yet.`,
      );
    }
  }
}

export function getEverything(
  schema: Sanity.SchemaDef.Schema,
): Sanity.Groq.TypeNode {
  return {
    type: 'Or',
    children: schema.documentTypes.map((i) => ({
      ...transformSchemaToTypeNode({ schema, schemaDef: i }),
      isArray: false,
    })),
    isArray: true,
    // TODO: implement this
    canBeNull: false,
    canBeUndefined: false,
  };
}
