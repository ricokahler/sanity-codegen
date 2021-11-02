import { transformStructureToTs } from '../transform-structure-to-ts';
import { geopointStructure } from './geopoint';
import generate from '@babel/generator';
import prettier from 'prettier';

describe('imageHotspotStructure', () => {
  it('serializes to the correct type', () => {
    const { query, references } = transformStructureToTs({
      structure: geopointStructure,
    });

    const result = prettier.format(`type Query = ${generate(query).code}`, {
      parser: 'typescript',
    });

    expect(result).toMatchInlineSnapshot(`
      "type Query =
        | {
            _type: \\"geopoint\\";
            alt: number;
            lat: number;
            lng: number;
          }
        | undefined;
      "
    `);

    expect(references).toMatchInlineSnapshot(`Object {}`);
  });
});
