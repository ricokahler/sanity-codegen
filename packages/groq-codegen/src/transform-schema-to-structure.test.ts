import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { transformSchemaToStructure } from './transform-schema-to-structure';

describe('transformSchemaToStructure', () => {
  it('takes in a schema and outputs a Structure node', () => {
    const schema = schemaNormalizer([
      {
        type: 'document',
        name: 'book',
        fields: [{ name: 'title', type: 'string' }],
      },
    ]);

    const structure = transformSchemaToStructure({ schema });

    expect(structure).toMatchObject({
      type: 'Array',
      of: {
        type: 'Or',
        children: [
          {
            type: 'Object',
            properties: [{ key: '_type' }, { key: '_id' }, { key: 'title' }],
          },
        ],
      },
    });
  });

  // TODO: better description
  it('correctly converts arrays', () => {
    const schema = schemaNormalizer([
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

    const structure = transformSchemaToStructure({ schema });

    expect(structure).toMatchObject({
      type: 'Array',
      of: {
        type: 'Or',
        children: [
          {
            type: 'Object',
            properties: [
              { key: '_type', value: { type: 'String', value: 'book' } },
              { key: '_id', value: { type: 'String' } },
              {
                key: 'authors',
                value: {
                  type: 'Array',
                  of: {
                    type: 'Or',
                    children: [
                      {
                        type: 'Object',
                        properties: [
                          { key: 'name', value: { type: 'String' } },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
          },
        ],
      },
    });
  });
});
