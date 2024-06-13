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
        "[default] Generating types for workspace \`default\` as \`OverridenDefault\`",
        "[default] Converted 2 schema definitions to TypeScript",
        "[default] Plucking queries from files…",
        "[default] Finding files to extract queries from…",
        "[default] Found 2 candidate files",
        "[default] Extracting queries… 50% (1/2)",
        "[default] Extracting queries… 100% (2/2)",
        "[default] Found 1 query from 2 files.",
        "[default] Converting queries to typescript…",
        "[default] Converted 2 queries to TypeScript",
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

      namespace Sanity.OverridenDefault.Client {
        type Config = {
          QueryKey: Sanity.OverridenDefault.Query.QueryKey;
        };
      }
      namespace Sanity.OverridenDefault.Query {
        type QueryKey = (string | null)[];
      }
      namespace Sanity.OverridenDefault.Schema {
        type CustomTypeFromString = {
          foo: string;
        };
      }
      namespace Sanity.OverridenDefault.Schema {
        type Bar =
          | {
              _id: string;
              _type: "foo";
              myStr?: string;
            }
          | undefined;
      }
      namespace Sanity.OverridenDefault.Schema {
        type Book =
          | {
              _id: string;
              _type: "book";
              author?: string;
              title?: string;
            }
          | undefined;
      }
      namespace Sanity.OverridenDefault.Schema {
        type CustomTypeFromTSModuleDeclaration = {
          foo: string;
        };
      }
      ",
      ]
    `);
  });
});
