import { transformStructureToTs } from '../transform-structure-to-ts';
import { geopointStructure } from './geopoint';
import generate from '@babel/generator';
import prettier from 'prettier';

describe('imageHotspotStructure', () => {
  it('serializes to the correct type', () => {
    const { tsType, declarations } = transformStructureToTs({
      structure: geopointStructure,
      substitutions: {},
    });

    const result = prettier.format(`type Query = ${generate(tsType).code}`, {
      parser: 'typescript',
    });

    expect(result).toMatchInlineSnapshot(`
      "type Query =
        | {
            _type: "geopoint";
            alt: number;
            lat: number;
            lng: number;
          }
        | undefined;
      "
    `);

    expect(declarations).toMatchInlineSnapshot(`{}`);
  });
});
