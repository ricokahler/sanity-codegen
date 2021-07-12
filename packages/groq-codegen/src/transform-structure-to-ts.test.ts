import { transformSchemaToStructure } from './transform-schema-to-structure';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { transformStructureToTs } from './transform-structure-to-ts';
import generate from '@babel/generator';
import prettier from 'prettier';

function print({
  query,
  references,
}: ReturnType<typeof transformStructureToTs>) {
  return prettier.format(
    `${`type Everything = ${
      // @ts-expect-error `generate` is incorrectly typed
      generate(query).code
    }`}\n\n${Object.entries(references)
      .map(
        ([k, v]) =>
          `type ${k} = ${
            // @ts-expect-error `generate` is incorrectly typed
            generate(v).code
          }`,
      )
      .join('\n\n')}`,
    { parser: 'typescript' },
  );
}

describe('transformStructureToTs', () => {
  it('creates `TSType`s from `StructureNode`s', () => {
    const schema = schemaNormalizer([
      {
        name: 'book',
        type: 'document',
        fields: [
          {
            name: 'title',
            type: 'string',
          },
          {
            name: 'author',
            type: 'object',
            fields: [{ name: 'name', type: 'string' }],
          },
        ],
      },
      {
        name: 'movie',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          {
            name: 'leadActor',
            type: 'object',
            fields: [{ name: 'name', type: 'string' }],
          },
        ],
      },
    ]);

    const everythingNode = transformSchemaToStructure({ schema });
    const result = transformStructureToTs({ structure: everythingNode });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = (
        | {
            _type: \\"book\\";
            _id: string;
            title: string;
            author: {
              name: string;
            };
          }
        | {
            _type: \\"movie\\";
            _id: string;
            title: string;
            leadActor: {
              name: string;
            };
          }
      )[];
      "
    `);
  });

  it('creates named aliases when recursive definitions are found', () => {
    const schema = schemaNormalizer([
      {
        title: 'Leaf',
        name: 'leaf',
        type: 'object',
        fields: [{ name: 'value', type: 'string' }],
      },
      {
        name: 'node',
        type: 'object',
        fields: [
          { type: 'recursive', name: 'recursive' },
          { type: 'node', name: 'node' },
        ],
      },
      {
        name: 'recursive',
        type: 'object',
        fields: [
          { type: 'node', name: 'node' },
          { type: 'recursive', name: 'recursive' },
        ],
      },
      {
        name: 'config',
        type: 'document',
        fields: [{ name: 'node', type: 'node' }],
      },
    ]);

    const everythingNode = transformSchemaToStructure({ schema });
    const result = transformStructureToTs({ structure: everythingNode });

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = {
        _type: \\"config\\";
        _id: string;
        node: {
          recursive: {
            node: Ref_1t5qvoi;
            recursive: Ref_1sr8v0v;
          };
          node: Ref_1t5qvoi;
        };
      }[];

      type Ref_1t5qvoi = {
        recursive: {
          node: Ref_1t5qvoi;
          recursive: Ref_1sr8v0v;
        };
        node: Ref_1t5qvoi;
      };

      type Ref_1sr8v0v = {
        node: {
          recursive: Ref_1sr8v0v;
          node: Ref_1t5qvoi;
        };
        recursive: Ref_1sr8v0v;
      };
      "
    `);
  });
});
