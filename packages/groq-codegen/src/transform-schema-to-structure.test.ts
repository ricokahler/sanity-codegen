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

    const structure = transformSchemaToStructure(schema);

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
});
