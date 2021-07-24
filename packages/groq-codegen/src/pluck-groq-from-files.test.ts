import { pluckGroqFromFiles } from './pluck-groq-from-files';

describe('pluckGroqFromFile', () => {
  it('accepts and include and exclude and returns the plucked results', async () => {
    const results = await pluckGroqFromFiles({
      root: __dirname,
      groqCodegenInclude: './__example-files__/**/*.ts',
      groqCodegenExclude: ['**/mock_node_modules', '**/*.fake-test.ts'],
    });

    expect(results).toMatchInlineSnapshot(`
      Array [
        Object {
          "query": "
            *[_type == 'book'][0].author
          ",
          "queryKey": "BookAuthor",
        },
        Object {
          "query": "
            *[_type == 'book'].title
          ",
          "queryKey": "BookTitles",
        },
        Object {
          "query": "*[_type == 'book']",
          "queryKey": "AllBooks",
        },
      ]
    `);
  });
});
