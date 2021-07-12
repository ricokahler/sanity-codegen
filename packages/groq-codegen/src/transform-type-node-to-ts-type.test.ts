import { transformSchemaToTypeNode } from './transform-schema-to-type-node';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { transformTypeNodeToTsType } from './transform-type-node-to-ts-type';
import generate from '@babel/generator';
import prettier from 'prettier';

function print({
  query,
  references,
}: ReturnType<typeof transformTypeNodeToTsType>) {
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

describe('transformGroqToTypeNode', () => {
  it('creates TSTypes from Groq.TypeNodes', () => {
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

    const everythingNode = transformSchemaToTypeNode(schema);
    const result = transformTypeNodeToTsType(everythingNode);

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

    const everythingNode = transformSchemaToTypeNode(schema);
    const result = transformTypeNodeToTsType(everythingNode);

    expect(print(result)).toMatchInlineSnapshot(`
      "type Everything = {
        _type: \\"config\\";
        _id: string;
        node: {
          recursive: {
            node: Ref_1cx2750;
            recursive: Ref_zx6fah;
          };
          node: Ref_1cx2750;
        };
      }[];

      type Ref_1cx2750 = {
        recursive: {
          node: Ref_1cx2750;
          recursive: Ref_zx6fah;
        };
        node: Ref_1cx2750;
      };

      type Ref_zx6fah = {
        node: {
          recursive: Ref_zx6fah;
          node: Ref_1cx2750;
        };
        recursive: Ref_zx6fah;
      };
      "
    `);
  });
});
