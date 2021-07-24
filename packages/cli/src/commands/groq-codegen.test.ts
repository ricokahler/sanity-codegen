import fs from 'fs';
import GroqCodegenCommand from './groq-codegen';

jest.mock('fs', () => {
  const fs = jest.requireActual('fs');
  fs.promises.writeFile = jest.fn();
  return fs;
});

describe('groq-codegen command', () => {
  it('works with an inline schema in the config', async () => {
    const schemaCodegenCommand = new GroqCodegenCommand(
      [
        `--configPath=${require.resolve(
          '../__example-folders__/cli-tests/inline-schema.config',
        )}`,
      ],
      {} as any,
    );

    schemaCodegenCommand.log = jest.fn();

    await schemaCodegenCommand.run();

    expect(
      (schemaCodegenCommand.log as jest.Mock).mock.calls
        .map((call) => call[0])
        .map((message: string) => message.replace(/:\s[\w/\\.-]+/g, ' <PATH>')),
    ).toMatchInlineSnapshot(`
      Array [
        "Using sanity-codegen config found at <PATH>",
        "[32m✓[0m  Wrote query types output to <PATH>",
      ]
    `);

    expect(
      (fs.promises.writeFile as any).mock.calls.map(
        (call: [string, string]) => call[1],
      ),
    ).toMatchInlineSnapshot(`
      Array [
        "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Queries {
          type QueryKey = (string | null)[];

          /**
           * A keyed type of all the codegen'ed queries. This type is used for
           * TypeScript meta programming purposes only.
           */
          type QueryMap = {
            QueryKey: QueryKey;
          };
        }
      }
      ",
      ]
    `);
  });

  it.todo('works with a schema-def.json');
});
