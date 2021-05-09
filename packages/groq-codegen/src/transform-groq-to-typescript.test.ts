import { transformGroqToTypescript } from './transform-groq-to-typescript';
import generate from '@babel/generator';
import prettier from 'prettier';
import {
  schemaNormalizer,
  generateSchemaTypes,
} from '@sanity-codegen/schema-codegen';

describe('generateGroqTypes', () => {
  test('attribute access', async () => {
    const types = await getTypeOutput({
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
      query: '*[_type == "book"].author.name',
    });

    expect(types).toMatchInlineSnapshot(`
      "
      // schema types
      /// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Book
           */
          interface Book extends Sanity.Document {
            _type: 'book';

            /**
             * Title - \`string\`
             */
            title?: string;

            /**
             * Author - \`object\`
             */
            author?: {
              /**
               * Name - \`string\`
               */
              name?: string;
            };
          }

          type Document = Book;
        }
      }


      // query type
      type Query = Sanity.SafeIndexedAccess<
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
      >[];


      let query: Query = undefined as any;
      "
    `);
  });

  test('element access', async () => {
    const types = await getTypeOutput({
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
      query: '*[_type == "book"][0].author',
    });

    expect(types).toMatchInlineSnapshot(`
      "
      // schema types
      /// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Book
           */
          interface Book extends Sanity.Document {
            _type: 'book';

            /**
             * Title - \`string\`
             */
            title?: string;

            /**
             * Author - \`object\`
             */
            author?: {
              /**
               * Name - \`string\`
               */
              name?: string;
            };
          }

          type Document = Book;
        }
      }


      // query type
      type Query = Sanity.SafeIndexedAccess<
        Extract<
          Sanity.Schema.Document[][number],
          {
            _type: 'book';
          }
        >[][number],
        'author'
      >;


      let query: Query = undefined as any;
      "
    `);
  });

  test('simple projection', async () => {
    const types = await getTypeOutput({
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
      query:
        '*[_type == "book"] { title, "authorName": author.name, "authorAlias": author }',
    });

    expect(types).toMatchInlineSnapshot(`
      "
      // schema types
      /// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Book
           */
          interface Book extends Sanity.Document {
            _type: 'book';

            /**
             * Title - \`string\`
             */
            title: string;

            /**
             * Author - \`object\`
             */
            author?: {
              /**
               * Name - \`string\`
               */
              name?: string;
            };
          }

          type Document = Book;
        }
      }


      // query type
      type Query = {
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
      }[];


      let query: Query = undefined as any;
      "
    `);
  });

  test('projection with splat', async () => {
    const types = await getTypeOutput({
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
      query: '*[_type == "book"] { "author": author.name, ... }',
    });

    expect(types).toMatchInlineSnapshot(`
      "
      // schema types
      /// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Book
           */
          interface Book extends Sanity.Document {
            _type: 'book';

            /**
             * Title - \`string\`
             */
            title: string;

            /**
             * Author - \`object\`
             */
            author?: {
              /**
               * Name - \`string\`
               */
              name?: string;
            };
          }

          type Document = Book;
        }
      }


      // query type
      type Query = ({
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
      >)[];


      let query: Query = undefined as any;
      "
    `);
  });

  test('filters with && and ||', async () => {
    const types = await getTypeOutput({
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
      query: '*[(_type == "book" || _type == "movie") && writer.name == "foo"]',
    });

    expect(types).toMatchInlineSnapshot(`
      "
      // schema types
      /// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Book
           */
          interface Book extends Sanity.Document {
            _type: 'book';

            /**
             * Title - \`string\`
             */
            title: string;

            /**
             * Writer - \`object\`
             */
            writer?: {
              /**
               * Name - \`string\`
               */
              name?: string;
            };
          }

          /**
           * Movie
           */
          interface Movie extends Sanity.Document {
            _type: 'movie';

            /**
             * Writer - \`object\`
             */
            writer?: {
              /**
               * Name - \`number\`
               */
              name?: number;
            };
          }

          type Document = Book | Movie;
        }
      }


      // query type
      type Query = Extract<
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
      >[];


      let query: Query = undefined as any;
      "
    `);
  });
});

interface Params {
  query: string;
  schema: any[];
}

async function getTypeOutput({ query, schema }: Params) {
  // seems like the types to babel are mismatched
  // @ts-expect-error
  const { code } = generate(transformGroqToTypescript({ query }));
  const schemaTypes = await generateSchemaTypes({
    schema: schemaNormalizer(schema),
  });

  const prettierOptions = { parser: 'typescript', singleQuote: true };

  return `
// schema types
${prettier.format(schemaTypes, prettierOptions)}

// query type
${prettier.format(`type Query = ${code}`, prettierOptions)}

let query: Query = undefined as any;
`;
}
