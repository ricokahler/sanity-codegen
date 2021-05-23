import { assertGroqTypeOutput } from './assert-groq-type-output';

describe('assertGroqTypeOutput', () => {
  it('should work with the correct types', async () => {
    const types = await assertGroqTypeOutput({
      schema: [
        {
          name: 'fooObj',
          type: 'document',
          fields: [
            {
              name: 'foo',
              type: 'string',
            },
          ],
        },
      ],
      query: `*[_type == 'fooObj'].foo`,
      expectedType: `Array<string | null>`,
    });

    expect(types).toMatchInlineSnapshot(`
      "type Query = Sanity.SafeIndexedAccess<
        Extract<
          Sanity.Schema.Document[][number],
          {
            _type: 'fooObj';
          }
        >[][number],
        'foo'
      >[];"
    `);
  });

  it('should throw with incorrect types', async () => {
    let caught = false;

    try {
      await assertGroqTypeOutput({
        schema: [
          {
            name: 'fooObj',
            type: 'document',
            fields: [
              {
                name: 'foo',
                type: 'string',
              },
            ],
          },
        ],
        query: `*[_type == 'fooObj'].foo`,
        expectedType: `number[]`,
      });
    } catch (e) {
      caught = true;
      expect(e).toMatchInlineSnapshot(`
        [Error: GROQ assertion failed.

        Argument of type 'ExpectedType' is not assignable to parameter of type 'QueryType'.
        Type 'number' is not assignable to type 'string | null'.

        Argument of type 'QueryType' is not assignable to parameter of type 'ExpectedType'.
        Type 'string | null' is not assignable to type 'number'.
        Type 'null' is not assignable to type 'number'.]
      `);
    }

    expect(caught).toBe(true);
  });
});
