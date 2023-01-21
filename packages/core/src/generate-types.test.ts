import { schemaNormalizer } from './schema-normalizer';
import { generateTypes } from './generate-types';
import { exampleSchema } from './__example-files__/example-schema';

describe('generateTypes', () => {
  // TODO: better tests lol
  it('works', async () => {
    const result = await generateTypes({
      root: __dirname,
      include: './__example-files__/**/*.ts',
      exclude: ['**/*.fake-test.ts', '**/mock_node_modules'],
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

      namespace Sanity.Ref {
        type Ref_RPbsBo7Tupt4mgWO = {
          _key: string;
          _type: "block";
          children: {
            _key: string;
            _type: "span";
            marks?: unknown[];
            text?: string;
          }[];
          markDefs?: unknown[];
          style?: string;
        }[];
      }
      namespace Sanity.Schema {
        type Blocks =
          | {
              _key: string;
              _type: "block";
              children: {
                _key: string;
                _type: "span";
                marks?: unknown[];
                text?: string;
              }[];
              markDefs?: unknown[];
              style?: string;
            }[]
          | undefined;
      }
      namespace Sanity.Schema {
        type Book =
          | {
              _id: string;
              _type: "book";
              author?: {
                name?: string;
              };
              description?: Sanity.Ref.Ref_RPbsBo7Tupt4mgWO;
              title?: string;
            }
          | undefined;
      }

      namespace Sanity.Client {
        type Config = {
          BookAuthorUsesDefaultAlias: Sanity.Query.BookAuthorUsesDefaultAlias;
          BookTitlesUsesDefaultExport: Sanity.Query.BookTitlesUsesDefaultExport;
          AllBooksUsesDefaultReexport: Sanity.Query.AllBooksUsesDefaultReexport;
          AllBooksUsesNamedDeclaredExport: Sanity.Query.AllBooksUsesNamedDeclaredExport;
          AllBooksUsesNameSpecifiedExport: Sanity.Query.AllBooksUsesNameSpecifiedExport;
          ImportStarExportStar: Sanity.Query.ImportStarExportStar;
        };
      }
      namespace Sanity.Query {
        type AllBooksUsesDefaultReexport = Sanity.Query.BookTitlesUsesDefaultExport;
      }
      namespace Sanity.Query {
        type AllBooksUsesNamedDeclaredExport = {
          authorName: string | null;
          title: string | null;
        }[];
      }
      namespace Sanity.Query {
        type AllBooksUsesNameSpecifiedExport =
          Sanity.Query.AllBooksUsesNamedDeclaredExport;
      }
      namespace Sanity.Query {
        type BookAuthorUsesDefaultAlias = {
          name?: string;
        } | null;
      }
      namespace Sanity.Query {
        type BookTitlesUsesDefaultExport = (string | null)[];
      }
      namespace Sanity.Query {
        type ImportStarExportStar = Sanity.Query.AllBooksUsesNamedDeclaredExport;
      }
      "
    `);
  });
});
