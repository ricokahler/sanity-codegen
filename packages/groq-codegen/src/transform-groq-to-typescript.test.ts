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
      "type Query = Extract<
        Sanity.Schema.Document[][number],
        {
          _type: 'book';
        }
      >[];"
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
      "type Query = Extract<
        Sanity.Schema.Document[][number],
        (
          | {
              _type: 'book';
            }
          | {
              _type: 'movie';
            }
        ) &
          unknown
      >[];"
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
      "type Query = Sanity.SafeIndexedAccess<
        Sanity.SafeIndexedAccess<
          Extract<
            Sanity.Schema.Document[][number],
            {
              _type: 'book';
            }
          >[][number],
          'author'
        >[][number],
        'name'
      >[];"
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
      "type Query = Sanity.SafeIndexedAccess<
        Sanity.SafeIndexedAccess<
          Extract<
            Sanity.Schema.Document[][number],
            {
              _type: 'book';
            }
          >[][number],
          'author'
        >[][number],
        'name'
      >[];"
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
      "type Query = Sanity.SafeIndexedAccess<
        Sanity.SafeIndexedAccess<
          Extract<
            Sanity.Schema.Document[][number],
            {
              _type: 'book';
            }
          >[][number],
          'author'
        >[][number],
        'name'
      >[];"
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
      "type Query = Sanity.ArrayElementAccess<
        Extract<
          Sanity.Schema.Document[][number],
          {
            _type: 'book';
          }
        >[]
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
      "type Query = {
        books: Extract<
          Sanity.Schema.Document[][number],
          {
            _type: 'book';
          }
        >[];
      };"
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
      expectedType: `
        Array<{
          title: string;
          nonRequired: string | null;
          authorName: string | null;
          authorAlias: {
            name?: string | undefined;
          } | null;
        }>
      `,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = {
        title: Sanity.SafeIndexedAccess<
          Extract<
            Sanity.Schema.Document[][number],
            {
              _type: 'book';
            }
          >[][number],
          'title'
        >;
        nonRequired: Sanity.SafeIndexedAccess<
          Extract<
            Sanity.Schema.Document[][number],
            {
              _type: 'book';
            }
          >[][number],
          'nonRequired'
        >;
        authorName: Sanity.SafeIndexedAccess<
          Sanity.SafeIndexedAccess<
            Extract<
              Sanity.Schema.Document[][number],
              {
                _type: 'book';
              }
            >[][number],
            'author'
          >,
          'name'
        >;
        authorAlias: Sanity.SafeIndexedAccess<
          Extract<
            Sanity.Schema.Document[][number],
            {
              _type: 'book';
            }
          >[][number],
          'author'
        >;
      }[];"
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
      "type Query = ({
        author: Sanity.SafeIndexedAccess<
          Sanity.SafeIndexedAccess<
            Extract<
              Sanity.Schema.Document[][number],
              {
                _type: 'book';
              }
            >[][number],
            'author'
          >,
          'name'
        >;
        nonRequiredA: Sanity.SafeIndexedAccess<
          Extract<
            Sanity.Schema.Document[][number],
            {
              _type: 'book';
            }
          >[][number],
          'nonRequiredA'
        >;
      } & Omit<
        Extract<
          Sanity.Schema.Document[][number],
          {
            _type: 'book';
          }
        >[][number],
        'author' | 'nonRequiredA'
      >)[];"
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
      "type Query = {
        author: Sanity.ReferenceType<
          Sanity.SafeIndexedAccess<
            Extract<
              Sanity.Schema.Document[][number],
              {
                _type: 'book';
              }
            >[][number],
            'author'
          >
        >;
      }[];"
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
      "type Query = {
        author: Sanity.ReferenceType<
          Sanity.SafeIndexedAccess<
            Extract<
              Sanity.Schema.Document[][number],
              {
                _type: 'book';
              }
            >[][number],
            'author'
          >
        >;
      }[];"
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
      "type Query = {
        author: {
          name: Sanity.SafeIndexedAccess<
            Sanity.ReferenceType<
              Sanity.SafeIndexedAccess<
                Extract<
                  Sanity.Schema.Document[][number],
                  {
                    _type: 'book';
                  }
                >[][number],
                'author'
              >
            >,
            'name'
          >;
        };
      }[];"
    `);
  });
});
