import { createStructure } from '../utils';

export const imageDimensionsStructure = createStructure({
  type: 'Object',
  canBeNull: false,
  canBeOptional: false,
  properties: [
    {
      key: '_type',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: 'sanity.imageDimensions',
      }),
    },
    {
      key: 'aspectRatio',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'height',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'width',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
  ],
});

export const imagePaletteSwatchStructure = createStructure({
  type: 'Object',
  canBeNull: false,
  canBeOptional: false,
  properties: [
    {
      key: '_type',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: 'sanity.imagePaletteSwatch',
      }),
    },
    {
      key: 'background',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'foreground',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'population',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'title',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
  ],
});

export const imagePaletteStructure = createStructure({
  type: 'Object',
  canBeNull: false,
  canBeOptional: false,
  properties: [
    {
      key: '_type',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: 'sanity.imagePalette',
      }),
    },
    {
      key: 'darkMuted',
      value: imagePaletteSwatchStructure,
    },
    {
      key: 'darkVibrant',
      value: imagePaletteSwatchStructure,
    },
    {
      key: 'dominant',
      value: imagePaletteSwatchStructure,
    },
    {
      key: 'lightMuted',
      value: imagePaletteSwatchStructure,
    },
    {
      key: 'lightVibrant',
      value: imagePaletteSwatchStructure,
    },
    {
      key: 'muted',
      value: imagePaletteSwatchStructure,
    },
    {
      key: 'vibrant',
      value: imagePaletteSwatchStructure,
    },
  ],
});

export const imageMetadataStructure = createStructure({
  type: 'Object',
  canBeNull: false,
  canBeOptional: false,
  properties: [
    {
      key: '_type',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: 'sanity.imageMetadata',
      }),
    },
    {
      key: 'dimensions',
      value: imageDimensionsStructure,
    },
    {
      key: 'hasAlpha',
      value: createStructure({
        type: 'Boolean',
        canBeNull: false,
        canBeOptional: false,
      }),
    },
    {
      key: 'isOpaque',
      value: createStructure({
        type: 'Boolean',
        canBeNull: false,
        canBeOptional: false,
      }),
    },
    {
      key: 'lqip',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'palette',
      value: imagePaletteStructure,
    },
  ],
});

export const imageAssetStructure = createStructure({
  type: 'Object',
  canBeNull: false,
  canBeOptional: false,
  properties: [
    {
      key: '_type',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: 'sanity.imageAsset',
      }),
    },
    {
      key: 'assetId',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'extension',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'metadata',
      value: imageMetadataStructure,
    },
    {
      key: 'mimeType',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'originalFilename',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'path',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'sha1hash',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'size',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'uploadId',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'url',
      value: createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
  ],
});

export const imageCropStructure = createStructure({
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
        value: 'sanity.imageCrop',
      }),
    },
    {
      key: 'bottom',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'left',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'right',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'top',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
  ],
});

export const imageHotspotStructure = createStructure({
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
        value: 'sanity.imageHotspot',
      }),
    },
    {
      key: 'height',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'width',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'x',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
    {
      key: 'y',
      value: createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      }),
    },
  ],
});
