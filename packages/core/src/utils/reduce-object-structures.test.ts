import generate from '@babel/generator';
import { createStructure } from './create-structure';
import { reduceObjectStructures } from './reduce-object-structures';
import { transformStructureToTs } from '../transform-structure-to-ts';
import prettier from 'prettier';

// see here
// https://github.com/facebook/react/issues/11098#issuecomment-370614347
beforeEach(() => {
  jest.spyOn(console, 'warn');
  (global.console.warn as jest.Mock).mockImplementation(() => {
    // intentionally blank
  });
});

afterEach(() => {
  (global.console.warn as jest.Mock).mockRestore();
});

describe('reduceObjectStructures', () => {
  it('combines the properties of two object structures', () => {
    const objectStructureA = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: 'foo',
          value: createStructure({
            type: 'String',
            canBeOptional: false,
            canBeNull: false,
            value: null,
          }),
        },
      ],
    });

    const objectStructureB = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: 'bar',
          value: createStructure({
            type: 'Number',
            canBeOptional: false,
            canBeNull: false,
            value: null,
          }),
        },
      ],
    });

    const combinedStructure = reduceObjectStructures(
      objectStructureA,
      objectStructureB,
      'replace',
    );

    expect(combinedStructure).toMatchObject({
      type: 'Object',
      properties: [
        { key: 'foo', value: { type: 'String' } },
        { key: 'bar', value: { type: 'Number' } },
      ],
    });
  });

  it('the second parameter replaces any properties on the first parameter if the mode is replace', () => {
    const objectStructureA = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: 'foo',
          value: createStructure({
            type: 'String',
            canBeOptional: false,
            canBeNull: false,
            value: null,
          }),
        },
      ],
    });

    const objectStructureB = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: 'foo',
          value: createStructure({
            type: 'Number',
            canBeOptional: false,
            canBeNull: false,
            value: null,
          }),
        },
      ],
    });

    const combinedStructure = reduceObjectStructures(
      objectStructureA,
      objectStructureB,
      'replace',
    ) as Sanity.GroqCodegen.ObjectNode;

    expect(combinedStructure.properties).toHaveLength(1);
    const [property] = combinedStructure.properties;

    expect(property.value.type).toBe('Number');
  });

  it('the second parameter combines any properties on the first parameter if the mode is union', () => {
    const objectStructureA = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: 'foo',
          value: createStructure({
            type: 'String',
            canBeOptional: false,
            canBeNull: false,
            value: null,
          }),
        },
      ],
    });

    const objectStructureB = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: 'foo',
          value: createStructure({
            type: 'Number',
            canBeOptional: false,
            canBeNull: false,
            value: null,
          }),
        },
      ],
    });

    const combinedStructure = reduceObjectStructures(
      objectStructureA,
      objectStructureB,
      'union',
    ) as Sanity.GroqCodegen.ObjectNode;

    expect(combinedStructure.properties).toHaveLength(1);
    const [property] = combinedStructure.properties;

    expect(property.value).toMatchObject({
      type: 'Or',
      children: [{ type: 'String' }, { type: 'Number' }],
    });
  });

  it('combines structures that includes `And`s and `Or`s', () => {
    const str = {
      type: 'String' as const,
      canBeNull: false,
      canBeOptional: false,
    };

    const num = {
      type: 'Number' as const,
      canBeNull: false,
      canBeOptional: false,
    };

    const createObj = (
      properties: Sanity.GroqCodegen.ObjectNode['properties'],
    ) =>
      createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties,
      });

    // if no value is provided then they will all have the same hash and will
    // be de-duplicated
    const a = { key: 'a', value: createStructure({ ...str, value: 'a' }) };
    const b = { key: 'b', value: createStructure({ ...num, value: 0xb }) };
    const c = { key: 'c', value: createStructure({ ...str, value: 'c' }) };
    const d = { key: 'd', value: createStructure({ ...num, value: 0xc }) };
    const e = { key: 'e', value: createStructure({ ...str, value: 'e' }) };
    const f = { key: 'f', value: createStructure({ ...num, value: 0xf }) };

    const abefAndCdef = reduceObjectStructures(
      createStructure({
        type: 'And',
        children: [createObj([a, b]), createObj([c, d])],
      }),
      createObj([e, f]),
      'replace',
    );
    expect(abefAndCdef).toMatchObject({
      type: 'And',
      children: [
        { type: 'Object', properties: [a, b, e, f] },
        { type: 'Object', properties: [c, d, e, f] },
      ],
    });

    const combo = reduceObjectStructures(
      createStructure({
        type: 'Or',
        children: [createObj([e]), createObj([f])],
      }),
      createStructure({
        type: 'And',
        children: [createObj([a, b]), createObj([c, d])],
      }),
      'replace',
    );

    expect(combo).toMatchObject({
      type: 'Or',
      children: [
        {
          type: 'And',
          children: [
            {
              type: 'Object',
              properties: [
                { key: 'e', value: { type: 'String' } },
                { key: 'c', value: { type: 'String' } },
                { key: 'd', value: { type: 'Number' } },
              ],
            },
            {
              type: 'Object',
              properties: [
                { key: 'e', value: { type: 'String' } },
                { key: 'a', value: { type: 'String' } },
                { key: 'b', value: { type: 'Number' } },
              ],
            },
          ],
        },
        {
          type: 'And',
          children: [
            {
              type: 'Object',
              properties: [
                { key: 'f', value: { type: 'Number' } },
                { key: 'c', value: { type: 'String' } },
                { key: 'd', value: { type: 'Number' } },
              ],
            },
            {
              type: 'Object',
              properties: [
                { key: 'f', value: { type: 'Number' } },
                { key: 'a', value: { type: 'String' } },
                { key: 'b', value: { type: 'Number' } },
              ],
            },
          ],
        },
      ],
    });
  });

  it('throws if a non-object structure is provided as the source', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    const objectStructure = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [{ key: 'foo', value: stringStructure }],
    });

    expect(() =>
      reduceObjectStructures(stringStructure, objectStructure, 'replace'),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Found unsupported source node type "String" in reduceObjectStructures call. Please open an issue."`,
    );
  });

  it('returns Unknown if a non-object structure is found', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    const objectStructure = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [{ key: 'foo', value: stringStructure }],
    });

    expect(
      reduceObjectStructures(objectStructure, stringStructure, 'replace'),
    ).toMatchObject({ type: 'Unknown' });

    expect((console.warn as jest.Mock).mock.calls).toMatchInlineSnapshot(`
      [
        [
          "Attempted to use ObjectSplat for unsupported type "String"",
        ],
      ]
    `);
  });

  it('works lazy nodes', () => {
    const objectStructureA = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: 'foo',
          value: createStructure({
            type: 'String',
            canBeOptional: false,
            canBeNull: false,
            value: null,
          }),
        },
      ],
    });

    const lazyStructureA = createStructure({
      type: 'Lazy',
      get: () => objectStructureA,
      hashNamespace: 'ReduceObjectStructuresTest',
      hashInput: objectStructureA.hash,
    });

    const objectStructureB = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: 'bar',
          value: createStructure({
            type: 'Number',
            canBeOptional: false,
            canBeNull: false,
            value: null,
          }),
        },
      ],
    });

    const lazyStructureB = createStructure({
      type: 'Lazy',
      get: () => objectStructureB,
      hashNamespace: 'ReduceObjectStructuresTest',
      hashInput: objectStructureB.hash,
    });

    const combinedStructure = reduceObjectStructures(
      lazyStructureA,
      lazyStructureB,
      'replace',
    );

    // using `transformStructureToTs` because it evaluates lazy nodes
    const tsResult = transformStructureToTs({
      structure: combinedStructure,
      substitutions: {},
    });

    const result = `
      type Query = ${generate(tsResult.tsType).code};

      ${Object.values(tsResult.declarations)
        .map((declaration) => generate(declaration).code)
        .join('\n')}
    `;

    expect(prettier.format(result, { parser: 'typescript' }))
      .toMatchInlineSnapshot(`
      "type Query = Sanity.Ref.Ref_E3PCrAmCZKcFJzGW;

      namespace Sanity.Ref {
        type Ref_E3PCrAmCZKcFJzGW = Sanity.Ref.Ref_ZvbaUPszlbsBoyFW;
      }
      namespace Sanity.Ref {
        type Ref_ZvbaUPszlbsBoyFW = {
          bar: number;
          foo: string;
        };
      }
      "
    `);
  });
});
