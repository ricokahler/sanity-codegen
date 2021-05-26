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

    expect(typeof types).toBe('string');
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
      expect(e.toString().includes('GROQ assertion failed')).toBe(true);
    }

    expect(caught).toBe(true);
  });
});
