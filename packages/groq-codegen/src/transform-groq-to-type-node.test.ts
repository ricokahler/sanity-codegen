import prettier from 'prettier';
import generate from '@babel/generator';
import { parse } from 'groq-js';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { transformGroqToTypeNode } from './transform-groq-to-type-node';
import { transformTypeNodeToTsType } from './transform-type-node-to-ts-type';

function print(query: string, schemaTypes: any[]) {
  const schema = schemaNormalizer(schemaTypes);
  const root = parse(query);

  const typeNode = transformGroqToTypeNode({
    node: root,
    schema,
    scopes: [],
  });

  const result = transformTypeNodeToTsType(typeNode);

  return prettier.format(
    `${`type Query = ${
      // @ts-expect-error `generate` is incorrectly typed
      generate(result.query).code
    }`}\n\n${Object.entries(result.references)
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

describe('transformGroqToTypeNode', () => {
  test('', () => {
    const result = print('*', [
      {
        type: 'document',
        name: 'book',
        fields: [{ name: 'name', type: 'string' }],
      },
    ]);

    expect(result).toMatchInlineSnapshot(`
      "type Query = {
        _type: \\"book\\";
        _id: string;
        name: string;
      }[];
      "
    `);
  });

  test('nested attribute access', () => {
    const schema = [
      {
        name: 'book',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          {
            name: 'author',
            type: 'object',
            fields: [
              {
                name: 'name',
                type: 'object',
                fields: [
                  { name: 'givenName', type: 'string' },
                  { name: 'surname', type: 'string' },
                ],
              },
            ],
          },
        ],
      },
    ];

    const query = `
      *[_type == 'book'] {
        title,
        'authorGivenName': author.name.givenName
      }
    `;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        title: string;
        authorGivenName: string;
      }[];
      "
    `);
  });

  test('top-level object with sub-queries', () => {
    const schema = [
      {
        type: 'document',
        name: 'book',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'author', type: 'reference', to: [{ type: 'author' }] },
        ],
      },
      {
        type: 'document',
        name: 'author',
        fields: [{ name: 'name', type: 'string' }],
      },
    ];

    const query = `
      {
        'books': *[_type == 'book'],
        'authors': *[_type == 'author']
      }
    `;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        books: {
          _type: \\"book\\";
          _id: string;
          title: string;
          author: Sanity.Reference<{
            _type: \\"author\\";
            _id: string;
            name: string;
          }>;
        }[];
        authors: {
          _type: \\"author\\";
          _id: string;
          name: string;
        }[];
      };
      "
    `);
  });

  test('filter with ands', () => {
    const schema = [
      {
        type: 'document',
        name: 'movie',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'popularity', type: 'number' },
          { name: 'releaseDate', type: 'date' },
        ],
      },
    ];

    const query = `
      *[_type == "movie" && popularity > 15 && releaseDate > "2016-04-25"]
    `;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        _type: \\"movie\\";
        _id: string;
        title: string;
        popularity: number;
        releaseDate: string;
      }[];
      "
    `);
  });

  test('deref', () => {
    const schema = [
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
        fields: [
          {
            name: 'name',
            type: 'object',
            fields: [
              { name: 'givenName', type: 'string' },
              { name: 'surname', type: 'string' },
            ],
          },
        ],
      },
    ];

    const query = `
      {
        'foo': *[_type == 'book'].author->name.givenName
      }
    `;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        foo: string[];
      };
      "
    `);
  });
});
