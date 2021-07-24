import prettier from 'prettier';
import generate from '@babel/generator';
import { parse } from 'groq-js';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { transformSchemaToStructure } from '../transform-schema-to-structure';
import { transformStructureToTs } from '../transform-structure-to-ts';
import { narrowStructure } from './narrow-structure';

function print(filter: string, schemaTypes: any[]) {
  const schema = schemaNormalizer(schemaTypes);
  const narrowed = narrowStructure(
    transformSchemaToStructure({ normalizedSchema: schema }),
    parse(filter),
  );
  const result = transformStructureToTs({ structure: narrowed });

  return prettier.format(
    `${`type Query = ${generate(result.query).code}`}\n\n${Object.entries(
      result.references,
    )
      .map(([k, v]) => `type ${k} = ${generate(v).code}`)
      .join('\n\n')}`,
    { parser: 'typescript' },
  );
}

describe('narrow', () => {
  it('narrows the input types based on a filter', () => {
    const result = print(`_type == 'book'`, [
      {
        type: 'document',
        name: 'book',
        fields: [{ name: 'title', type: 'string' }],
      },
      {
        type: 'document',
        name: 'author',
        fields: [{ name: 'name', type: 'string' }],
      },
    ]);

    expect(result).toMatchInlineSnapshot(`
      "type Query = {
        _type: \\"book\\";
        _id: string;
        title?: string;
      }[];
      "
    `);
  });

  // TODO: make this test more readable
  it('does not unnecessarily narrow', () => {
    const result = print(`_type == 'book'`, [
      {
        type: 'document',
        name: 'book',
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

    expect(result).toMatchInlineSnapshot(`
      "type Query = {
        _type: \\"book\\";
        _id: string;
        authors?: {
          name?: string;
        }[];
      }[];
      "
    `);
  });
});
