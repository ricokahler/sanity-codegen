import prettier from 'prettier';
import generate from '@babel/generator';
import { parse } from 'groq-js';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { transformGroqToStructure } from './transform-groq-to-structure';
import { transformStructureToTs } from './transform-structure-to-ts';

function print(query: string, schemaTypes: any[]) {
  const schema = schemaNormalizer(schemaTypes);
  const root = parse(query);

  const structure = transformGroqToStructure({
    node: root,
    normalizedSchema: schema,
    scopes: [],
  });

  const result = transformStructureToTs({ structure });

  return prettier.format(
    `${`type Query = ${generate(result.query).code}`}\n\n${Object.entries(
      result.references,
    )
      .map(([k, v]) => `type ${k} = ${generate(v).code}`)
      .join('\n\n')}`,
    { parser: 'typescript' },
  );
}

describe('transformGroqToStructure', () => {
  test('everything', () => {
    const schema = [
      {
        type: 'document',
        name: 'book',
        fields: [{ name: 'name', type: 'string' }],
      },
    ];
    const query = '*';

    const result = print(query, schema);
    expect(result).toMatchInlineSnapshot(`
      "type Query = {
        _type: \\"book\\";
        _id: string;
        name?: string;
      }[];
      "
    `);
  });

  test('element access', () => {
    const schema = [
      {
        name: 'doc',
        type: 'document',
        fields: [
          {
            name: 'array',
            type: 'array',
            of: [{ name: 'number', type: 'number' }],
          },
        ],
      },
    ];

    const query = `(*[_type == 'doc'][0].array[])[0]`;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = number | null;
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
        title: string | null;
        authorGivenName: string | null;
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
          title?: string;
          author?: Sanity.Reference<Ref_f660DNqVmvjOxRqf>;
        }[];
        authors: {
          _type: \\"author\\";
          _id: string;
          name?: string;
        }[];
      };

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
        title?: string;
        popularity?: number;
        releaseDate?: string;
      }[];
      "
    `);
  });

  test('preserve arrays', () => {
    const schema = [
      {
        name: 'book',
        type: 'document',
        fields: [{ name: 'title', type: 'string' }],
      },
    ];

    const query = `*[_type == 'book'].title`;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = (string | null)[];
      "
    `);
  });

  test('dereferencing', () => {
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
      *[_type == 'book'] {author->}
    `;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        author?: {
          _type: \\"author\\";
          _id: string;
          name?: {
            givenName?: string;
            surname?: string;
          };
        } | null;
      }[];
      "
    `);
  });

  test('grouping', () => {
    const query = `
      ({ 'foo': *[_type == 'book'].name }).foo
    `;

    const schema = [
      {
        name: 'book',
        type: 'document',
        fields: [{ name: 'name', type: 'string' }],
      },
    ];

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = (string | null)[];
      "
    `);
  });

  test('slices', () => {
    const query = `
      {
        'firstThreeBooks': *[_type == 'book'][0...3],
        'firstThreeTitles': (*[_type == 'book'].title)[0...3],
      }
    `;

    const schema = [
      {
        name: 'book',
        type: 'document',
        fields: [{ name: 'title', type: 'string' }],
      },
    ];

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        firstThreeBooks: {
          _type: \\"book\\";
          _id: string;
          title?: string;
        }[];
        firstThreeTitles: (string | null)[];
      };
      "
    `);
  });

  test('flatmap', () => {
    const query = `*[_type == 'book'].authors[].names[].name`;

    const schema = [
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
                fields: [
                  {
                    name: 'names',
                    type: 'array',
                    of: [
                      {
                        type: 'object',
                        fields: [{ name: 'name', type: 'string' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = (string | null)[];
      "
    `);
  });

  test('object splat', () => {
    const schema = [
      {
        name: 'book',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          {
            name: 'author',
            type: 'object',
            fields: [{ name: 'name', type: 'string' }],
          },
          { name: 'publishDate', type: 'date' },
        ],
      },
    ];

    const query = `*[_type == 'book'] { ..., 'author': author.name }`;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        _type: \\"book\\";
        _id: string;
        title?: string;
        author: string | null;
        publishDate?: string;
      }[];
      "
    `);
  });

  test('tuples', () => {
    const schema = [
      {
        name: 'book',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'slug', type: 'slug' },
        ],
      },
    ];

    // a tuple that utilizes scopes
    // the second param includes a projection
    const query = `*[_type == 'book'] { 'tuple': [title, slug {current}] }`;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        tuple: [
          string | null,
          {
            current: string | null;
          }
        ];
      }[];
      "
    `);
  });

  test('array literals with spreads', () => {
    const schema = [
      {
        name: 'book',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'slug', type: 'slug' },
        ],
      },
    ];

    const query = `[...*[_type == 'book'].title, ...*[_type == 'book'].slug.current]`;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = ((string | null) | (string | null))[];
      "
    `);
  });

  test('literal values', () => {
    const query = `{'hello': 'world', 'foo': {'bar': 4, 'beep': false}}`;

    expect(print(query, [])).toMatchInlineSnapshot(`
      "type Query = {
        hello: \\"world\\";
        foo: {
          bar: number;
          beep: boolean;
        };
      };
      "
    `);
  });

  test('boolean operators', () => {
    expect(print('true && true || (false || true)', [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
    expect(print('!false', [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
  });

  test('arithmetic operators', () => {
    expect(print('4 * 5', [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
    expect(print('4 ** 5', [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
    expect(print('4 - 5', [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
    expect(print('4 / 5', [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
    expect(print('4 % 5', [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
    expect(print("4 % 'nonsense'", [])).toMatchInlineSnapshot(`
      "type Query = unknown;
      "
    `);
    expect(print('-4', [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
    expect(print('+4', [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
  });

  test('logic operators', () => {
    expect(print('4 <= 5', [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
    expect(print('4 < 5', [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
    expect(print('4 > 5', [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
    expect(print('4 >= 5', [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
    expect(print("4 < 'nonsense'", [])).toMatchInlineSnapshot(`
      "type Query = unknown;
      "
    `);
  });

  test('equality/membership', () => {
    expect(print("_type == 'book'", [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
    expect(print("_type != 'book'", [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
    expect(print("_type in ['book']", [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
    expect(print("value match 'text'", [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
    expect(print('3 in 2...4', [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
  });

  test('+ concatenation with strings', () => {
    expect(print("'hello' + 'world'", [])).toMatchInlineSnapshot(`
      "type Query = \\"helloworld\\";
      "
    `);
    expect(print("4 + 'nonsense'", [])).toMatchInlineSnapshot(`
      "type Query = unknown;
      "
    `);
  });

  test('+ concatenation with numbers', () => {
    expect(print('4 + 5', [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
  });

  test('parent operator', () => {
    const schema = [
      {
        name: 'person',
        type: 'document',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'child', type: 'person' },
        ],
      },
    ];

    const query = `
      *[_type == 'person'] {
        name,
        child {
          name,
          'parentName': ^.name
        }
      }
    `;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        name: string | null;
        child: {
          name: Ref_9R9gymHBbUQvcqZ4;
          parentName: string | null;
        };
      }[];

      type Ref_9R9gymHBbUQvcqZ4 = string | null;
      "
    `);
  });
});
