import { transformSchemaToStructure } from './transform-schema-to-structure';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { transformStructureToTs } from './transform-structure-to-ts';
import { createStructure } from './utils';
import generate from '@babel/generator';
import prettier from 'prettier';

function print({
  query,
  references,
}: ReturnType<typeof transformStructureToTs>) {
  return prettier.format(
    `${`type Everything = ${generate(query).code}`}\n\n${Object.entries(
      references,
    )
      .map(([k, v]) => `type ${k} = ${generate(v).code}`)
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
    const result = transformStructureToTs({ structure: everythingNode });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = (
        | {
            _type: \\"book\\";
            _id: string;
            title?: string;
            author?: {
              name?: string;
            };
          }
        | {
            _type: \\"movie\\";
            _id: string;
            title?: string;
            leadActor?: {
              name?: string;
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

    const structure = transformSchemaToStructure({ normalizedSchema: schema });
    const result = transformStructureToTs({ structure });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = {
        _type: \\"jsonDoc\\";
        _id: string;
        jsonLike?: Ref_OPCr9vJ2bTocbVvm;
      }[];

      type Ref_OPCr9vJ2bTocbVvm = (
        | string
        | number
        | boolean
        | Ref_OPCr9vJ2bTocbVvm[]
        | {
            properties?: {
              key?: string;
              value?: Ref_OPCr9vJ2bTocbVvm;
            }[];
          }
      )[];
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
    const result = transformStructureToTs({ structure });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = (
        | {
            _type: \\"book\\";
            _id: string;
            title?: string;
            author?: Sanity.Reference<Ref_f660DNqVmvjOxRqf>;
          }
        | {
            _type: \\"author\\";
            _id: string;
            name?: string;
          }
      )[];

      type Ref_f660DNqVmvjOxRqf =
        | {
            _type: \\"author\\";
            _id: string;
            name?: string;
          }
        | undefined;
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

    const result = transformStructureToTs({ structure });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = {
        a: {
          _type: \\"requiredDoc\\";
          _id: string;
          requiredString: string;
          optionalString?: string;
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
