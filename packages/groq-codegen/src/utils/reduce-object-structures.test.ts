import generate from '@babel/generator';
import { createStructure } from './create-structure';
import { reduceObjectStructures } from './reduce-object-structures';
import { transformStructureToTs } from '../transform-structure-to-ts';
import prettier from 'prettier';

// see here
// https://github.com/facebook/react/issues/11098#issuecomment-370614347
beforeEach(() => {
  jest.spyOn(console, 'warn');
  (global.console.warn as jest.Mock).mockImplementation(() => {});
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
    );

    expect(combinedStructure).toMatchObject({
      type: 'Object',
      properties: [
        { key: 'foo', value: { type: 'String' } },
        { key: 'bar', value: { type: 'Number' } },
      ],
    });
  });

  it('the second parameter overrides any properties on the first parameter', () => {
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
    ) as Sanity.GroqCodegen.ObjectNode;

    expect(combinedStructure.properties).toHaveLength(1);
    const [property] = combinedStructure.properties;

    expect(property.value.type).toBe('Number');
  });

  it('combines structures that includes `And`s and `Or`s', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    const numberStructure = createStructure({
      type: 'Number',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    const createObj = (
      properties: Sanity.GroqCodegen.ObjectNode['properties'],
    ) =>
      createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties,
      });

    const a = { key: 'a', value: stringStructure };
    const b = { key: 'b', value: numberStructure };
    const c = { key: 'c', value: stringStructure };
    const d = { key: 'd', value: numberStructure };
    const e = { key: 'e', value: stringStructure };
    const f = { key: 'f', value: numberStructure };

    const abefAndCdef = reduceObjectStructures(
      createStructure({
        type: 'And',
        children: [createObj([a, b]), createObj([c, d])],
      }),
      createObj([e, f]),
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
                { key: 'a', value: { type: 'String' } },
                { key: 'b', value: { type: 'Number' } },
              ],
            },
            {
              type: 'Object',
              properties: [
                { key: 'e', value: { type: 'String' } },
                { key: 'c', value: { type: 'String' } },
                { key: 'd', value: { type: 'Number' } },
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
                { key: 'a', value: { type: 'String' } },
                { key: 'b', value: { type: 'Number' } },
              ],
            },
            {
              type: 'Object',
              properties: [
                { key: 'f', value: { type: 'Number' } },
                { key: 'c', value: { type: 'String' } },
                { key: 'd', value: { type: 'Number' } },
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
      reduceObjectStructures(stringStructure, objectStructure),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Found unsupported source node type \\"String\\" in reduceObjectStructures call. Please open an issue."`,
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
      reduceObjectStructures(objectStructure, stringStructure),
    ).toMatchObject({ type: 'Unknown' });

    expect((console.warn as jest.Mock).mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Attempted to use ObjectSplat for unsupported type \\"String\\"",
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
      hashInput: ['LazyA', objectStructureA.hash],
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
      hashInput: ['LazyB', objectStructureB.hash],
    });

    const combinedStructure = reduceObjectStructures(
      lazyStructureA,
      lazyStructureB,
    );

    // using `transformStructureToTs` because it evaluates lazy nodes
    const tsResult = transformStructureToTs({ structure: combinedStructure });

    const result = `
      type Query = ${generate(tsResult.query).code};

      ${Object.entries(tsResult.references)
        .map(
          ([key, referenceType]) => `
        type ${key} = ${generate(referenceType).code}
      `,
        )
        .join('\n')}
    `;

    expect(prettier.format(result, { parser: 'typescript' }))
      .toMatchInlineSnapshot(`
      "type Query = Ref_eY40ckHgc1aBLiUT;

      type Ref_eY40ckHgc1aBLiUT = Ref_KnGUCqqw6xTWoHJJ;

      type Ref_KnGUCqqw6xTWoHJJ = {
        foo: string;
        bar: number;
      };
      "
    `);
  });
});
