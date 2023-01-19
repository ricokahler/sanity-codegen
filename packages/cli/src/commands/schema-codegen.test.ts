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
      log.mock.calls
        .map((call) => call[0])
        .map((message: string) => message.replace(/:\s[\w/\\.-]+/g, ' <PATH>')),
    ).toMatchInlineSnapshot(`
      [
        "Using sanity-codegen config found at <PATH>",
        "Wrote schema types output to <PATH>",
        "Wrote schema JSON output to <PATH>",
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
        namespace Schema {
          /**
           * Book
           */
          interface Book extends Sanity.Document {
            _type: "book";

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
        "type": "SchemaRoot",
        "documents": [
          {
            "codegen": {
              "required": false
            },
            "description": null,
            "hidden": false,
            "readOnly": false,
            "hasValidation": false,
            "originalNode": {
              "name": "book",
              "type": "document",
              "fields": [
                {
                  "name": "title",
                  "type": "string"
                },
                {
                  "name": "author",
                  "type": "string"
                }
              ]
            },
            "name": "book",
            "title": "Book",
            "type": "Document",
            "fields": [
              {
                "name": "title",
                "title": "Title",
                "description": "",
                "hidden": false,
                "readOnly": false,
                "codegen": {
                  "required": false
                },
                "hasValidation": false,
                "definition": {
                  "codegen": {
                    "required": false
                  },
                  "description": null,
                  "hidden": false,
                  "name": "title",
                  "readOnly": false,
                  "title": "Title",
                  "hasValidation": false,
                  "originalNode": {
                    "name": "title",
                    "type": "string"
                  },
                  "type": "String",
                  "list": null
                }
              },
              {
                "name": "author",
                "title": "Author",
                "description": "",
                "hidden": false,
                "readOnly": false,
                "codegen": {
                  "required": false
                },
                "hasValidation": false,
                "definition": {
                  "codegen": {
                    "required": false
                  },
                  "description": null,
                  "hidden": false,
                  "name": "author",
                  "readOnly": false,
                  "title": "Author",
                  "hasValidation": false,
                  "originalNode": {
                    "name": "author",
                    "type": "string"
                  },
                  "type": "String",
                  "list": null
                }
              }
            ]
          }
        ],
        "registeredTypes": []
      }",
      ]
    `);
  });

  it.todo('works with schemas provided via args');

  it.todo('works with schemas provided via sanity.json');
});
