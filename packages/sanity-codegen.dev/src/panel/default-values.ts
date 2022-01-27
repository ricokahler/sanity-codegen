export const defaultQuery = `
// groq
*[_type == 'person'][0] {
    _id,
    name,
    'firstPet': pets[0]->{
        _id,
        _type,
        name,
        color,
    }
}
`.trim();

export const defaultSchema = `
import createSchema from 'part:@sanity/base/schema-creator';
import schemaTypes from 'all:part:@sanity/base/schema-type';

export default createSchema({
  name: 'mySchema',
  types: schemaTypes.concat([
    {
      title: 'Person',
      name: 'person',
      type: 'document',
      fields: [
        {
          name: 'name',
          title: 'Name',
          type: 'string',
        },
        {
          name: 'image',
          title: 'Image',
          type: 'image',
        },
        {
          name: 'pets',
          title: 'Pets',
          type: 'array',
          of: [{ type: 'reference', to: [{ type: 'pet' }] }],
        },
      ],
    },
    {
      title: 'Pet',
      name: 'pet',
      type: 'document',
      fields: [
        {
          name: 'name',
          title: 'Name',
          type: 'string',
        },
        {
          name: 'color',
          title: 'Color',
          type: 'string',
        },
        {
          name: 'image',
          title: 'Image',
          type: 'image',
        },
      ],
    },
  ]),
});
`.trim();

export const defaultData = `
[
  {
    "_id": "id-rico",
    "_type": "person",
    "name": "Rico",
    "pets": [
      {
        "_ref": "id-rippy",
        "_key": "key-1"
      },
      {
        "_ref": "id-beanie",
        "_key": "key-2"
      }
    ]
  },
  {
    "_id": "id-rippy",
    "_type": "pet",
    "name": "Rippy",
    "color": "Orange"
  },
  {
    "_id": "id-beanie",
    "_type": "pet",
    "name": "Beanie Baby",
    "color": "Black"
  }
]
`.trim();
