import fs from 'fs';
import SchemaCodegenCommand from './schema-codegen';

jest.mock('fs', () => {
  const fs = jest.requireActual('fs');
  fs.promises.writeFile = jest.fn();
  return fs;
});

describe('schema-codegen command', () => {
  it('works with an inline schema in the config', async () => {
    const schemaCodegenCommand = new SchemaCodegenCommand(
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
        "[32m✓[0m Wrote schema types output to <PATH>",
        "[32m✓[0m Wrote schema JSON output to <PATH>",
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
        namespace Schema {
          /**
           * Book
           */
          interface Book extends Sanity.Document {
            _type: \\"book\\";

            /**
             * Title - \`String\`
             */
            title?: string;

            /**
             * Author - \`String\`
             */
            author?: string;
          }

          type Document = Book;
        }
      }
      ",
        "{
        \\"type\\": \\"SchemaRoot\\",
        \\"documents\\": [
          {
            \\"codegen\\": {
              \\"required\\": false
            },
            \\"description\\": null,
            \\"hidden\\": false,
            \\"readOnly\\": false,
            \\"hasValidation\\": false,
            \\"name\\": \\"book\\",
            \\"title\\": \\"Book\\",
            \\"type\\": \\"Document\\",
            \\"fields\\": [
              {
                \\"name\\": \\"title\\",
                \\"title\\": \\"Title\\",
                \\"description\\": \\"\\",
                \\"hidden\\": false,
                \\"readOnly\\": false,
                \\"codegen\\": {
                  \\"required\\": false
                },
                \\"hasValidation\\": false,
                \\"definition\\": {
                  \\"codegen\\": {
                    \\"required\\": false
                  },
                  \\"description\\": null,
                  \\"hidden\\": false,
                  \\"name\\": \\"title\\",
                  \\"readOnly\\": false,
                  \\"title\\": \\"Title\\",
                  \\"hasValidation\\": false,
                  \\"type\\": \\"String\\",
                  \\"list\\": null
                }
              },
              {
                \\"name\\": \\"author\\",
                \\"title\\": \\"Author\\",
                \\"description\\": \\"\\",
                \\"hidden\\": false,
                \\"readOnly\\": false,
                \\"codegen\\": {
                  \\"required\\": false
                },
                \\"hasValidation\\": false,
                \\"definition\\": {
                  \\"codegen\\": {
                    \\"required\\": false
                  },
                  \\"description\\": null,
                  \\"hidden\\": false,
                  \\"name\\": \\"author\\",
                  \\"readOnly\\": false,
                  \\"title\\": \\"Author\\",
                  \\"hasValidation\\": false,
                  \\"type\\": \\"String\\",
                  \\"list\\": null
                }
              }
            ]
          }
        ],
        \\"registeredTypes\\": []
      }",
      ]
    `);
  });

  it.todo('works with schemas provided via args');

  it.todo('works with schemas provided via sanity.json');
});
