import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { generateGroqTypes } from './generate-groq-types';
import { exampleSchema } from './__example-files__/example-schema';

describe('generateGroqTypes', () => {
  // TODO: better tests lol
  it('works', async () => {
    const result = await generateGroqTypes({
      cwd: __dirname,
      filenames: './__example-files__/**/*.ts',
      schema: schemaNormalizer(exampleSchema),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Queries {
          type BookAuthor = {
            name: string;
          };
          type BookTitles = string[];

          /**
           * A keyed type of all the codegen'ed queries. This type is used for
           * TypeScript meta programming purposes only.
           */
          type QueryMap = {
            BookAuthor: BookAuthor;
            BookTitles: BookTitles;
          };
        }
      }
      "
    `);
  });
});
