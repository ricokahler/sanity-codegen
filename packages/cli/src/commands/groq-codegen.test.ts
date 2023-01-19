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

    const log = jest.fn();

    schemaCodegenCommand.logger = {
      debug: log,
      error: log,
      info: log,
      log,
      success: log,
      verbose: log,
      warn: log,
    };

    await schemaCodegenCommand.run();

    expect(
      (log as jest.Mock).mock.calls
        .map((call) => call[0])
        .map((message: string) => message.replace(/:\s[\w/\\.-]+/g, ' <PATH>')),
    ).toMatchInlineSnapshot(`
      [
        "Using sanity-codegen config found at <PATH>",
        "Finding files to extract queries from…",
        "Found 2 candidate files from \`groqCodegenInclude\` and \`groqCodegenExclude\`",
        "Extracting queries… 50% (1/2)",
        "Extracting queries… 100% (2/2)",
        "Found 1 query from 2 files.",
        "Converting queries to typescript…",
        "Converting queries to typescript… 100% (1/1)",
        "Converted 1 query to TypeScript",
        "Writing query types output…",
        "Wrote query types output to <PATH>",
      ]
    `);

    expect(
      (fs.promises.writeFile as any).mock.calls.map(
        (call: [string, string]) => call[1],
      ),
    ).toMatchInlineSnapshot(`
      [
        "/// <reference types="@sanity-codegen/types" />

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
