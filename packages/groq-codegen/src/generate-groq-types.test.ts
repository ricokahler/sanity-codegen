import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { generateGroqTypes } from './generate-groq-types';
import { exampleSchema } from './__example-files__/example-schema';

describe('generateGroqTypes', () => {
  // TODO: better tests lol
  it('works', async () => {
    const result = await generateGroqTypes({
      root: __dirname,
      groqCodegenInclude: './__example-files__/**/*.ts',
      groqCodegenExclude: ['**/*.fake-test.ts', '**/mock_node_modules'],
      normalizedSchema: schemaNormalizer(exampleSchema),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Queries {
          type AllBooks = {
            _type: \\"book\\";
            _id: string;
            title?: string;
            author?: {
              name?: string;
            };
            description?: Ref_caMDjBkRyWfDFcqV;
          }[];
          type BookAuthor = {
            name?: string;
          } | null;
          type BookTitles = (string | null)[];

          type Ref_caMDjBkRyWfDFcqV = {
            _key: string;
            _type: \\"block\\";
            children: {
              _key: string;
              _type: \\"span\\";
              marks?: unknown[];
              text?: string;
            }[];
            markDefs?: unknown[];
            style?: string;
          }[];

          /**
           * A keyed type of all the codegen'ed queries. This type is used for
           * TypeScript meta programming purposes only.
           */
          type QueryMap = {
            BookAuthor: BookAuthor;
            BookTitles: BookTitles;
            AllBooks: AllBooks;
          };
        }
      }
      "
    `);
  });
});
