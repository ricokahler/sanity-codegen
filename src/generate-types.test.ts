import generateTypes from './generate-types';

describe('generate-types', () => {
  it('generates types for sanity intrinsic types', async () => {
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

    const result = await generateTypes({ types: [foo] });

    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      /**
       * Foo
       *
       *
       */
      export interface Foo extends SanityDocument {
        _type: \\"foo\\";

        /**
         * image — \`image\`
         *
         *
         */
        image?: { _type: \\"image\\"; asset: SanityAsset };

        /**
         * boolean — \`boolean\`
         *
         *
         */
        boolean?: boolean;

        /**
         * date — \`date\`
         *
         *
         */
        date?: string;

        /**
         * datetime — \`datetime\`
         *
         *
         */
        datetime?: string;

        /**
         * number — \`number\`
         *
         *
         */
        number?: number;

        /**
         * slug — \`slug\`
         *
         *
         */
        slug?: { _type: \\"slug\\"; current: string };

        /**
         * string — \`string\`
         *
         *
         */
        string?: string;

        /**
         * text — \`text\`
         *
         *
         */
        text?: string;

        /**
         * url — \`url\`
         *
         *
         */
        url?: string;

        /**
         * image — \`image\`
         *
         *
         */
        image?: { _type: \\"image\\"; asset: SanityAsset };

        /**
         * file — \`file\`
         *
         *
         */
        file?: { _type: \\"file\\"; asset: SanityAsset };

        /**
         * geopoint — \`geopoint\`
         *
         *
         */
        geopoint?: SanityGeoPoint;
      }

      export type Documents = Foo;
      "
    `);
  });

  it('generates unioned string literals if options.list is provided', async () => {
    const foo = {
      type: 'document',
      name: 'foo',
      fields: [
        {
          name: 'choices',
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
      ],
    };

    const result = await generateTypes({ types: [foo] });

    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      /**
       * foo
       *
       *
       */
      export interface Foo extends SanityDocument {
        _type: \\"foo\\";

        /**
         * choices — \`string\`
         *
         *
         */
        choices: \\"a\\" | \\"b\\" | \\"c\\";
      }

      export type Documents = Foo;
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

    const result = await generateTypes({ types: [foo] });

    expect(result.includes('name?: string')).toBe(true);
    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      /**
       * Foo
       *
       *
       */
      export interface Foo extends SanityDocument {
        _type: \\"foo\\";

        /**
         * Name — \`string\`
         *
         *
         */
        name?: string;
      }

      export type Documents = Foo;
      "
    `);
  });

  it('generates types for nested objects', async () => {
    const foo = {
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
    };

    const result = await generateTypes({ types: [foo] });

    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      export type Foo = {
        _type: \\"foo\\";
        /**
         * Name — \`string\`
         *
         *
         */
        name: string;

        /**
         * subObject — \`object\`
         *
         *
         */
        subObject: {
          _type: \\"subObject\\";
          /**
           * Really nested — \`object\`
           *
           *
           */
          reallyNested: {
            _type: \\"reallyNested\\";
            /**
             * Bar — \`string\`
             *
             *
             */
            bar: string;
          };
        };
      };
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

    const result = await generateTypes({ types: [foo, bar] });

    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      export type Foo = {
        _type: \\"foo\\";
        asset: SanityAsset;
        /**
         * Title — \`string\`
         *
         *
         */
        title?: string;
      };

      export type Bar = {
        _type: \\"bar\\";
        /**
         * Nested Image Type — \`image\`
         *
         *
         */
        nestedImage?: {
          _type: \\"nestedImage\\";
          asset: SanityAsset;
          /**
           * Description — \`string\`
           *
           *
           */
          description: string;
        };

        /**
         * Nested File Type — \`file\`
         *
         *
         */
        nestedFile?: {
          _type: \\"nestedFile\\";
          asset: SanityAsset;
          /**
           * Other Description — \`number\`
           *
           *
           */
          otherDescription: number;
        };
      };
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

    const result = await generateTypes({ types: [foo, bar, baz] });

    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      /**
       * Foo
       *
       *
       */
      export interface Foo extends SanityDocument {
        _type: \\"foo\\";

        /**
         * Array — \`array\`
         *
         *
         */
        array?: Array<string>;

        /**
         * Array Two — \`array\`
         *
         *
         */
        arrayTwo?: Array<Bar | Baz>;
      }

      /**
       * Bar
       *
       *
       */
      export interface Bar extends SanityDocument {
        _type: \\"bar\\";

        /**
         * Bar — \`string\`
         *
         *
         */
        bar: string;
      }

      /**
       * Baz
       *
       *
       */
      export interface Baz extends SanityDocument {
        _type: \\"baz\\";

        /**
         * Baz — \`string\`
         *
         *
         */
        baz: string;
      }

      export type Documents = Foo | Bar | Baz;
      "
    `);
  });

  it('generates types for named slugs', async () => {
    const foo = {
      type: 'slug',
      name: 'fooSlug',
    };

    const result = await generateTypes({ types: [foo] });

    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      export type FooSlug = { _type: \\"fooSlug\\"; current: string };
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

    const result = await generateTypes({ types: [foo] });

    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      /**
       * Foo
       *
       *
       */
      export interface Foo extends SanityDocument {
        _type: \\"foo\\";

        /**
         * Array — \`array\`
         *
         *
         */
        array: Array<{
          _key: string;
          /**
           * Question — \`string\`
           *
           *
           */
          question: string;

          /**
           * Answer — \`string\`
           *
           *
           */
          answer: string;
        }>;
      }

      export type Documents = Foo;
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

    const result = await generateTypes({ types: [foo] });

    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      /**
       * Foo
       *
       *
       */
      export interface Foo extends SanityDocument {
        _type: \\"foo\\";

        /**
         * Description — \`array\`
         *
         *
         */
        description: Array<SanityBlock>;
      }

      export type Documents = Foo;
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
          to: [{ type: 'bar' }],
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

    const result = await generateTypes({ types: [foo, bar, baz] });

    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      /**
       * Foo
       *
       *
       */
      export interface Foo extends SanityDocument {
        _type: \\"foo\\";

        /**
         * Name — \`string\`
         *
         *
         */
        name?: string;

        /**
         * Bar — \`reference\`
         *
         *
         */
        bar?: SanityReference<Bar>;

        /**
         * Two Types — \`reference\`
         *
         *
         */
        complex?: SanityReference<Bar | Baz>;
      }

      /**
       * bar
       *
       *
       */
      export interface Bar extends SanityDocument {
        _type: \\"bar\\";

        /**
         * name — \`string\`
         *
         *
         */
        name?: string;
      }

      /**
       * baz
       *
       *
       */
      export interface Baz extends SanityDocument {
        _type: \\"baz\\";

        /**
         * name — \`string\`
         *
         *
         */
        name?: string;
      }

      export type Documents = Foo | Bar | Baz;
      "
    `);
  });

  it('generates types for fields with underscores', async () => {
    const foo = {
      title: 'Foo',
      name: 'foo',
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

    const result = await generateTypes({ types: [foo, bar] });

    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      /**
       * Foo
       *
       *
       */
      export interface Foo extends SanityDocument {
        _type: \\"foo\\";

        /**
         * Bar — \`foo_bar\`
         *
         *
         */
        foo_bar?: FooBar;
      }

      export type FooBar = {
        _type: \\"foo_bar\\";
        /**
         * name — \`string\`
         *
         *
         */
        name?: string;
      };

      export type Documents = Foo;
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

    const result = await generateTypes({
      types: [foo],
    });

    expect(result).toMatchInlineSnapshot(`
      "import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from \\"sanity-codegen\\";

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };

      export type Foo = {
        _type: \\"foo\\";
        /**
         * code — \`code\`
         *
         *
         */
        code?: Code;
      };

      /**
       * This interface is a stub. It was referenced in your sanity schema but
       * the definition was not actually found. Future versions of
       * sanity-codegen will let you type this explicity.
       *
       * Interface merging may help for the time being:
       * https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces
       */
      interface Code {}
      "
    `);
  });

  it('throws if the required flag is present but there is no validation function', async () => {
    const foo = {
      type: 'document',
      title: 'Foo',
      name: 'foo',
      fields: [
        {
          title: 'Name',
          name: 'name',
          type: 'string',
          codegen: { required: true },
        },
      ],
    };

    let caught = false;

    try {
      await generateTypes({ types: [foo] });
    } catch (e) {
      caught = true;
      expect(e).toMatchInlineSnapshot(
        `[Error: Field "foo.name" was marked as required but did not have a validation function.]`
      );
    }

    expect(caught).toBe(true);
  });

  it('throws if the top-level type name is not composed of alphanumeric or underscores', async () => {
    const foo = {
      type: 'document',
      name: 'foo_baré',
      fields: [
        {
          title: 'Name',
          name: 'name',
          type: 'string',
          codegen: { required: true },
          validation: jest.fn(),
        },
      ],
    };

    let caught = false;

    try {
      await generateTypes({ types: [foo] });
    } catch (e) {
      caught = true;
      expect(e).toMatchInlineSnapshot(
        `[Error: Name "foo_baré" is not valid. Ensure camel case, alphanumeric and underscore characters only]`
      );
    }

    expect(caught).toBe(true);
  });

  it('throws if the field name is not composed of alphanumeric or underscores', async () => {
    const foo = {
      type: 'document',
      name: 'foo',
      fields: [
        {
          title: 'Cool Name',
          name: 'cool_namé',
          type: 'string',
          codegen: { required: true },
          validation: jest.fn(),
        },
      ],
    };

    let caught = false;

    try {
      await generateTypes({ types: [foo] });
    } catch (e) {
      caught = true;
      expect(e).toMatchInlineSnapshot(
        `[Error: Name "cool_namé" in type "foo" is not valid. Ensure camel case, alphanumeric and underscore characters only]`
      );
    }

    expect(caught).toBe(true);
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
      await generateTypes({ types: [foo] });
    } catch (e) {
      caught = true;
      expect(e).toMatchInlineSnapshot(`[Error: Found nested document type]`);
    }

    expect(caught).toBe(true);
  });

  it('throws if it finds a span type outside of a block', async () => {
    const foo = {
      title: 'Foo',
      name: 'foo',
      type: 'document',
      fields: [
        {
          title: 'Span',
          name: 'span',
          type: 'span',
        },
      ],
    };

    let caught = false;

    try {
      await generateTypes({ types: [foo] });
    } catch (e) {
      caught = true;
      expect(e).toMatchInlineSnapshot(
        `[Error: Found span outside of a block type.]`
      );
    }

    expect(caught).toBe(true);
  });
});
