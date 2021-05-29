import { generateGroqTypes } from './generate-groq-types';

describe('generateGroqTypes', () => {
  // TODO: better tests lol
  it('works', async () => {
    const result = await generateGroqTypes({
      cwd: __dirname,
      filenames: './__example-files__/**/*.ts',
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Queries {
          type BookAuthor = Sanity.UnwrapMapper<
            Sanity.IndexedAccess<
              Sanity.ArrayElementAccess<
                Sanity.MultiExtract<
                  Sanity.Schema.Document[],
                  {
                    _type: \\"book\\";
                  }
                >
              >,
              \\"author\\"
            >
          >;
          type BookTitles = Sanity.UnwrapMapper<
            Sanity.IndexedAccess<
              Sanity.MultiExtract<
                Sanity.Schema.Document[],
                {
                  _type: \\"book\\";
                }
              >,
              \\"title\\"
            >
          >;

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
