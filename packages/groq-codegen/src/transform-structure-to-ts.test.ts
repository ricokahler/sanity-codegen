import { transformSchemaToStructure } from './transform-schema-to-structure';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { transformStructureToTs } from './transform-structure-to-ts';
import generate from '@babel/generator';
import prettier from 'prettier';

function print({
  query,
  references,
}: ReturnType<typeof transformStructureToTs>) {
  return prettier.format(
    `${`type Everything = ${
      // @ts-expect-error `generate` is incorrectly typed
      generate(query).code
    }`}\n\n${Object.entries(references)
      .map(
        ([k, v]) =>
          `type ${k} = ${
            // @ts-expect-error `generate` is incorrectly typed
            generate(v).code
          }`,
      )
      .join('\n\n')}`,
    { parser: 'typescript' },
  );
}

describe('transformStructureToTs', () => {
  it('creates `TSType`s from `StructureNode`s', () => {
    const schema = schemaNormalizer([
      {
        name: 'book',
        type: 'document',
        fields: [
          {
            name: 'title',
            type: 'string',
          },
          {
            name: 'author',
            type: 'object',
            fields: [{ name: 'name', type: 'string' }],
          },
        ],
      },
      {
        name: 'movie',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          {
            name: 'leadActor',
            type: 'object',
            fields: [{ name: 'name', type: 'string' }],
          },
        ],
      },
    ]);

    const everythingNode = transformSchemaToStructure({ schema });
    const result = transformStructureToTs({ structure: everythingNode });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = (
        | {
            _type: \\"book\\";
            _id: string;
            title: string;
            author: {
              name: string;
            };
          }
        | {
            _type: \\"movie\\";
            _id: string;
            title: string;
            leadActor: {
              name: string;
            };
          }
      )[];
      "
    `);
  });

  it('creates named aliases when recursive definitions are found', () => {
    const schema = schemaNormalizer([
      {
        name: 'jsonLike',
        type: 'array',
        of: [
          { name: 'stringLike', type: 'string' },
          { name: 'numberLike', type: 'number' },
          { name: 'booleanLike', type: 'boolean' },
          { name: 'arrayLike', type: 'array', of: [{ type: 'jsonLike' }] },
          {
            name: 'objectLike',
            type: 'object',
            fields: [
              {
                name: 'properties',
                type: 'array',
                of: [
                  {
                    type: 'object',
                    name: 'propertyPair',
                    fields: [
                      { name: 'key', type: 'string' },
                      { name: 'value', type: 'jsonLike' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'jsonDoc',
        type: 'document',
        fields: [{ name: 'jsonLike', type: 'jsonLike' }],
      },
    ]);

    const everythingNode = transformSchemaToStructure({ schema });
    const result = transformStructureToTs({ structure: everythingNode });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = {
        _type: \\"jsonDoc\\";
        _id: string;
        jsonLike: (
          | string
          | number
          | boolean
          | Ref_f7g82l[]
          | {
              properties: {
                key: string;
                value: Ref_f7g82l;
              }[];
            }
        )[];
      }[];

      type Ref_f7g82l = (
        | string
        | number
        | boolean
        | Ref_f7g82l[]
        | {
            properties: {
              key: string;
              value: Ref_f7g82l;
            }[];
          }
      )[];
      "
    `);
  });
});
