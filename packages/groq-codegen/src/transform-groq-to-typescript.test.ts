import { assertGroqTypeOutput } from '../fixtures/assert-groq-type-output';

describe('generateGroqTypes', () => {
  test('attribute access', async () => {
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
        Array<string | undefined>
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

  test('element access', async () => {
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
      query: `*[_type == "book"][0].author`,
      expectedType: `{ name?: string | undefined; } | undefined`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.SafeIndexedAccess<
        Extract<
          Sanity.Schema.Document[][number],
          {
            _type: 'book';
          }
        >[][number],
        'author'
      >;"
    `);
  });

  test('simple projection', async () => {
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
          "authorName": author.name,
          "authorAlias": author
        }
      `,
      expectedType: `
        Array<{
          title: string;
          authorName: string | undefined;
          authorAlias: {
            name?: string | undefined;
          } | undefined;
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

  test('projection with splat', async () => {
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
              name: 'author',
              type: 'object',
              fields: [{ name: 'name', type: 'string' }],
            },
          ],
        },
      ],
      query: `*[_type == "book"] { "author": author.name, ... }`,
      expectedType: `
        Array<
          Omit<Sanity.Schema.Book, 'author'> & { author: string | undefined; }
        >
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
      } & Omit<
        Extract<
          Sanity.Schema.Document[][number],
          {
            _type: 'book';
          }
        >[][number],
        'author'
      >)[];"
    `);
  });

  test('filters with && and ||', async () => {
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
      query: `*[(_type == "book" || _type == "movie") && writer.name == "foo"]`,
      expectedType: `
        Array<Sanity.Schema.Book | Sanity.Schema.Movie>
      `,
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
