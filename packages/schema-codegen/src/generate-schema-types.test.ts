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
      normalizedSchema: schemaNormalizer([foo]),
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
             * Image - \`Image\`
             */
            image?: {
              asset: Sanity.Asset;
              crop?: Sanity.ImageCrop;
              hotspot?: Sanity.ImageHotspot;
            };

            /**
             * Boolean - \`Boolean\`
             */
            boolean?: boolean;

            /**
             * Date - \`Date\`
             */
            date?: string;

            /**
             * Datetime - \`Datetime\`
             */
            datetime?: string;

            /**
             * Number - \`Number\`
             */
            number?: number;

            /**
             * Slug - \`Slug\`
             */
            slug?: {
              _type: \\"slug\\";
              current: string;
            };

            /**
             * String - \`String\`
             */
            string?: string;

            /**
             * Text - \`Text\`
             */
            text?: string;

            /**
             * Url - \`Url\`
             */
            url?: string;

            /**
             * Image - \`Image\`
             */
            image?: {
              asset: Sanity.Asset;
              crop?: Sanity.ImageCrop;
              hotspot?: Sanity.ImageHotspot;
            };

            /**
             * File - \`File\`
             */
            file?: {
              asset: Sanity.Asset;
            };

            /**
             * Geopoint - \`Geopoint\`
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
      normalizedSchema: schemaNormalizer([foo]),
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
             * Choices Strings - \`String\`
             */
            choicesStrings: \\"a\\" | \\"b\\" | \\"c\\";

            /**
             * Choices Numbers - \`Number\`
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
      normalizedSchema: schemaNormalizer([foo]),
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
             * Name - \`String\`
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
      normalizedSchema: schemaNormalizer([foo]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          /**
           * Test Document
           */
          interface TestDocument extends Sanity.Document {
            _type: \\"testDocument\\";

            /**
             * Foo - \`Object\`
             */
            foo?: {
              /**
               * Name - \`String\`
               */
              name: string;

              /**
               * Sub Object - \`Object\`
               */
              subObject: {
                /**
                 * Really nested - \`Object\`
                 */
                reallyNested: {
                  /**
                   * Bar - \`String\`
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
      normalizedSchema: schemaNormalizer([foo, bar]),
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
             * Title - \`String\`
             */
            title?: string;
          };

          type Bar = {
            _type: \\"bar\\";

            /**
             * Nested Image Type - \`Image\`
             */
            nestedImage?: {
              asset: Sanity.Asset;
              crop?: Sanity.ImageCrop;
              hotspot?: Sanity.ImageHotspot;

              /**
               * Description - \`String\`
               */
              description: string;
            };

            /**
             * Nested File Type - \`File\`
             */
            nestedFile?: {
              asset: Sanity.Asset;

              /**
               * Other Description - \`Number\`
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
      normalizedSchema: schemaNormalizer([foo, bar, baz]),
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
             * Array - \`Array\`
             */
            array?: Array<Sanity.Keyed<string>>;

            /**
             * Array of references - \`Array\`
             */
            refs?: Array<Sanity.KeyedReference<Bar>>;

            /**
             * Array Two - \`Array\`
             */
            arrayTwo?: Array<Sanity.Keyed<Bar> | Sanity.Keyed<Baz>>;
          }

          /**
           * Bar
           */
          interface Bar extends Sanity.Document {
            _type: \\"bar\\";

            /**
             * Bar - \`String\`
             */
            bar: string;
          }

          /**
           * Baz
           */
          interface Baz extends Sanity.Document {
            _type: \\"baz\\";

            /**
             * Baz - \`String\`
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
      normalizedSchema: schemaNormalizer([foo]),
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
      normalizedSchema: schemaNormalizer([foo]),
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
             * Array - \`Array\`
             */
            array: Array<
              Sanity.Keyed<{
                /**
                 * Question - \`String\`
                 */
                question: string;

                /**
                 * Answer - \`String\`
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
      normalizedSchema: schemaNormalizer([foo]),
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
             * Description - \`Array\`
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
      normalizedSchema: schemaNormalizer([foo, bar, baz]),
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
             * Name - \`String\`
             */
            name?: string;

            /**
             * Bar - \`Reference\`
             */
            bar?: Sanity.Reference<Bar>;

            /**
             * Two Types - \`Reference\`
             */
            complex?: Sanity.Reference<Bar | Baz>;
          }

          /**
           * Bar
           */
          interface Bar extends Sanity.Document {
            _type: \\"bar\\";

            /**
             * Name - \`String\`
             */
            name?: string;
          }

          /**
           * Baz
           */
          interface Baz extends Sanity.Document {
            _type: \\"baz\\";

            /**
             * Name - \`String\`
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
      normalizedSchema: schemaNormalizer([foo, bar]),
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
             * Bar - \`RegistryReference\`
             */
            foo_bar?: FooBar;
          }

          type FooBar = {
            _type: \\"foo_bar\\";

            /**
             * Name - \`String\`
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
      normalizedSchema: schemaNormalizer([foo]),
    });

    expect(result).toMatchInlineSnapshot(`
      "/// <reference types=\\"@sanity-codegen/types\\" />

      declare namespace Sanity {
        namespace Schema {
          type Foo = {
            _type: \\"foo\\";

            /**
             * Code - \`RegistryReference\`
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
      await generateSchemaTypes({ normalizedSchema: schemaNormalizer([foo]) });
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
