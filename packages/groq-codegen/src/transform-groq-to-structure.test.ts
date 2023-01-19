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
        _id: string;
        _type: "book";
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
        authorGivenName: string | null;
        title: string | null;
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
        'books': *[_type == 'book'] { 'authorName': author->name, ... },
        'authors': *[_type == 'author']
      }
    `;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        authors: {
          _id: string;
          _type: "author";
          name?: string;
        }[];
        books: {
          _id: string;
          _type: "book";
          author?: Sanity.Reference<Ref_HdGcFofEAyT3OHPP>;
          authorName: string | null;
          title?: string;
        }[];
      };

      type Ref_HdGcFofEAyT3OHPP =
        | {
            _id: string;
            _type: "author";
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
        _id: string;
        _type: "movie";
        popularity?: number;
        releaseDate?: string;
        title?: string;
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
        author: {
          _id: string;
          _type: "author";
          name?: {
            givenName?: string;
            surname?: string;
          };
        } | null;
      }[];
      "
    `);
  });

  test('conditional splat', () => {
    const query = `*[_type=='movie']{
      ...,
      releaseDate >= '2018-06-01' => {
        "kind": 'new',
        "screenings": *[_type == 'screening' && movie._ref == ^._id],
        "news": *[_type == 'news' && movie._ref == ^._id],
      },
      popularity > 20 && rating > 7.0 => {
        "kind": 'popular',
        "awards": *[_type == 'award' && movie._ref == ^._id],
      },
    }`;

    const schema = [
      {
        name: 'movie',
        type: 'document',
        fields: [
          { name: 'releaseDate', type: 'date', codegen: { required: true } },
          { name: 'popularity', type: 'number', codegen: { required: true } },
          { name: 'rating', type: 'number', codegen: { required: true } },
        ],
      },
      {
        name: 'screening',
        type: 'document',
        fields: [
          {
            name: 'screeningTitle',
            type: 'string',
            codegen: { required: true },
          },
        ],
      },
      {
        name: 'news',
        type: 'document',
        fields: [
          { name: 'newsTitle', type: 'string', codegen: { required: true } },
        ],
      },
      {
        name: 'award',
        type: 'document',
        fields: [
          { name: 'awardTitle', type: 'string', codegen: { required: true } },
        ],
      },
    ];

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        _id: string;
        _type: "movie";
        awards?: {
          _id: string;
          _type: "award";
          awardTitle: string;
        }[];
        kind?: "new" | "popular";
        news?: {
          _id: string;
          _type: "news";
          newsTitle: string;
        }[];
        popularity: number;
        rating: number;
        releaseDate: string;
        screenings?: {
          _id: string;
          _type: "screening";
          screeningTitle: string;
        }[];
      }[];
      "
    `);
  });

  test('select operator', () => {
    const query = `
      *[_type == 'movie'] {
        ...,
        "popularity": select(
          popularity > 20 => "high",
          popularity > 10 => "medium",
          "low"
        )
      }
    `;

    const schema = [
      {
        name: 'movie',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'popularity', type: 'number' },
        ],
      },
    ];

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        _id: string;
        _type: "movie";
        popularity: "medium" | "high" | "low";
        title?: string;
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
          _id: string;
          _type: "book";
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
        _id: string;
        _type: "book";
        author: string | null;
        publishDate?: string;
        title?: string;
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

    const query = `[...*[_type == 'book'] { title }, ...*[_type == 'book'] { 'slug': slug.current }]`;

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = (
        | {
            title: string | null;
          }
        | {
            slug: string | null;
          }
      )[];
      "
    `);
  });

  test('literal values', () => {
    const query = `{'hello': 'world', 'foo': {'bar': 4, 'beep': false}}`;

    expect(print(query, [])).toMatchInlineSnapshot(`
      "type Query = {
        foo: {
          bar: number;
          beep: boolean;
        };
        hello: "world";
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
      "type Query = "helloworld";
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
        child: {
          name: Ref_KEV5aXwQE8jV7ZPn;
          parentName: string | null;
        };
        name: string | null;
      }[];

      type Ref_KEV5aXwQE8jV7ZPn = string | null;
      "
    `);
  });

  test('ordering', () => {
    const query = `*[_type == "movie"] | order(_createdAt asc)`;

    const schema = [
      {
        name: 'movie',
        type: 'document',
        fields: [{ name: 'title', type: 'string' }],
      },
    ];

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        _id: string;
        _type: "movie";
        title?: string;
      }[];
      "
    `);
  });

  test('scoring', () => {
    const query = `
      *[_type == "post"] 
        | score(
          title match "GROQ" || description match "GROQ",
          boost(movieRating > 8, 3)
        ) 
        | order(_score desc) 
        { _score, title }
    `;

    const schema = [
      {
        name: 'post',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'movieRating', type: 'number' },
        ],
      },
    ];

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        _score: number;
        title: string | null;
      }[];
      "
    `);
  });

  test('coalesce', () => {
    const query = `
      *[_type == 'movie'] { 'displayName': coalesce(title, popularity) }
    `;

    const schema = [
      {
        name: 'movie',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'popularity', type: 'number' },
        ],
      },
    ];

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        displayName: (string | null) | (number | null);
      }[];
      "
    `);
  });

  test('count', () => {
    const query = `count([])`;

    expect(print(query, [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
  });

  test('defined', () => {
    const query = `defined(null)`;

    expect(print(query, [])).toMatchInlineSnapshot(`
      "type Query = boolean;
      "
    `);
  });

  test('identity', () => {
    const query = `identity()`;

    expect(print(query, [])).toMatchInlineSnapshot(`
      "type Query = string;
      "
    `);
  });

  test('length', () => {
    expect(print(`length([1,2,3])`, [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
    expect(print(`length('testing')`, [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
    expect(
      print(`length((*[_type == 'foo'][0]).foo)`, [
        {
          name: 'foo',
          type: 'document',
          fields: [{ name: 'foo', type: 'string' }],
        },
      ]),
    ).toMatchInlineSnapshot(`
      "type Query = number | null;
      "
    `);
  });

  test('upper/lower', () => {
    expect(print(`upper('test')`, [])).toMatchInlineSnapshot(`
      "type Query = "TEST";
      "
    `);
    expect(print(`lower('TEST')`, [])).toMatchInlineSnapshot(`
      "type Query = "test";
      "
    `);
  });

  test('now', () => {
    expect(print(`now()`, [])).toMatchInlineSnapshot(`
      "type Query = string;
      "
    `);
  });

  test('round', () => {
    expect(print(`round(4.5)`, [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
    expect(print(`round(4.5, 2)`, [])).toMatchInlineSnapshot(`
      "type Query = number;
      "
    `);
    expect(print(`round('nope', 'wrong')`, [])).toMatchInlineSnapshot(`
      "type Query = unknown;
      "
    `);
  });

  test('parameter', () => {
    const query = `*[_type == 'movie' && slug.current == $slug] {
      'inputSlug': $slug,
      ...,
    }`;

    const schema = [
      {
        name: 'movie',
        type: 'document',
        fields: [
          { name: 'slug', type: 'slug' },
          { name: 'title', type: 'string' },
        ],
      },
      {
        name: 'person',
        type: 'document',
        fields: [{ name: 'name', type: 'string' }],
      },
    ];

    expect(print(query, schema)).toMatchInlineSnapshot(`
      "type Query = {
        _id: string;
        _type: "movie";
        inputSlug: unknown;
        slug?: {
          _type: "slug";
          current?: string;
          source?: string;
        };
        title?: string;
      }[];
      "
    `);
  });
});
