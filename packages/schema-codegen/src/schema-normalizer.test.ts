import { schemaNormalizer } from './schema-normalizer';

describe('normalizer', () => {
  it('takes in a sanity schema and returns a normalized, json-serializable representation', () => {
    const rawSchema = [
      {
        type: 'document',
        name: 'movie',
        title: 'Movie',
        fields: [
          {
            name: 'title',
            type: 'string',
          },
          {
            name: 'yearReleased',
            type: 'number',
          },
          {
            name: 'actors',
            type: 'array',
            of: [{ type: 'actor' }],
          },
        ],
      },
      {
        type: 'object',
        name: 'actor',
        title: 'Actor',
        fields: [
          {
            name: 'name',
            type: 'string',
          },
        ],
      },
    ];

    const normalized = schemaNormalizer(rawSchema);
    // JSON serializable test
    expect(rawSchema).toEqual(JSON.parse(JSON.stringify(rawSchema)));
    expect(normalized).toMatchSnapshot();
  });

  it('throws if there are missing fields in an object/document definition', () => {
    const rawSchema = [
      {
        type: 'object',
        name: 'myObject',
      },
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Expected type \`myObject\` to have property \`fields\` with at least one field."`,
    );
  });

  it('throws if there are missing fields in a nested object/document definition', () => {
    const rawSchema = [
      {
        type: 'object',
        name: 'myObject',
        fields: [
          {
            type: 'object',
            name: 'nestedObject',
          },
        ],
      },
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Expected type \`myObject.nestedObject\` to have property \`fields\` with at least one field."`,
    );
  });

  it('throws if there is a field with a missing name', () => {
    const rawSchema = [
      {
        type: 'object',
        fields: [
          {
            type: 'file',
            name: 'stuff',
            fields: [
              {
                type: 'string',
              },
            ],
          },
        ],
      },
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"\`(anonymous object).stuff\` had a field missing a \`name\` string."`,
    );
  });

  it('throws if there is an invalid type in a field', () => {
    const rawSchema = [
      {
        type: 'object',
        name: 'movie',
        fields: [
          {
            name: 'actor',
            type: null,
          },
        ],
      },
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"\`movie\` has an invalid \`type\`. Expected a string but got \`null\`"`,
    );
  });

  it('accepts and normalizes a field with a nested object', () => {
    const rawSchema = [
      {
        type: 'object',
        name: 'movie',
        fields: [
          {
            name: 'actor',
            type: 'object',
            fields: [
              {
                name: 'name',
                type: 'string',
              },
            ],
          },
        ],
      },
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('accepts and normalizes a field with a top-level reference', () => {
    const rawSchema = [
      {
        name: 'actor',
        type: 'object',
        fields: [{ name: 'name', type: 'string' }],
      },
      {
        type: 'object',
        name: 'movie',
        fields: [{ name: 'actor', type: 'actor' }],
      },
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('accepts and normalizes array types', () => {
    const rawSchema = [
      {
        type: 'array',
        name: 'myArray',
        of: [{ type: 'string' }],
      },
      {
        type: 'array',
        name: 'inlineObjects',
        of: [
          {
            type: 'object',
            fields: [{ name: 'foo', type: 'string' }],
          },
        ],
      },
      {
        type: 'array',
        name: 'topLevelType',
        // this accepts an of that isn't an array (this is undocumented in the
        // sanity.io docs)
        of: { type: 'actor' },
      },
      {
        type: 'object',
        name: 'actor',
        fields: [{ name: 'name', type: 'string' }],
      },
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('throws if `of` is missing for array types', () => {
    const rawSchema = [
      {
        type: 'object',
        name: 'myObject',
        fields: [{ type: 'array', name: 'myArrayMissingOf' }],
      },
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"\`myObject.myArrayMissingOf\` was of type \`array\` but did not have an \`of\` property."`,
    );
  });

  it('accepts a block type with nested of types', () => {
    const rawSchema = [
      {
        type: 'array',
        name: 'arrayTesting',
        of: [
          {
            type: 'block',
            of: [{ type: 'string' }],
          },
        ],
      },
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('throws if a top-level type is unnamed', () => {
    const rawSchema = [
      {
        type: 'boolean',
      },
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Found top-level registered type with no \`name\` field."`,
    );
  });

  it('accepts basic primitives types', () => {
    const rawSchema = [
      {
        type: 'boolean',
        name: 'boolean',
      },
      {
        type: 'object',
        name: 'myObject',
        fields: [
          { type: 'date', name: 'date' },
          { type: 'datetime', name: 'datetime' },
          { type: 'geopoint', name: 'geopoint' },
          { type: 'slug', name: 'slug' },
          { type: 'text', name: 'text' },
          { type: 'url', name: 'url' },
        ],
      },
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('accepts an image and file type with or without fields', () => {
    const rawSchema = [
      {
        type: 'image',
        name: 'myImage',
      },
      {
        type: 'file',
        name: 'myFile',
        fields: [{ name: 'description', type: 'string' }],
      },
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('accepts a number or string with or without list options', () => {
    const rawSchema = [
      {
        name: 'dropdown',
        type: 'string',
        options: {
          list: [
            { title: 'A', value: 'a' },
            { title: 'B', value: 'b' },
            { title: 'C', value: 'c' },
          ],
        },
      },
      {
        name: 'dropdownNoTitle',
        type: 'string',
        options: {
          list: ['e', 'f', 'g'],
        },
      },
      {
        name: 'numberDropdown',
        type: 'number',
        options: {
          list: [1, 2, 3],
        },
      },
      {
        name: 'someObject',
        type: 'object',
        fields: [
          {
            name: 'dropdownField',
            type: 'dropdown',
          },
          {
            name: 'numberDropdownField',
            type: 'numberDropdown',
          },
          {
            name: 'foo',
            type: 'string',
          },
          {
            name: 'bar',
            type: 'number',
          },
        ],
      },
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('throws if typeof options.list is not an array', () => {
    const rawSchema = [
      {
        type: 'object',
        name: 'myObject',
        fields: [
          {
            name: 'testField',
            type: 'array',
            of: [{ type: 'string' }],
            options: {
              list: 5,
            },
          },
        ],
      },
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Expected \`myObject.testField.options.list\` to be an array but found \`number\` instead."`,
    );
  });

  it('throws if a list option is an unsupported type', () => {
    const rawSchema = [
      {
        type: 'object',
        name: 'myObject',
        fields: [
          {
            name: 'testField',
            type: 'array',
            of: [{ type: 'string' }],
            options: {
              list: [() => {}],
            },
          },
        ],
      },
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid \`options.list\` item for type \`myObject.testField\`. Expected a string, number, or object but found \\"function\\""`,
    );
  });

  it("throws if a list option object doesn't have `title` and `value`", () => {
    const rawSchema = [
      {
        type: 'object',
        name: 'myObject',
        fields: [
          {
            name: 'testField',
            type: 'array',
            of: [{ type: 'string' }],
            options: {
              list: [{}],
            },
          },
        ],
      },
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid \`options.list\` item for type \`myObject.testField\`. Expected item to have properties \`title\` and \`value\`."`,
    );
  });

  it('accepts a reference type', () => {
    const rawSchema = [
      {
        type: 'document',
        name: 'movie',
        fields: [
          { name: 'title', type: 'string' },
          {
            name: 'actor',
            type: 'reference',
            to: [{ type: 'actor' }],
          },
        ],
      },
      {
        type: 'document',
        name: 'actor',
        fields: [{ name: 'name', type: 'string' }],
      },
    ];

    const result = schemaNormalizer(rawSchema);
    expect(result).toMatchSnapshot();
  });

  it('throws if there is no `to` property on a reference', () => {
    const rawSchema = [
      {
        type: 'document',
        name: 'movie',
        fields: [
          { name: 'title', type: 'string' },
          {
            name: 'actor',
            type: 'reference',
            // to: [{ type: 'actor' }],
          },
        ],
      },
    ];

    expect(() =>
      schemaNormalizer(rawSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"\`movie.actor\` was of type \`reference\` but did not have an \`to\` property."`,
    );
  });

  it('accepts a `block` type within inline objects', () => {
    const rawSchema = [
      {
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
      },
      {
        type: 'array',
        name: 'wysiwyg',
        of: [
          {
            type: 'block',
            of: {
              type: 'object',
              name: 'inlineObject',
              fields: [{ name: 'name', type: 'string' }],
            },
          },
        ],
      },
      {
        type: 'array',
        name: 'wysiwyg',
        of: [{ type: 'block' }],
      },
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
