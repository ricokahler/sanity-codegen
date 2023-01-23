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
      normalizedSchemas: [
        schemaNormalizer({ types: exampleSchema, name: 'default' }),
      ],
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

      namespace Sanity.Default.Client {
        type Config = {
          BookAuthorUsesDefaultAlias: Sanity.Default.Query.BookAuthorUsesDefaultAlias;
          BookTitlesUsesDefaultExport: Sanity.Default.Query.BookTitlesUsesDefaultExport;
          AllBooksUsesDefaultReexport: Sanity.Default.Query.AllBooksUsesDefaultReexport;
          AllBooksUsesNamedDeclaredExport: Sanity.Default.Query.AllBooksUsesNamedDeclaredExport;
          AllBooksUsesNameSpecifiedExport: Sanity.Default.Query.AllBooksUsesNameSpecifiedExport;
          ImportStarExportStar: Sanity.Default.Query.ImportStarExportStar;
        };
      }
      namespace Sanity.Default.Query {
        type AllBooksUsesDefaultReexport =
          Sanity.Default.Query.BookTitlesUsesDefaultExport;
      }
      namespace Sanity.Default.Query {
        type AllBooksUsesNamedDeclaredExport = {
          authorName: string | null;
          title: string | null;
        }[];
      }
      namespace Sanity.Default.Query {
        type AllBooksUsesNameSpecifiedExport =
          Sanity.Default.Query.AllBooksUsesNamedDeclaredExport;
      }
      namespace Sanity.Default.Query {
        type BookAuthorUsesDefaultAlias = {
          name?: string;
        } | null;
      }
      namespace Sanity.Default.Query {
        type BookTitlesUsesDefaultExport = (string | null)[];
      }
      namespace Sanity.Default.Query {
        type ImportStarExportStar =
          Sanity.Default.Query.AllBooksUsesNamedDeclaredExport;
      }
      namespace Sanity.Default.Schema {
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
      namespace Sanity.Default.Schema {
        type Book =
          | {
              _id: string;
              _type: "book";
              author?: {
                name?: string;
              };
              description?: Sanity.Ref.Ref_0NJ3QI56wvVs4iZM;
              title?: string;
            }
          | undefined;
      }
      namespace Sanity.Ref {
        type Ref_0NJ3QI56wvVs4iZM = {
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
      "
    `);
  });

  it('multiple workspaces', async () => {
    const result = await generateTypes({
      root: __dirname,
      include: './__example-files__/**/*.ts',
      exclude: ['**/*.fake-test.ts', '**/mock_node_modules'],
      normalizedSchemas: [
        schemaNormalizer({ types: exampleSchema, name: 'default' }),
        schemaNormalizer({
          types: [
            {
              name: 'foo',
              type: 'document',
              fields: [{ name: 'myStr', type: 'string' }],
            },
          ],
          name: 'additionalWorkspace',
        }),
      ],
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

      namespace Sanity.AdditionalWorkspace.Client {
        type Config = {
          BookAuthorUsesDefaultAlias: Sanity.AdditionalWorkspace.Query.BookAuthorUsesDefaultAlias;
          BookTitlesUsesDefaultExport: Sanity.AdditionalWorkspace.Query.BookTitlesUsesDefaultExport;
          AllBooksUsesDefaultReexport: Sanity.AdditionalWorkspace.Query.AllBooksUsesDefaultReexport;
          AllBooksUsesNamedDeclaredExport: Sanity.AdditionalWorkspace.Query.AllBooksUsesNamedDeclaredExport;
          AllBooksUsesNameSpecifiedExport: Sanity.AdditionalWorkspace.Query.AllBooksUsesNameSpecifiedExport;
          ImportStarExportStar: Sanity.AdditionalWorkspace.Query.ImportStarExportStar;
        };
      }
      namespace Sanity.AdditionalWorkspace.Query {
        type AllBooksUsesDefaultReexport =
          Sanity.AdditionalWorkspace.Query.BookTitlesUsesDefaultExport;
      }
      namespace Sanity.AdditionalWorkspace.Query {
        type AllBooksUsesNamedDeclaredExport = {
          authorName: unknown;
          title: unknown;
        }[];
      }
      namespace Sanity.AdditionalWorkspace.Query {
        type AllBooksUsesNameSpecifiedExport =
          Sanity.AdditionalWorkspace.Query.AllBooksUsesNamedDeclaredExport;
      }
      namespace Sanity.AdditionalWorkspace.Query {
        type BookAuthorUsesDefaultAlias = unknown;
      }
      namespace Sanity.AdditionalWorkspace.Query {
        type BookTitlesUsesDefaultExport = unknown[];
      }
      namespace Sanity.AdditionalWorkspace.Query {
        type ImportStarExportStar =
          Sanity.AdditionalWorkspace.Query.AllBooksUsesNamedDeclaredExport;
      }
      namespace Sanity.AdditionalWorkspace.Schema {
        type Foo =
          | {
              _id: string;
              _type: "foo";
              myStr?: string;
            }
          | undefined;
      }
      namespace Sanity.Default.Query {
        type AllBooksUsesDefaultReexport =
          Sanity.Default.Query.BookTitlesUsesDefaultExport;
      }
      namespace Sanity.Default.Query {
        type AllBooksUsesNamedDeclaredExport = {
          authorName: string | null;
          title: string | null;
        }[];
      }
      namespace Sanity.Default.Query {
        type AllBooksUsesNameSpecifiedExport =
          Sanity.Default.Query.AllBooksUsesNamedDeclaredExport;
      }
      namespace Sanity.Default.Query {
        type BookAuthorUsesDefaultAlias = {
          name?: string;
        } | null;
      }
      namespace Sanity.Default.Query {
        type BookTitlesUsesDefaultExport = (string | null)[];
      }
      namespace Sanity.Default.Query {
        type ImportStarExportStar =
          Sanity.Default.Query.AllBooksUsesNamedDeclaredExport;
      }
      namespace Sanity.Default.Schema {
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
      namespace Sanity.Default.Schema {
        type Book =
          | {
              _id: string;
              _type: "book";
              author?: {
                name?: string;
              };
              description?: Sanity.Ref.Ref_0NJ3QI56wvVs4iZM;
              title?: string;
            }
          | undefined;
      }
      namespace Sanity.Ref {
        type Ref_0NJ3QI56wvVs4iZM = {
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
      "
    `);
  });
});
