import { pluckGroqFromFiles } from './pluck-groq-from-files';

describe('pluckGroqFromFile', () => {
  it('accepts and include and exclude and returns the plucked results', async () => {
    const results = await pluckGroqFromFiles({
      root: __dirname,
      include: './__example-files__/**/*.ts',
      exclude: ['**/mock_node_modules', '**/*.fake-test.ts'],
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

    expect(results).toMatchInlineSnapshot(`
      [
        {
          "query": "
            *[_type == 'book'][0].author
          ",
          "queryKey": "BookAuthorUsesDefaultAlias",
        },
        {
          "query": "
            *[_type == 'book'].title
          ",
          "queryKey": "BookTitlesUsesDefaultExport",
        },
        {
          "query": "*[_type == 'book'].title",
          "queryKey": "AllBooksUsesDefaultReexport",
        },
        {
          "query": "*[_type == 'book'] 
        {
          title,
          'authorName': author.name,
        }
      ",
          "queryKey": "AllBooksUsesNamedDeclaredExport",
        },
        {
          "query": "*[_type == 'book'] 
        {
          title,
          'authorName': author.name,
        }
      ",
          "queryKey": "AllBooksUsesNameSpecifiedExport",
        },
        {
          "query": "*[_type == 'book'] 
        {
          title,
          'authorName': author.name,
        }
      ",
          "queryKey": "ImportStarExportStar",
        },
      ]
    `);
  });
});
