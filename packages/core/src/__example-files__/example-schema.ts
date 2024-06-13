export const exampleSchema = [
  {
    type: 'document',
    name: 'book',
    fields: [
      { name: 'title', type: 'string' },
      {
        name: 'author',
        type: 'object',
        fields: [{ name: 'name', type: 'string' }],
      },
      { name: 'description', type: 'blocks' },
    ],
  },
  {
    type: 'document',
    name: 'editorial',
    fields: [
      { name: 'title', type: 'string' },
      { name: 'description', type: 'blocks' },
    ],
  },
  {
    name: 'blocks',
    type: 'array',
    of: [{ type: 'block' }],
  },
];
