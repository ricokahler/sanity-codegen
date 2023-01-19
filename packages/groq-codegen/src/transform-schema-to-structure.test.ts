import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { transformSchemaToStructure } from './transform-schema-to-structure';

describe('transformSchemaToStructure', () => {
  it('takes in a schema and outputs a Structure node', () => {
    const normalizedSchema = schemaNormalizer([
      {
        type: 'document',
        name: 'book',
        fields: [{ name: 'title', type: 'string' }],
      },
    ]);

    const structure = transformSchemaToStructure({ normalizedSchema });

    expect(structure).toMatchObject({
      type: 'Array',
      of: {
        type: 'Object',
        properties: [{ key: '_type' }, { key: '_id' }, { key: 'title' }],
      },
    });
  });

  // TODO: better description
  it('correctly converts arrays', () => {
    const normalizedSchema = schemaNormalizer([
      {
        name: 'book',
        type: 'document',
        fields: [
          {
            name: 'authors',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'author',
                fields: [{ name: 'name', type: 'string' }],
              },
            ],
          },
        ],
      },
    ]);

    const structure = transformSchemaToStructure({ normalizedSchema });

    expect(structure).toMatchObject({
      type: 'Array',
      of: {
        type: 'Object',
        properties: [
          { key: '_type', value: { type: 'String', value: 'book' } },
          { key: '_id', value: { type: 'String' } },
          {
            key: 'authors',
            value: {
              type: 'Array',
              of: {
                type: 'Object',
                properties: [{ key: 'name', value: { type: 'String' } }],
              },
            },
          },
        ],
      },
    });
  });

  it('works with Blocks', () => {
    const normalizedSchema = schemaNormalizer([
      {
        name: 'book',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          {
            name: 'description',
            type: 'array',
            of: [
              {
                type: 'block',
                of: [
                  { type: 'footNote' },
                  {
                    type: 'object',
                    name: 'inlineDefinition',
                    fields: [{ name: 'num', type: 'number' }],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'footNote',
        type: 'object',
        fields: [{ name: 'note', type: 'string' }],
      },
    ]);

    const structure = transformSchemaToStructure({ normalizedSchema });

    expect(structure).toMatchObject({
      type: 'Array',
      of: {
        type: 'Object',
        properties: [
          { key: '_type', value: { type: 'String', value: 'book' } },
          { key: '_id', value: { type: 'String' } },
          { key: 'title', value: { type: 'String' } },
          {
            key: 'description',
            value: {
              type: 'Array',
              of: {
                type: 'Object',
                properties: [
                  { key: '_key', value: { type: 'String' } },
                  { key: '_type', value: { type: 'String', value: 'block' } },
                  {
                    key: 'children',
                    value: {
                      type: 'Array',
                      of: {
                        type: 'Or',
                        children: [
                          {
                            type: 'Object',
                            properties: [
                              { key: 'num', value: { type: 'Number' } },
                            ],
                          },
                          { type: 'Lazy' },
                          {
                            type: 'Object',
                            properties: [
                              { key: '_key', value: { type: 'String' } },
                              {
                                key: '_type',
                                value: { type: 'String', value: 'span' },
                              },
                              {
                                key: 'marks',
                                value: {
                                  type: 'Array',
                                  of: { type: 'Unknown' },
                                },
                              },
                              { key: 'text', value: { type: 'String' } },
                            ],
                          },
                        ],
                      },
                    },
                  },
                  {
                    key: 'markDefs',
                    value: { type: 'Array', of: { type: 'Unknown' } },
                  },
                  { key: 'style', value: { type: 'String' } },
                ],
              },
            },
          },
        ],
      },
    });
  });
});
