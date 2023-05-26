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
      generateWorkspaceName: (name) => `Overriden${name}`,
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

      namespace Sanity.OverridenAdditionalWorkspace.Client {
        type Config = {
          BookAuthorUsesDefaultAlias: Sanity.OverridenAdditionalWorkspace.Query.BookAuthorUsesDefaultAlias;
          BookTitlesUsesDefaultExport: Sanity.OverridenAdditionalWorkspace.Query.BookTitlesUsesDefaultExport;
          AllBooksUsesDefaultReexport: Sanity.OverridenAdditionalWorkspace.Query.AllBooksUsesDefaultReexport;
          AllBooksUsesNamedDeclaredExport: Sanity.OverridenAdditionalWorkspace.Query.AllBooksUsesNamedDeclaredExport;
          AllBooksUsesNameSpecifiedExport: Sanity.OverridenAdditionalWorkspace.Query.AllBooksUsesNameSpecifiedExport;
          ImportStarExportStar: Sanity.OverridenAdditionalWorkspace.Query.ImportStarExportStar;
        };
      }
      namespace Sanity.OverridenAdditionalWorkspace.Query {
        type AllBooksUsesDefaultReexport =
          Sanity.OverridenAdditionalWorkspace.Query.BookTitlesUsesDefaultExport;
      }
      namespace Sanity.OverridenAdditionalWorkspace.Query {
        type AllBooksUsesNamedDeclaredExport = {
          authorName: unknown;
          title: unknown;
        }[];
      }
      namespace Sanity.OverridenAdditionalWorkspace.Query {
        type AllBooksUsesNameSpecifiedExport =
          Sanity.OverridenAdditionalWorkspace.Query.AllBooksUsesNamedDeclaredExport;
      }
      namespace Sanity.OverridenAdditionalWorkspace.Query {
        type BookAuthorUsesDefaultAlias = unknown;
      }
      namespace Sanity.OverridenAdditionalWorkspace.Query {
        type BookTitlesUsesDefaultExport = unknown[];
      }
      namespace Sanity.OverridenAdditionalWorkspace.Query {
        type ImportStarExportStar =
          Sanity.OverridenAdditionalWorkspace.Query.AllBooksUsesNamedDeclaredExport;
      }
      namespace Sanity.OverridenAdditionalWorkspace.Schema {
        type Foo =
          | {
              _id: string;
              _type: "foo";
              myStr?: string;
            }
          | undefined;
      }
      namespace Sanity.OverridenDefault.Query {
        type AllBooksUsesDefaultReexport =
          Sanity.OverridenDefault.Query.BookTitlesUsesDefaultExport;
      }
      namespace Sanity.OverridenDefault.Query {
        type AllBooksUsesNamedDeclaredExport = {
          authorName: string | null;
          title: string | null;
        }[];
      }
      namespace Sanity.OverridenDefault.Query {
        type AllBooksUsesNameSpecifiedExport =
          Sanity.OverridenDefault.Query.AllBooksUsesNamedDeclaredExport;
      }
      namespace Sanity.OverridenDefault.Query {
        type BookAuthorUsesDefaultAlias = {
          name?: string;
        } | null;
      }
      namespace Sanity.OverridenDefault.Query {
        type BookTitlesUsesDefaultExport = (string | null)[];
      }
      namespace Sanity.OverridenDefault.Query {
        type ImportStarExportStar =
          Sanity.OverridenDefault.Query.AllBooksUsesNamedDeclaredExport;
      }
      namespace Sanity.OverridenDefault.Schema {
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
      namespace Sanity.OverridenDefault.Schema {
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
