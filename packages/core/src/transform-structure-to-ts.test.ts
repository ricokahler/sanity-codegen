import { transformSchemaToStructure } from './transform-schema-to-structure';
import { schemaNormalizer } from './schema-normalizer';
import { transformStructureToTs } from './transform-structure-to-ts';
import { createStructure } from './utils';
import generate from '@babel/generator';
import prettier from 'prettier';

function print({
  tsType,
  declarations,
}: ReturnType<typeof transformStructureToTs>) {
  return prettier.format(
    `${`type Everything = ${generate(tsType).code}`}\n\n${Object.values(
      declarations,
    )
      .map((declaration) => generate(declaration).code)
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

    const everythingNode = transformSchemaToStructure({
      normalizedSchema: schema,
    });
    const result = transformStructureToTs({
      structure: everythingNode,
      substitutions: {},
    });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = (
        | {
            _id: string;
            _type: "movie";
            leadActor?: {
              name?: string;
            };
            title?: string;
          }
        | {
            _id: string;
            _type: "book";
            author?: {
              name?: string;
            };
            title?: string;
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

    const structure = transformSchemaToStructure({ normalizedSchema: schema });
    const result = transformStructureToTs({ structure, substitutions: {} });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = {
        _id: string;
        _type: "jsonDoc";
        jsonLike?: Sanity.Ref.Ref_uyG7JkRVccU1HuUn;
      }[];

      namespace Sanity.Ref {
        type Ref_uyG7JkRVccU1HuUn = (
          | boolean
          | string
          | {
              properties?: {
                key?: string;
                value?: Sanity.Ref.Ref_uyG7JkRVccU1HuUn;
              }[];
            }
          | number
          | Sanity.Ref.Ref_uyG7JkRVccU1HuUn[]
        )[];
      }
      "
    `);
  });

  it('transforms references', () => {
    const schema = schemaNormalizer([
      {
        name: 'book',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'author', type: 'reference', to: [{ type: 'author' }] },
        ],
      },
      {
        name: 'author',
        type: 'document',
        fields: [{ name: 'name', type: 'string' }],
      },
    ]);

    const structure = transformSchemaToStructure({ normalizedSchema: schema });
    const result = transformStructureToTs({ structure, substitutions: {} });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = (
        | {
            _id: string;
            _type: "author";
            name?: string;
          }
        | {
            _id: string;
            _type: "book";
            author?: Sanity.Reference<Sanity.Ref.Ref_HdGcFofEAyT3OHPP>;
            title?: string;
          }
      )[];

      namespace Sanity.Ref {
        type Ref_HdGcFofEAyT3OHPP =
          | {
              _id: string;
              _type: "author";
              name?: string;
            }
          | undefined;
      }
      "
    `);
  });

  it('correctly encodes `undefined`s and `null`s', () => {
    const schema = schemaNormalizer([
      {
        name: 'requiredDoc',
        type: 'document',
        fields: [
          {
            name: 'requiredString',
            type: 'string',
            codegen: { required: true },
          },
          {
            name: 'optionalString',
            type: 'string',
          },
        ],
      },
    ]);

    const schemaStructure = transformSchemaToStructure({
      normalizedSchema: schema,
    });

    const structureWithNulls = createStructure({
      type: 'Object',
      canBeNull: true,
      canBeOptional: false,
      properties: [
        {
          key: 'foo',
          value: createStructure({
            type: 'String',
            canBeNull: false,
            canBeOptional: false,
            value: null,
          }),
        },
      ],
    });

    const structure = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        { key: 'a', value: schemaStructure },
        { key: 'b', value: structureWithNulls },
      ],
    });

    const result = transformStructureToTs({ structure, substitutions: {} });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = {
        a: {
          _id: string;
          _type: "requiredDoc";
          optionalString?: string;
          requiredString: string;
        }[];
        b: {
          foo: string;
        } | null;
      };
      "
    `);
  });

  // might be better for another test file
  it.todo('arrays and `_key`s');
});
