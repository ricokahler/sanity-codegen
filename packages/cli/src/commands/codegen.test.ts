import fs from 'fs';
import CodegenCommand from './codegen';

jest.mock('fs', () => {
  const fs = jest.requireActual('fs');
  fs.promises.writeFile = jest.fn();
  return fs;
});

describe('codegen command', () => {
  it('works with an inline schema in the config', async () => {
    const schemaCodegenCommand = new CodegenCommand(
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
        "Starting codegen…",
        "Using sanity-codegen config found at <PATH>",
        "Generating types from your schema…",
        "Converted 1 schema definition to TypeScript",
        "Plucking queries from files…",
        "Finding files to extract queries from…",
        "Found 2 candidate files",
        "Extracting queries… 50% (1/2)",
        "Extracting queries… 100% (2/2)",
        "Found 1 query from 2 files.",
        "Converting queries to typescript…",
        "Converted 2 queries to TypeScript",
        "Writing query types output…",
        "Wrote types to <PATH>",
      ]
    `);

    expect(
      (fs.promises.writeFile as any).mock.calls.map(
        (call: [string, string]) => call[1],
      ),
    ).toMatchInlineSnapshot(`
      [
        "/// <reference types="@sanity-codegen/types" />

      namespace Sanity.Schema {
        type Book =
          | {
              _id: string;
              _type: "book";
              author?: string;
              title?: string;
            }
          | undefined;
      }

      namespace Sanity.Client {
        type Config = {
          QueryKey: Sanity.Query.QueryKey;
        };
      }
      namespace Sanity.Query {
        type QueryKey = (string | null)[];
      }
      ",
      ]
    `);
  });
});
