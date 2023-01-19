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
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        log: jest.fn(),
        success: jest.fn(),
        verbose: jest.fn(),
        warn: jest.fn(),
      },
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types="@sanity-codegen/types" />

      declare namespace Sanity {
        namespace Queries {
          type AllBooksUsesDefaultReexport = (string | null)[];
          type AllBooksUsesNamedDeclaredExport = {
            authorName: string | null;
            title: string | null;
          }[];
          type AllBooksUsesNameSpecifiedExport = {
            authorName: string | null;
            title: string | null;
          }[];
          type BookAuthorUsesDefaultAlias = {
            name?: string;
          } | null;
          type BookTitlesUsesDefaultExport = (string | null)[];
          type ImportStarExportStar = {
            authorName: string | null;
            title: string | null;
          }[];

          /**
           * A keyed type of all the codegen'ed queries. This type is used for
           * TypeScript meta programming purposes only.
           */
          type QueryMap = {
            BookAuthorUsesDefaultAlias: BookAuthorUsesDefaultAlias;
            BookTitlesUsesDefaultExport: BookTitlesUsesDefaultExport;
            AllBooksUsesDefaultReexport: AllBooksUsesDefaultReexport;
            AllBooksUsesNamedDeclaredExport: AllBooksUsesNamedDeclaredExport;
            AllBooksUsesNameSpecifiedExport: AllBooksUsesNameSpecifiedExport;
            ImportStarExportStar: ImportStarExportStar;
          };
        }
      }
      "
    `);
  });
});
