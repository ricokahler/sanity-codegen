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
    ],
  },
];
