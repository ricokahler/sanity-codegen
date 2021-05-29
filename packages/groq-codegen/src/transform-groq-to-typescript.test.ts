import { assertGroqTypeOutput } from '../fixtures/assert-groq-type-output';

describe('Filter', () => {
  it('parses the filter node for types and transforms to extractions', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          type: 'document',
          name: 'book',
          fields: [
            {
              name: 'title',
              type: 'string',
              codegen: { required: true },
              validation: (Rule) => Rule.required(),
            },
          ],
        },
      ],
      query: `*[_type == "book"]`,
      expectedType: `Sanity.Schema.Book[]`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.MultiExtract<
          Sanity.Schema.Document[],
          {
            _type: 'book';
          }
        >
      >;"
    `);
  });

  it('transforms and parses filter nodes that include && and ||', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          type: 'document',
          name: 'book',
          fields: [
            {
              name: 'title',
              type: 'string',
              codegen: { required: true },
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'writer',
              type: 'object',
              fields: [{ name: 'name', type: 'string' }],
            },
          ],
        },
        {
          type: 'document',
          name: 'movie',
          fields: [
            {
              name: 'writer',
              type: 'object',
              fields: [{ name: 'name', type: 'number' }],
            },
          ],
        },
      ],
      query: `*[(_type == "book" || "movie" == _type) && writer.name == "foo"]`,
      expectedType: `Array<Sanity.Schema.Book | Sanity.Schema.Movie>`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.MultiExtract<
          Sanity.Schema.Document[],
          (
            | {
                _type: 'book';
              }
            | {
                _type: 'movie';
              }
          ) &
            unknown
        >
      >;"
    `);
  });
});

describe('Attribute', () => {
  it('transforms Attribute nodes', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          type: 'document',
          name: 'book',
          fields: [
            { name: 'title', type: 'string' },
            {
              name: 'author',
              type: 'object',
              fields: [{ name: 'name', type: 'string' }],
            },
          ],
        },
      ],
      query: `*[_type == "book"].author.name`,
      expectedType: `
          Array<string | null>
        `,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.IndexedAccess<
          Sanity.IndexedAccess<
            Sanity.MultiExtract<
              Sanity.Schema.Document[],
              {
                _type: 'book';
              }
            >,
            'author'
          >,
          'name'
        >
      >;"
    `);
  });

  it('transforms Attribute nodes with no nullables', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          type: 'document',
          name: 'book',
          fields: [
            { name: 'title', type: 'string' },
            {
              name: 'author',
              type: 'object',
              fields: [
                {
                  name: 'name',
                  type: 'string',
                  // note codegen required true
                  codegen: { required: true },
                },
              ],
              // note codegen required true
              codegen: { required: true },
            },
          ],
        },
      ],
      query: `*[_type == "book"].author.name`,
      // because both author and name are required, the result type will not
      // have null
      expectedType: `string[]`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.IndexedAccess<
          Sanity.IndexedAccess<
            Sanity.MultiExtract<
              Sanity.Schema.Document[],
              {
                _type: 'book';
              }
            >,
            'author'
          >,
          'name'
        >
      >;"
    `);
  });

  it('transform Attribute nodes including null if part of the chain is null', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          type: 'document',
          name: 'book',
          fields: [
            { name: 'title', type: 'string' },
            {
              name: 'author',
              type: 'object',
              fields: [
                {
                  name: 'name',
                  type: 'string',
                  // note codegen required true
                  codegen: { required: true },
                },
              ],
              // note codegen required `false` here.
              // this will make the resulting type include `null`
              codegen: { required: false },
            },
          ],
        },
      ],
      query: `*[_type == "book"].author.name`,
      // because both author and name are required, the result type will not
      // have null
      expectedType: `Array<string | null>`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.IndexedAccess<
          Sanity.IndexedAccess<
            Sanity.MultiExtract<
              Sanity.Schema.Document[],
              {
                _type: 'book';
              }
            >,
            'author'
          >,
          'name'
        >
      >;"
    `);
  });
});

describe('Element', () => {
  it('transform Element nodes, removing the `Array` from the type', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          type: 'document',
          name: 'book',
          fields: [
            { name: 'title', type: 'string' },
            {
              name: 'author',
              type: 'object',
              fields: [{ name: 'name', type: 'string' }],
            },
          ],
        },
      ],
      query: `*[_type == "book"][0]`,
      expectedType: `Sanity.Schema.Book | null`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.ArrayElementAccess<
          Sanity.MultiExtract<
            Sanity.Schema.Document[],
            {
              _type: 'book';
            }
          >
        >
      >;"
    `);
  });
});

describe('Object/Projection', () => {
  it('works with object literals top-level', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          type: 'document',
          name: 'book',
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
      ],
      query: `{"books": *[_type == "book"]}`,
      expectedType: `{ books: Sanity.Schema.Book[] }`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.ObjectMap<
          unknown,
          {
            books: Sanity.MultiExtract<
              Sanity.Schema.Document[],
              {
                _type: 'book';
              }
            >;
          },
          'without_splat'
        >
      >;"
    `);
  });

  it('transforms projections, picking matching properties, supporting aliases', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          type: 'document',
          name: 'book',
          fields: [
            {
              name: 'title',
              type: 'string',
              codegen: { required: true },
            },
            {
              name: 'nonRequired',
              type: 'string',
            },
            {
              name: 'author',
              type: 'object',
              fields: [{ name: 'name', type: 'string' }],
            },
          ],
        },
      ],
      query: `
        *[_type == "book"] {
          title,
          nonRequired,
          "authorName": author.name,
          "authorAlias": author
        }
      `,
      expectedType: `Array<{
        title: string;
        nonRequired: string | null;
        authorName: string | null;
        authorAlias: { name?: string; } | null;
      }>`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.ObjectMap<
          Sanity.MultiExtract<
            Sanity.Schema.Document[],
            {
              _type: 'book';
            }
          >,
          {
            title: Sanity.IndexedAccess<
              Sanity.MultiExtract<
                Sanity.Schema.Document[],
                {
                  _type: 'book';
                }
              >,
              'title'
            >;
            nonRequired: Sanity.IndexedAccess<
              Sanity.MultiExtract<
                Sanity.Schema.Document[],
                {
                  _type: 'book';
                }
              >,
              'nonRequired'
            >;
            authorName: Sanity.IndexedAccess<
              Sanity.IndexedAccess<
                Sanity.MultiExtract<
                  Sanity.Schema.Document[],
                  {
                    _type: 'book';
                  }
                >,
                'author'
              >,
              'name'
            >;
            authorAlias: Sanity.IndexedAccess<
              Sanity.MultiExtract<
                Sanity.Schema.Document[],
                {
                  _type: 'book';
                }
              >,
              'author'
            >;
          },
          'without_splat'
        >
      >;"
    `);
  });

  it('transforms projections with splats', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          type: 'document',
          name: 'book',
          fields: [
            {
              name: 'title',
              type: 'string',
              codegen: { required: true },
            },
            {
              name: 'nonRequiredA',
              type: 'string',
            },
            {
              name: 'nonRequiredB',
              type: 'string',
            },
            {
              name: 'author',
              type: 'object',
              fields: [{ name: 'name', type: 'string' }],
            },
          ],
        },
      ],
      query: `*[_type == "book"] { "author": author.name, nonRequiredA, ... }`,
      expectedType: `
        Array<{
          _createdAt: string;
          _id: string;
          _type: 'book';
          _updatedAt: string;
          _rev: string;
          title: string;
          
          // this key replaces the original author type
          author: string | null;

          // note that this one is not optional because it was specified
          // specifically in the projection
          nonRequiredA: string | null;

          // this one is optional because it wasn't specified
          // (and is thus part of the splat)
          nonRequiredB?: string;
        }>
      `,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.ObjectMap<
          Sanity.MultiExtract<
            Sanity.Schema.Document[],
            {
              _type: 'book';
            }
          >,
          {
            author: Sanity.IndexedAccess<
              Sanity.IndexedAccess<
                Sanity.MultiExtract<
                  Sanity.Schema.Document[],
                  {
                    _type: 'book';
                  }
                >,
                'author'
              >,
              'name'
            >;
            nonRequiredA: Sanity.IndexedAccess<
              Sanity.MultiExtract<
                Sanity.Schema.Document[],
                {
                  _type: 'book';
                }
              >,
              'nonRequiredA'
            >;
          },
          'with_splat'
        >
      >;"
    `);
  });
});

describe('Deref', () => {
  it('dereferences reference types', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          name: 'book',
          type: 'document',
          fields: [
            { name: 'author', type: 'reference', to: [{ type: 'author' }] },
          ],
        },
        {
          name: 'author',
          type: 'document',
          fields: [{ name: 'name', type: 'string' }],
        },
      ],
      query: `*[_type == 'book'] { author-> }`,
      expectedType: `
        Array<{
          author: {
            _type: 'author';
            _createdAt: string;
            _id: string;
            _updatedAt: string;
            _rev: string;
            name?: string
          } | null;
        }>
      `,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.ObjectMap<
          Sanity.MultiExtract<
            Sanity.Schema.Document[],
            {
              _type: 'book';
            }
          >,
          {
            author: Sanity.ReferenceType<
              Sanity.IndexedAccess<
                Sanity.MultiExtract<
                  Sanity.Schema.Document[],
                  {
                    _type: 'book';
                  }
                >,
                'author'
              >
            >;
          },
          'without_splat'
        >
      >;"
    `);
  });

  it('dereferences reference types keeping non-nullables', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          name: 'book',
          type: 'document',
          fields: [
            {
              name: 'author',
              type: 'reference',
              to: [{ type: 'author' }],
              // this should remove `null` from the type
              codegen: { required: true },
            },
          ],
        },
        {
          name: 'author',
          type: 'document',
          fields: [{ name: 'name', type: 'string' }],
        },
      ],
      query: `*[_type == 'book'] { author-> }`,
      expectedType: `
        Array<{
          author: {
            _type: 'author';
            _createdAt: string;
            _id: string;
            _updatedAt: string;
            _rev: string;
            name?: string
          };
        }>
      `,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.ObjectMap<
          Sanity.MultiExtract<
            Sanity.Schema.Document[],
            {
              _type: 'book';
            }
          >,
          {
            author: Sanity.ReferenceType<
              Sanity.IndexedAccess<
                Sanity.MultiExtract<
                  Sanity.Schema.Document[],
                  {
                    _type: 'book';
                  }
                >,
                'author'
              >
            >;
          },
          'without_splat'
        >
      >;"
    `);
  });

  it('works with nested projections', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          name: 'book',
          type: 'document',
          fields: [
            {
              name: 'author',
              type: 'reference',
              to: [{ type: 'author' }],
              // this should remove `null` from the type
              codegen: { required: true },
            },
          ],
        },
        {
          name: 'author',
          type: 'document',
          fields: [{ name: 'name', type: 'string' }],
        },
      ],
      query: `*[_type == 'book'] { author->{ name } }`,
      expectedType: `
        Array<{
          author: {
            name: string | null
          };
        }>
      `,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.ObjectMap<
          Sanity.MultiExtract<
            Sanity.Schema.Document[],
            {
              _type: 'book';
            }
          >,
          {
            author: Sanity.ObjectMap<
              Sanity.ReferenceType<
                Sanity.IndexedAccess<
                  Sanity.MultiExtract<
                    Sanity.Schema.Document[],
                    {
                      _type: 'book';
                    }
                  >,
                  'author'
                >
              >,
              {
                name: Sanity.IndexedAccess<
                  Sanity.ReferenceType<
                    Sanity.IndexedAccess<
                      Sanity.MultiExtract<
                        Sanity.Schema.Document[],
                        {
                          _type: 'book';
                        }
                      >,
                      'author'
                    >
                  >,
                  'name'
                >;
              },
              'without_splat'
            >;
          },
          'without_splat'
        >
      >;"
    `);
  });
});

describe('Mapper', () => {
  it('transforms to SafeIndexedAccess', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          name: 'book',
          type: 'document',
          fields: [
            { name: 'title', type: 'string' },
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
      ],
      query: `
        *[_type == 'book'] {
          title,
          authors[],
          'names': authors[].name,
        }
      `,
      expectedType: `Array<{
        title: string | null;
        authors: Array<{
          _key: string;
          _type: 'author';
          name?: string;
        } | null>;
        names: Array<string | null>;
      }>`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.ObjectMap<
          Sanity.MultiExtract<
            Sanity.Schema.Document[],
            {
              _type: 'book';
            }
          >,
          {
            title: Sanity.IndexedAccess<
              Sanity.MultiExtract<
                Sanity.Schema.Document[],
                {
                  _type: 'book';
                }
              >,
              'title'
            >;
            authors: Sanity.Mapper<
              Sanity.IndexedAccess<
                Sanity.MultiExtract<
                  Sanity.Schema.Document[],
                  {
                    _type: 'book';
                  }
                >,
                'authors'
              >
            >;
            names: Sanity.IndexedAccess<
              Sanity.Mapper<
                Sanity.IndexedAccess<
                  Sanity.MultiExtract<
                    Sanity.Schema.Document[],
                    {
                      _type: 'book';
                    }
                  >,
                  'authors'
                >
              >,
              'name'
            >;
          },
          'without_splat'
        >
      >;"
    `);
  });

  it('works with non-nullables', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          name: 'book',
          type: 'document',
          fields: [
            { name: 'title', type: 'string' },
            {
              name: 'authors',
              type: 'array',
              codegen: { required: true },
              of: [
                {
                  type: 'object',
                  name: 'author',
                  codegen: { required: true },
                  fields: [
                    {
                      name: 'name',
                      type: 'string',
                      codegen: { required: true },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      query: `
        *[_type == 'book'] {
          'names': authors[].name,
          authors[]
        }
      `,
      expectedType: `Array<{
        names: string[];
        authors: Array<{
          _key: string;
          _type: 'author';
          name: string;
        }>
      }>`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.ObjectMap<
          Sanity.MultiExtract<
            Sanity.Schema.Document[],
            {
              _type: 'book';
            }
          >,
          {
            names: Sanity.IndexedAccess<
              Sanity.Mapper<
                Sanity.IndexedAccess<
                  Sanity.MultiExtract<
                    Sanity.Schema.Document[],
                    {
                      _type: 'book';
                    }
                  >,
                  'authors'
                >
              >,
              'name'
            >;
            authors: Sanity.Mapper<
              Sanity.IndexedAccess<
                Sanity.MultiExtract<
                  Sanity.Schema.Document[],
                  {
                    _type: 'book';
                  }
                >,
                'authors'
              >
            >;
          },
          'without_splat'
        >
      >;"
    `);
  });

  it('flattens the result', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          name: 'book',
          type: 'document',
          fields: [
            { name: 'title', type: 'string' },
            {
              name: 'authors',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'author',
                  fields: [
                    {
                      name: 'name',
                      type: 'string',
                    },
                    {
                      name: 'foo',
                      type: 'string',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      query: `
        *[_type == 'book'].authors[].name
      `,
      expectedType: `Array<string | null>`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.UnwrapMapper<
        Sanity.IndexedAccess<
          Sanity.Mapper<
            Sanity.IndexedAccess<
              Sanity.MultiExtract<
                Sanity.Schema.Document[],
                {
                  _type: 'book';
                }
              >,
              'authors'
            >
          >,
          'name'
        >
      >;"
    `);
  });
});
