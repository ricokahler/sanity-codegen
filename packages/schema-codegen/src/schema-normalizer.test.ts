import { schemaNormalizer } from './schema-normalizer';
import { defineType, defineField } from 'sanity';

describe('normalizer', () => {
  it('takes in a sanity schema and returns a normalized representation', () => {
    const rawSchema = [
      defineType({
        type: 'document',
        name: 'movie',
        title: 'Movie',
        fields: [
          defineField({
            name: 'title',
            type: 'string',
          }),
          defineField({
            name: 'yearReleased',
            type: 'number',
          }),
          defineField({
            name: 'actors',
            type: 'array',
            of: [{ type: 'actor' }],
          }),
        ],
      }),
      defineType({
        type: 'object',
        name: 'actor',
        title: 'Actor',
        fields: [
          defineField({
            name: 'name',
            type: 'string',
          }),
        ],
      }),
    ];

    const normalized = schemaNormalizer(rawSchema);

    // TODO: probably a better idea to remove the snapshots and replace with
    // `.toMatchObject`
    expect(normalized).toMatchSnapshot();
  });

  it('throws if there are missing fields in an object/document definition', () => {
    // @ts-expect-error
    const rawSchema = [defineType({ type: 'object', name: 'myObject' })];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Expected type \`myObject\` to have property \`fields\` with at least one field."`,
    );
  });

  it('throws if there are missing fields in a nested object/document definition', () => {
    const rawSchema = [
      defineType({
        type: 'object',
        name: 'myObject',
        fields: [
          {
            type: 'object',
            name: 'nestedObject',
          },
        ],
      }),
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Expected type \`myObject.nestedObject\` to have property \`fields\` with at least one field."`,
    );
  });

  it('throws if there is a field with a missing name', () => {
    const rawSchema = [
      defineType({
        type: 'object',
        // @ts-expect-error
        fields: [
          defineField({
            type: 'file',
            name: 'stuff',
            // @ts-expect-error
            fields: [defineField({ type: 'string' })],
          }),
        ],
      }),
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"\`(anonymous object).stuff\` had a field missing a \`name\` string."`,
    );
  });

  it('throws if there is an invalid type in a field', () => {
    const rawSchema = [
      defineType({
        type: 'object',
        name: 'movie',
        // @ts-expect-error
        fields: [defineField({ name: 'actor', type: null })],
      }),
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"\`movie\` has an invalid \`type\`. Expected a string but got \`null\`"`,
    );
  });

  it('accepts and normalizes a field with a nested object', () => {
    const rawSchema = [
      defineType({
        type: 'object',
        name: 'movie',
        fields: [
          defineField({
            name: 'actor',
            type: 'object',
            fields: [defineField({ name: 'name', type: 'string' })],
          }),
        ],
      }),
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('accepts and normalizes a field with a top-level reference', () => {
    const rawSchema = [
      defineType({
        name: 'actor',
        type: 'object',
        fields: [defineField({ name: 'name', type: 'string' })],
      }),
      defineType({
        type: 'object',
        name: 'movie',
        fields: [defineField({ name: 'actor', type: 'actor' })],
      }),
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('accepts and normalizes array types', () => {
    const rawSchema = [
      defineType({
        type: 'array',
        name: 'myArray',
        of: [{ type: 'string' }],
      }),
      defineType({
        type: 'array',
        name: 'inlineObjects',
        of: [
          {
            type: 'object',
            fields: [{ name: 'foo', type: 'string' }],
          },
        ],
      }),
      defineType({
        type: 'array',
        name: 'topLevelType',
        // @ts-expect-error
        // this accepts an of that isn't an array (this is undocumented in the
        // sanity.io docs)
        of: { type: 'actor' },
      }),
      defineType({
        type: 'object',
        name: 'actor',
        fields: [defineField({ name: 'name', type: 'string' })],
      }),
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('throws if `of` is missing for array types', () => {
    const rawSchema = [
      defineType({
        type: 'object',
        name: 'myObject',
        // @ts-expect-error
        fields: [defineField({ type: 'array', name: 'myArrayMissingOf' })],
      }),
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"\`myObject.myArrayMissingOf\` was of type \`array\` but did not have an \`of\` property."`,
    );
  });

  it('accepts a block type with nested of types', () => {
    const rawSchema = [
      defineType({
        type: 'array',
        name: 'arrayTesting',
        of: [
          {
            type: 'block',
            of: [{ type: 'string' }],
          },
        ],
      }),
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('throws if a top-level type is unnamed', () => {
    // @ts-expect-error
    const rawSchema = [defineType({ type: 'boolean' })];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Found top-level registered type with no \`name\` field."`,
    );
  });

  it('accepts basic primitives types', () => {
    const rawSchema = [
      defineType({
        type: 'boolean',
        name: 'boolean',
      }),
      defineType({
        type: 'object',
        name: 'myObject',
        fields: [
          defineField({ type: 'date', name: 'date' }),
          defineField({ type: 'datetime', name: 'datetime' }),
          defineField({ type: 'geopoint', name: 'geopoint' }),
          defineField({ type: 'slug', name: 'slug' }),
          defineField({ type: 'text', name: 'text' }),
          defineField({ type: 'url', name: 'url' }),
        ],
      }),
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('accepts an image and file type with or without fields', () => {
    const rawSchema = [
      defineType({
        type: 'image',
        name: 'myImage',
      }),
      defineType({
        type: 'file',
        name: 'myFile',
        fields: [defineField({ name: 'description', type: 'string' })],
      }),
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('accepts a number or string with or without list options', () => {
    const rawSchema = [
      defineType({
        name: 'dropdown',
        type: 'string',
        options: {
          list: [
            { title: 'A', value: 'a' },
            { title: 'B', value: 'b' },
            { title: 'C', value: 'c' },
          ],
        },
      }),
      defineType({
        name: 'dropdownNoTitle',
        type: 'string',
        options: {
          list: ['e', 'f', 'g'],
        },
      }),
      defineType({
        name: 'numberDropdown',
        type: 'number',
        options: {
          list: [1, 2, 3],
        },
      }),
      defineType({
        name: 'someObject',
        type: 'object',
        fields: [
          defineField({
            name: 'dropdownField',
            type: 'dropdown',
          }),
          defineField({
            name: 'numberDropdownField',
            type: 'numberDropdown',
          }),
          defineField({
            name: 'foo',
            type: 'string',
          }),
          defineField({
            name: 'bar',
            type: 'number',
          }),
        ],
      }),
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('throws if typeof options.list is not an array', () => {
    const rawSchema = [
      defineType({
        type: 'object',
        name: 'myObject',
        fields: [
          defineField({
            name: 'testField',
            type: 'array',
            of: [{ type: 'string' }],
            options: {
              // @ts-expect-error
              list: 5,
            },
          }),
        ],
      }),
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Expected \`myObject.testField.options.list\` to be an array but found \`number\` instead."`,
    );
  });

  it('throws if a list option is an unsupported type', () => {
    const rawSchema = [
      defineType({
        type: 'object',
        name: 'myObject',
        fields: [
          defineField({
            name: 'testField',
            type: 'array',
            of: [{ type: 'string' }],
            options: {
              list: [() => {}],
            },
          }),
        ],
      }),
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid \`options.list\` item for type \`myObject.testField\`. Expected a string, number, or object but found "function""`,
    );
  });

  it("throws if a list option object doesn't have `title` and `value`", () => {
    const rawSchema = [
      defineType({
        type: 'object',
        name: 'myObject',
        fields: [
          defineField({
            name: 'testField',
            type: 'array',
            of: [{ type: 'string' }],
            options: {
              list: [{}],
            },
          }),
        ],
      }),
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid \`options.list\` item for type \`myObject.testField\`. Expected item to have properties \`title\` and \`value\`."`,
    );
  });

  it('accepts a reference type', () => {
    const rawSchema = [
      defineType({
        type: 'document',
        name: 'movie',
        fields: [
          defineField({ name: 'title', type: 'string' }),
          defineField({
            name: 'actor',
            type: 'reference',
            to: [{ type: 'actor' }],
          }),
        ],
      }),
      defineType({
        type: 'document',
        name: 'actor',
        fields: [defineField({ name: 'name', type: 'string' })],
      }),
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('throws if there is no `to` property on a reference', () => {
    const rawSchema = [
      defineType({
        type: 'document',
        name: 'movie',
        fields: [
          defineField({ name: 'title', type: 'string' }),
          // @ts-expect-error
          defineField({
            name: 'actor',
            type: 'reference',
            // to: [{ type: 'actor' }],
          }),
        ],
      }),
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"\`movie.actor\` was of type \`reference\` but did not have an \`to\` property."`,
    );
  });

  it('accepts a `block` type within inline objects', () => {
    const rawSchema = [
      defineType({
        type: 'array',
        name: 'wysiwyg',
        of: [
          {
            type: 'block',
            of: [
              {
                type: 'object',
                name: 'inlineObject',
                fields: [defineField({ name: 'name', type: 'string' })],
              },
            ],
          },
        ],
      }),
      defineType({
        type: 'array',
        name: 'wysiwyg',
        of: [
          {
            type: 'block',
            of: [
              {
                type: 'object',
                name: 'inlineObject',
                fields: [{ name: 'name', type: 'string' }],
              },
            ],
          },
        ],
      }),
      defineType({
        type: 'array',
        name: 'wysiwyg',
        of: [{ type: 'block' }],
      }),
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it.todo('throws if there are two of the same registered types');

  it.todo("throws if it can't find a type referenced in the document");

  it.todo("warns if a required field doesn't have a validation function");

  it.todo('throws if it finds a nested document type');

  it.todo('creates references with _weak: true');

  it.todo(
    'throws if the top-level type name is not composed of alphanumeric or underscores',
  );

  it.todo(
    'throws if the field name is not composed of alphanumeric or underscores',
  );

  it.todo('throws if it finds a span type outside of a block');

  it.todo('throws if it finds a non-top-level Alias with a name');

  it.todo('throws if it finds a document without a `name`');

  it.todo('throws if it finds a non-top-level document');

  it.todo('throws if it finds a top level type without a `name`');

  it.todo('throws if a name is trying to replace a primitive name');
});
