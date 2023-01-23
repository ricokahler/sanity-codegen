import {
  imageAssetStructure,
  imageCropStructure,
  imageHotspotStructure,
} from './default-structures';
import { geopointStructure } from './default-structures/geopoint';
import { removeOptional, createStructure, objectHash } from './utils';

export interface TransformSchemaToStructureOptions {
  /**
   * An extracted and normalized schema result from the
   * `@sanity-codegen/extractor` package.
   */
  normalizedSchema: Sanity.SchemaDef.Schema;
}

/**
 * Takes in a schema (see the `@sanity-codegen/extractor` package) and
 * returns a `StructureNode`
 */
export function transformSchemaToStructure({
  normalizedSchema,
}: TransformSchemaToStructureOptions): Sanity.GroqCodegen.StructureNode {
  return createStructure({
    type: 'Array',
    of: createStructure({
      type: 'Or',
      children: normalizedSchema.documents
        .map((node) =>
          removeOptional(
            transformSchemaNodeToStructure({ node, normalizedSchema }),
          ),
        )
        // for consistent output
        .sort((a, b) => a.hash.localeCompare(b.hash, 'en')),
    }),
    canBeNull: false,
    canBeOptional: false,
  });
}

interface TransformSchemaNodeToStructureOptions {
  /**
   * the schema node (extracted from `@sanity-codegen/extractor`) that
   * will be converted to a structure node
   */
  node: Sanity.SchemaDef.SchemaNode;
  /**
   * An extracted and normalized schema result from the
   * `@sanity-codegen/extractor` package.
   */
  normalizedSchema: Sanity.SchemaDef.Schema;
}

/**
 * Takes in just one schema node and returns a `StructureNode`
 */
export function transformSchemaNodeToStructure({
  node,
  normalizedSchema,
}: TransformSchemaNodeToStructureOptions): Sanity.GroqCodegen.StructureNode {
  switch (node.type) {
    case 'RegistryReference': {
      const referencedType = [
        ...normalizedSchema.documents,
        ...normalizedSchema.registeredTypes,
      ].find((n) => n.name === node.to);

      // TODO: could show warning
      if (!referencedType) return createStructure({ type: 'Unknown' });

      return createStructure({
        type: 'Lazy',
        // Note that the hash inputs are a function of the resulting getter
        // value. This is necessary to prevent weird caching behavior.
        hashNamespace: 'TransformSchemaToStructure',
        // need to include a schema hash for tests because schemas can have
        // the same referencedType.name and cause unwanted collisions
        hashInput: `${objectHash(normalizedSchema)}:${referencedType.name}`,
        get: () =>
          transformSchemaNodeToStructure({
            node: referencedType,
            normalizedSchema,
          }),
      });
    }
    case 'Array': {
      return createStructure({
        type: 'Array',
        canBeNull: false,
        canBeOptional: !node.codegen.required,
        of: createStructure({
          type: 'Or',
          children: node.of.map((node) =>
            transformSchemaNodeToStructure({ node, normalizedSchema }),
          ),
        }),
      });
    }
    case 'Block': {
      return createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: !node.codegen.required,
        properties: [
          {
            key: '_key',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: null,
            }),
          },
          {
            key: '_type',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'block',
            }),
          },
          {
            key: 'children',
            value: createStructure({
              type: 'Array',
              canBeNull: false,
              // TODO: can this be marked as false?
              canBeOptional: false,
              of: createStructure({
                type: 'Or',
                children: [
                  // span
                  createStructure({
                    type: 'Object',
                    canBeNull: false,
                    canBeOptional: false,
                    properties: [
                      {
                        key: '_key',
                        value: createStructure({
                          type: 'String',
                          canBeOptional: false,
                          canBeNull: false,
                          value: null,
                        }),
                      },
                      {
                        key: '_type',
                        value: createStructure({
                          type: 'String',
                          canBeNull: false,
                          canBeOptional: false,
                          value: 'span',
                        }),
                      },
                      {
                        key: 'marks',
                        value: createStructure({
                          type: 'Array',
                          canBeNull: false,
                          canBeOptional: true,
                          of: createStructure({ type: 'Unknown' }),
                        }),
                      },
                      {
                        key: 'text',
                        value: createStructure({
                          type: 'String',
                          canBeNull: false,
                          canBeOptional: true,
                          value: null,
                        }),
                      },
                    ],
                  }),
                  // the rest
                  ...(node.of || []).map((child) =>
                    transformSchemaNodeToStructure({
                      node: child,
                      normalizedSchema,
                    }),
                  ),
                ],
              }),
            }),
          },
          {
            key: 'markDefs',
            value: createStructure({
              type: 'Array',
              canBeNull: false,
              // TODO: can this be marked as false?
              canBeOptional: true,
              // TODO:
              of: createStructure({ type: 'Unknown' }),
            }),
          },
          {
            key: 'style',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              // TODO: can this be marked as false?
              canBeOptional: true,
              value: null,
            }),
          },
        ],
      });
    }
    case 'Boolean': {
      return createStructure({
        type: 'Boolean',
        canBeNull: false,
        canBeOptional: !node.codegen.required,
      });
    }
    case 'Date':
    case 'Datetime':
    case 'String':
    case 'Text':
    case 'Url': {
      return createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: !node.codegen.required,
        value: null,
      });
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
          value: createStructure({
            type: 'String',
            canBeNull: false,
            canBeOptional: false,
            value: node.name,
          }),
        });

        properties.push({
          key: '_id',
          value: createStructure({
            type: 'String',
            canBeNull: false,
            canBeOptional: false,
            value: null,
          }),
        });
      }

      if (node.type === 'File') {
        properties.push({
          key: 'asset',
          value: createStructure({
            type: 'Reference',
            canBeNull: false,
            canBeOptional: false,
            to: createStructure({ type: 'Unknown' }),
          }),
        });
      }

      if (node.type === 'Image') {
        properties.push({
          key: 'asset',
          value: createStructure({
            type: 'Reference',
            canBeNull: false,
            canBeOptional: false,
            to: imageAssetStructure,
          }),
        });

        properties.push({ key: 'crop', value: imageCropStructure });
        properties.push({ key: 'hotspot', value: imageHotspotStructure });
      }

      const fieldProperties = node.fields?.map((field) => ({
        key: field.name,
        value: transformSchemaNodeToStructure({
          node: field.definition,
          normalizedSchema,
        }),
      }));

      if (fieldProperties) {
        for (const fieldProperty of fieldProperties) {
          properties.push(fieldProperty);
        }
      }

      return createStructure({
        type: 'Object',
        properties,
        canBeNull: false,
        canBeOptional: !node.codegen.required,
      });
    }

    case 'Geopoint': {
      return createStructure({
        ...(geopointStructure as Sanity.GroqCodegen.ObjectNode),
        canBeOptional: !node.codegen.required,
      });
    }

    case 'Number': {
      return createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: !node.codegen.required,
        value: null,
      });
    }

    case 'Reference': {
      return createStructure({
        type: 'Reference',
        to: createStructure({
          type: 'Or',
          children: node.to.map((node) =>
            transformSchemaNodeToStructure({ node, normalizedSchema }),
          ),
        }),
        canBeNull: false,
        canBeOptional: !node.codegen.required,
      });
    }

    case 'Slug': {
      return createStructure({
        type: 'Object',
        properties: [
          {
            key: '_type',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'slug',
            }),
          },
          {
            key: 'current',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: !node.codegen.required,
              value: null,
            }),
          },
          {
            key: 'source',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: true,
              value: null,
            }),
          },
        ],
        canBeNull: false,
        canBeOptional: !node.codegen.required,
      });
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
