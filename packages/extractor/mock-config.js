const { defineConfig, defineType, defineField } = require('sanity');
const { deskTool } = require('sanity/desk');

module.exports = defineConfig({
  projectId: 'ir5yeiyh',
  dataset: 'production',
  plugins: [deskTool()],

  schema: {
    types: [
      defineType({
        type: 'document',
        name: 'myDocument',
        fields: [
          defineField({
            type: 'string',
            name: 'myField',
          }),
        ],
      }),
    ],
  },
});
