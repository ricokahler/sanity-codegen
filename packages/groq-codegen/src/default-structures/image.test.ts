import { transformStructureToTs } from '../transform-structure-to-ts';
import {
  imageAssetStructure,
  imageCropStructure,
  imageHotspotStructure,
} from './image';
import generate from '@babel/generator';
import prettier from 'prettier';

describe('imageAssetStructure', () => {
  it('serializes to the correct type', () => {
    const { query, references } = transformStructureToTs({
      structure: imageAssetStructure,
    });

    const result = prettier.format(`type Query = ${generate(query).code}`, {
      parser: 'typescript',
    });

    expect(result).toMatchInlineSnapshot(`
      "type Query = {
        _type: "sanity.imageAsset";
        assetId: string;
        extension: string;
        metadata: {
          _type: "sanity.imageMetadata";
          dimensions: {
            _type: "sanity.imageDimensions";
            aspectRatio: number;
            height: number;
            width: number;
          };
          hasAlpha: boolean;
          isOpaque: boolean;
          lqip: string;
          palette: {
            _type: "sanity.imagePalette";
            darkMuted: {
              _type: "sanity.imagePaletteSwatch";
              background: string;
              foreground: string;
              population: number;
              title: string;
            };
            darkVibrant: {
              _type: "sanity.imagePaletteSwatch";
              background: string;
              foreground: string;
              population: number;
              title: string;
            };
            dominant: {
              _type: "sanity.imagePaletteSwatch";
              background: string;
              foreground: string;
              population: number;
              title: string;
            };
            lightMuted: {
              _type: "sanity.imagePaletteSwatch";
              background: string;
              foreground: string;
              population: number;
              title: string;
            };
            lightVibrant: {
              _type: "sanity.imagePaletteSwatch";
              background: string;
              foreground: string;
              population: number;
              title: string;
            };
            muted: {
              _type: "sanity.imagePaletteSwatch";
              background: string;
              foreground: string;
              population: number;
              title: string;
            };
            vibrant: {
              _type: "sanity.imagePaletteSwatch";
              background: string;
              foreground: string;
              population: number;
              title: string;
            };
          };
        };
        mimeType: string;
        originalFilename: string;
        path: string;
        sha1hash: string;
        size: number;
        uploadId: string;
        url: string;
      };
      "
    `);

    expect(references).toMatchInlineSnapshot(`{}`);
  });
});

describe('imageCropStructure', () => {
  it('serializes to the correct type', () => {
    const { query, references } = transformStructureToTs({
      structure: imageCropStructure,
    });

    const result = prettier.format(`type Query = ${generate(query).code}`, {
      parser: 'typescript',
    });

    expect(result).toMatchInlineSnapshot(`
      "type Query =
        | {
            _type: "sanity.imageCrop";
            bottom: number;
            left: number;
            right: number;
            top: number;
          }
        | undefined;
      "
    `);

    expect(references).toMatchInlineSnapshot(`{}`);
  });
});

describe('imageHotspotStructure', () => {
  it('serializes to the correct type', () => {
    const { query, references } = transformStructureToTs({
      structure: imageHotspotStructure,
    });

    const result = prettier.format(`type Query = ${generate(query).code}`, {
      parser: 'typescript',
    });

    expect(result).toMatchInlineSnapshot(`
      "type Query =
        | {
            _type: "sanity.imageHotspot";
            height: number;
            width: number;
            x: number;
            y: number;
          }
        | undefined;
      "
    `);

    expect(references).toMatchInlineSnapshot(`{}`);
  });
});
