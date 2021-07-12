import { hash } from './hash';

const referenceCache = new Map<string, Sanity.Groq.TypeNode>();

function transform(
  node: Sanity.SchemaDef.SchemaNode,
  schema: Sanity.SchemaDef.Schema,
): Sanity.Groq.TypeNode {
  switch (node.type) {
    case 'RegistryReference': {
      const referencedType = [
        ...schema.documents,
        ...schema.registeredTypes,
      ].find((n) => n.name === node.to);

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
    case 'Array': {
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
    case 'Block': {
      // TODO:
      throw new Error(
        `Schema Definition Type "${node.type}" not implemented yet.`,
      );
    }
    case 'Boolean': {
      return {
        type: 'Boolean',
        canBeNull: !node.codegen.required,
        canBeUndefined: !node.codegen.required,
        isArray: false,
      };
    }
    case 'Date':
    case 'Datetime':
    case 'String':
    case 'Text':
    case 'Url': {
      return {
        type: 'String',
        canBeNull: !node.codegen.required,
        canBeUndefined: !node.codegen.required,
        value: null,
        isArray: false,
      };
    }
    case 'Object':
    case 'Document':
    case 'File':
    case 'Image': {
      type ObjectProperties = Extract<
        Sanity.Groq.TypeNode,
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

      if (node.type === 'File' || node.type === 'Image') {
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

      if (node.type === 'Image') {
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

    case 'Geopoint': {
      return {
        type: 'Intrinsic',
        intrinsicType: 'Geopoint',
        canBeNull: !node.codegen.required,
        canBeUndefined: !node.codegen.required,
        isArray: false,
      };
    }

    case 'Number': {
      return {
        type: 'Number',
        canBeNull: !node.codegen.required,
        canBeUndefined: !node.codegen.required,
        value: null,
        isArray: false,
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
    children: schema.documents.map((n) => ({
      ...transform(n, schema),
      isArray: false,
    })),
    isArray: true,
    // TODO: implement this
    canBeNull: false,
    canBeUndefined: false,
  };
}
