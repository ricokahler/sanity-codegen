import { pluckGroqFromFiles } from './pluck-groq-from-files';

describe('pluckGroqFromFile', () => {
  // TODO: better tests lol
  it('works', async () => {
    const results = await pluckGroqFromFiles({
      cwd: __dirname,
      groqCodegenInclude: './__example-files__/**/*.ts',
      groqCodegenExclude: '**/*.fake-test.ts',
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
