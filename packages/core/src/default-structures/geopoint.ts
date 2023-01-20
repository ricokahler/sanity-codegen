import { createStructure } from '../utils';

export const geopointStructure = createStructure({
  type: 'Object',
  canBeNull: false,
  canBeOptional: true,
  properties: [
    {
      key: '_type',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: 'geopoint',
      }),
    },
    {
      key: 'lat',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'lng',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'alt',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
  ],
});
