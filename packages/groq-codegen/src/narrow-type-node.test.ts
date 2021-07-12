import prettier from 'prettier';
import generate from '@babel/generator';
import { parse } from 'groq-js';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { getEverything } from './transform-schema-to-type-node';
import { transformTypeNodeToTsType } from './transform-type-node-to-ts-type';
import { narrowTypeNode } from './narrow-type-node';

function print(filter: string, schemaTypes: any[]) {
  const schema = schemaNormalizer(schemaTypes);
  const narrowed = narrowTypeNode(getEverything(schema), parse(filter));
  const result = transformTypeNodeToTsType(narrowed);

  return prettier.format(
    `${`type Query = ${
      // @ts-expect-error `generate` is incorrectly typed
      generate(result.query).code
    }`}\n\n${Object.entries(result.references)
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

describe('narrow', () => {
  it('narrows the input types based on a filter', () => {
    const result = print(`_type == 'book'`, [
      {
        type: 'document',
        name: 'book',
        fields: [{ name: 'title', type: 'string' }],
      },
      {
        type: 'document',
        name: 'author',
        fields: [{ name: 'name', type: 'string' }],
      },
    ]);

    expect(result).toMatchInlineSnapshot(`
      "type Query = {
        _type: \\"book\\";
        _id: string;
        title: string;
      }[];
      "
    `);
  });
});
