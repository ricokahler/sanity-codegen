import { generateSchemaTypes } from './generate-schema-types';
import { schemaNormalizer } from './schema-normalizer';

describe('generate-types', () => {
  it('generates types for sanity primitive types', async () => {
    const foo = {
      title: 'Foo',
      name: 'foo',
      type: 'document',
      fields: [
        {
          name: 'image',
          type: 'image',
        },
        {
          name: 'boolean',
          type: 'boolean',
        },
        {
          name: 'date',
          type: 'date',
        },
        {
          name: 'datetime',
          type: 'datetime',
        },
        {
          name: 'number',
          type: 'number',
        },
        {
          name: 'slug',
          type: 'slug',
        },
        {
          name: 'string',
          type: 'string',
        },
        {
          name: 'text',
          type: 'text',
        },
        {
          name: 'url',
          type: 'url',
        },
        {
          name: 'image',
          type: 'image',
        },
        {
          name: 'file',
          type: 'file',
        },
        {
          name: 'geopoint',
          type: 'geopoint',
        },
      ],
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Foo
           */
          interface Foo extends Sanity.Document {
            _type: \\"foo\\";

            /**
             * Image - \`image\`
             */
            image?: {
              asset: Sanity.Asset;
              crop?: Sanity.ImageCrop;
              hotspot?: Sanity.ImageHotspot;
            };

            /**
             * Boolean - \`boolean\`
             */
            boolean?: boolean;

            /**
             * Date - \`date\`
             */
            date?: string;

            /**
             * Datetime - \`datetime\`
             */
            datetime?: string;

            /**
             * Number - \`number\`
             */
            number?: number;

            /**
             * Slug - \`slug\`
             */
            slug?: {
              _type: \\"slug\\";
              current: string;
            };

            /**
             * String - \`string\`
             */
            string?: string;

            /**
             * Text - \`text\`
             */
            text?: string;

            /**
             * Url - \`url\`
             */
            url?: string;

            /**
             * Image - \`image\`
             */
            image?: {
              asset: Sanity.Asset;
              crop?: Sanity.ImageCrop;
              hotspot?: Sanity.ImageHotspot;
            };

            /**
             * File - \`file\`
             */
            file?: {
              asset: Sanity.Asset;
            };

            /**
             * Geopoint - \`geopoint\`
             */
            geopoint?: Sanity.Geopoint;
          }

          type Document = Foo;
        }
      }
      "
    `);
  });

  it('generates unioned string literals if options.list is provided', async () => {
    const foo = {
      type: 'document',
      name: 'foo',
      fields: [
        {
          name: 'choicesStrings',
          type: 'string',
          codegen: { required: true },
          validation: jest.fn(),
          options: {
            list: [
              { title: 'Option A', value: 'a' },
              { title: 'Option B', value: 'b' },
              'c',
            ],
          },
        },
        {
          name: 'choicesNumbers',
          type: 'number',
          codegen: { required: true },
          validation: jest.fn(),
          options: {
            list: [1, 2, 3],
          },
        },
      ],
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Foo
           */
          interface Foo extends Sanity.Document {
            _type: \\"foo\\";

            /**
             * ChoicesStrings - \`string\`
             */
            choicesStrings: \\"a\\" | \\"b\\" | \\"c\\";

            /**
             * ChoicesNumbers - \`number\`
             */
            choicesNumbers: 1 | 2 | 3;
          }

          type Document = Foo;
        }
      }
      "
    `);
  });

  it("generates an optional prop if required isn't present", async () => {
    const foo = {
      type: 'document',
      title: 'Foo',
      name: 'foo',
      fields: [
        {
          title: 'Name',
          name: 'name',
          type: 'string',
        },
      ],
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo]),
    });

    expect(result.includes('name?: string')).toBe(true);
    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Foo
           */
          interface Foo extends Sanity.Document {
            _type: \\"foo\\";

            /**
             * Name - \`string\`
             */
            name?: string;
          }

          type Document = Foo;
        }
      }
      "
    `);
  });

  it('generates types for nested objects', async () => {
    const foo = {
      type: 'document',
      name: 'testDocument',
      fields: [
        {
          type: 'object',
          name: 'foo',
          fields: [
            {
              title: 'Name',
              name: 'name',
              type: 'string',
              codegen: { required: true },
              validation: jest.fn(),
            },
            {
              name: 'subObject',
              type: 'object',
              codegen: { required: true },
              validation: jest.fn(),
              fields: [
                {
                  title: 'Really nested',
                  name: 'reallyNested',
                  type: 'object',
                  validation: jest.fn(),
                  codegen: { required: true },
                  fields: [
                    {
                      title: 'Bar',
                      name: 'bar',
                      type: 'string',
                      codegen: { required: true },
                      validation: jest.fn(),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * TestDocument
           */
          interface TestDocument extends Sanity.Document {
            _type: \\"testDocument\\";

            /**
             * Foo - \`object\`
             */
            foo?: {
              /**
               * Name - \`string\`
               */
              name: string;

              /**
               * SubObject - \`object\`
               */
              subObject: {
                /**
                 * Really nested - \`object\`
                 */
                reallyNested: {
                  /**
                   * Bar - \`string\`
                   */
                  bar: string;
                };
              };
            };
          }

          type Document = TestDocument;
        }
      }
      "
    `);
  });

  it('generates types for images and files with fields', async () => {
    const foo = {
      type: 'image',
      title: 'Top-level Image Type',
      name: 'foo',
      fields: [
        {
          title: 'Title',
          name: 'title',
          type: 'string',
        },
      ],
    };

    const bar = {
      type: 'object',
      title: 'Bar',
      name: 'bar',
      fields: [
        {
          title: 'Nested Image Type',
          name: 'nestedImage',
          type: 'image',
          fields: [
            {
              title: 'Description',
              name: 'description',
              type: 'string',
              codegen: { required: true },
              validation: jest.fn(),
            },
          ],
        },
        {
          title: 'Nested File Type',
          name: 'nestedFile',
          type: 'file',
          fields: [
            {
              title: 'Other Description',
              name: 'otherDescription',
              type: 'number',
              codegen: { required: true },
              validation: jest.fn(),
            },
          ],
        },
      ],
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo, bar]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          type Foo = {
            _type: \\"foo\\";
            asset: Sanity.Asset;
            crop?: Sanity.ImageCrop;
            hotspot?: Sanity.ImageHotspot;

            /**
             * Title - \`string\`
             */
            title?: string;
          };

          type Bar = {
            _type: \\"bar\\";

            /**
             * Nested Image Type - \`image\`
             */
            nestedImage?: {
              asset: Sanity.Asset;
              crop?: Sanity.ImageCrop;
              hotspot?: Sanity.ImageHotspot;

              /**
               * Description - \`string\`
               */
              description: string;
            };

            /**
             * Nested File Type - \`file\`
             */
            nestedFile?: {
              asset: Sanity.Asset;

              /**
               * Other Description - \`number\`
               */
              otherDescription: number;
            };
          };
        }
      }
      "
    `);
  });

  it('generates types for array', async () => {
    const foo = {
      title: 'Foo',
      name: 'foo',
      type: 'document',
      fields: [
        {
          title: 'Array',
          name: 'array',
          type: 'array',
          of: [{ type: 'string' }],
        },
        {
          title: 'Array of references',
          name: 'refs',
          type: 'array',
          of: [{ type: 'reference', to: [{ type: 'bar' }] }],
        },
        {
          title: 'Array Two',
          name: 'arrayTwo',
          type: 'array',
          of: [{ type: 'bar' }, { type: 'baz' }],
        },
      ],
    };

    const bar = {
      title: 'Bar',
      name: 'bar',
      type: 'document',
      fields: [
        {
          title: 'Bar',
          name: 'bar',
          type: 'string',
          codegen: { required: true },
          validation: jest.fn(),
        },
      ],
    };

    const baz = {
      title: 'Baz',
      name: 'baz',
      type: 'document',
      fields: [
        {
          title: 'Baz',
          name: 'baz',
          type: 'string',
          codegen: { required: true },
          validation: jest.fn(),
        },
      ],
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo, bar, baz]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Foo
           */
          interface Foo extends Sanity.Document {
            _type: \\"foo\\";

            /**
             * Array - \`array\`
             */
            array?: Array<Sanity.Keyed<string>>;

            /**
             * Array of references - \`array\`
             */
            refs?: Array<Sanity.KeyedReference<Bar>>;

            /**
             * Array Two - \`array\`
             */
            arrayTwo?: Array<Sanity.Keyed<Bar> | Sanity.Keyed<Baz>>;
          }

          /**
           * Bar
           */
          interface Bar extends Sanity.Document {
            _type: \\"bar\\";

            /**
             * Bar - \`string\`
             */
            bar: string;
          }

          /**
           * Baz
           */
          interface Baz extends Sanity.Document {
            _type: \\"baz\\";

            /**
             * Baz - \`string\`
             */
            baz: string;
          }

          type Document = Foo | Bar | Baz;
        }
      }
      "
    `);
  });

  it('generates types for named slugs', async () => {
    const foo = {
      type: 'slug',
      name: 'fooSlug',
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          type FooSlug = {
            _type: \\"fooSlug\\";
            current: string;
          };
        }
      }
      "
    `);
  });

  it('generates types with arrays and nested objects', async () => {
    const foo = {
      type: 'document',
      title: 'Foo',
      name: 'foo',
      fields: [
        {
          title: 'Array',
          name: 'array',
          type: 'array',
          codegen: { required: true },
          validation: jest.fn(),
          of: [
            {
              type: 'object',
              fields: [
                {
                  title: 'Question',
                  name: 'question',
                  type: 'string',
                  codegen: { required: true },
                  validation: jest.fn(),
                },
                {
                  title: 'Answer',
                  name: 'answer',
                  type: 'string',
                  codegen: { required: true },
                  validation: jest.fn(),
                },
              ],
            },
          ],
        },
      ],
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Foo
           */
          interface Foo extends Sanity.Document {
            _type: \\"foo\\";

            /**
             * Array - \`array\`
             */
            array: Array<
              Sanity.Keyed<{
                /**
                 * Question - \`string\`
                 */
                question: string;

                /**
                 * Answer - \`string\`
                 */
                answer: string;
              }>
            >;
          }

          type Document = Foo;
        }
      }
      "
    `);
  });

  it('generates types for rich text editors (i.e. an array of blocks)', async () => {
    const foo = {
      title: 'Foo',
      name: 'foo',
      type: 'document',
      fields: [
        {
          title: 'Description',
          name: 'description',
          type: 'array',
          codegen: { required: true },
          validation: jest.fn(),
          of: [{ type: 'block' }],
        },
      ],
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Foo
           */
          interface Foo extends Sanity.Document {
            _type: \\"foo\\";

            /**
             * Description - \`array\`
             */
            description: Array<Sanity.Keyed<Sanity.Block>>;
          }

          type Document = Foo;
        }
      }
      "
    `);
  });

  it('generates types for references with type arguments', async () => {
    const foo = {
      title: 'Foo',
      name: 'foo',
      type: 'document',
      fields: [
        {
          title: 'Name',
          name: 'name',
          type: 'string',
        },
        {
          title: 'Bar',
          name: 'bar',
          type: 'reference',
          to: { type: 'bar' },
        },
        {
          title: 'Two Types',
          name: 'complex',
          type: 'reference',
          to: [{ type: 'bar' }, { type: 'baz' }],
        },
      ],
    };

    const bar = {
      name: 'bar',
      type: 'document',
      fields: [{ name: 'name', type: 'string' }],
    };

    const baz = {
      name: 'baz',
      type: 'document',
      fields: [{ name: 'name', type: 'string' }],
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo, bar, baz]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Foo
           */
          interface Foo extends Sanity.Document {
            _type: \\"foo\\";

            /**
             * Name - \`string\`
             */
            name?: string;

            /**
             * Bar - \`reference\`
             */
            bar?: Sanity.Reference<Bar>;

            /**
             * Two Types - \`reference\`
             */
            complex?: Sanity.Reference<Bar | Baz>;
          }

          /**
           * Bar
           */
          interface Bar extends Sanity.Document {
            _type: \\"bar\\";

            /**
             * Name - \`string\`
             */
            name?: string;
          }

          /**
           * Baz
           */
          interface Baz extends Sanity.Document {
            _type: \\"baz\\";

            /**
             * Name - \`string\`
             */
            name?: string;
          }

          type Document = Foo | Bar | Baz;
        }
      }
      "
    `);
  });

  it('generates types for fields with underscores and documents with hyphens', async () => {
    const foo = {
      title: 'Foo',
      name: 'foo-with-hyphen',
      type: 'document',
      fields: [
        {
          title: 'Bar',
          name: 'foo_bar',
          type: 'foo_bar',
        },
      ],
    };

    const bar = {
      name: 'foo_bar',
      type: 'object',
      fields: [{ name: 'name', type: 'string' }],
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo, bar]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Foo
           */
          interface FooWithHyphen extends Sanity.Document {
            _type: \\"foo-with-hyphen\\";

            /**
             * Bar - \`foo_bar\`
             */
            foo_bar?: FooBar;
          }

          type FooBar = {
            _type: \\"foo_bar\\";

            /**
             * Name - \`string\`
             */
            name?: string;
          };

          type Document = FooWithHyphen;
        }
      }
      "
    `);
  });

  it('generates empty interfaces for unknown types', async () => {
    const foo = {
      name: 'foo',
      type: 'object',
      fields: [
        {
          name: 'code',
          type: 'code',
        },
      ],
    };

    const result = await generateSchemaTypes({
      schema: schemaNormalizer([foo]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          type Foo = {
            _type: \\"foo\\";

            /**
             * Code - \`code\`
             */
            code?: Code;
          };
        }
      }
      "
    `);
  });

  it('throws if it finds a document type outside of a block', async () => {
    const foo = {
      title: 'Foo',
      name: 'foo',
      type: 'document',
      fields: [
        {
          title: 'Document',
          name: 'document',
          type: 'document',
          fields: [],
        },
      ],
    };

    let caught = false;

    try {
      await generateSchemaTypes({ schema: schemaNormalizer([foo]) });
    } catch (e) {
      caught = true;
      expect(e).toMatchInlineSnapshot(
        `[Error: Expected type \`foo.document\` to have property \`fields\` with at least one field.]`,
      );
    }

    expect(caught).toBe(true);
  });

  it.todo('generates the a different type for weak references');
});
