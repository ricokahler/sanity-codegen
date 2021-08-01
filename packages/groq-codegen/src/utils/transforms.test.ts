import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { createStructure } from './create-structure';
import {
  addNull,
  unwrapReferences,
  unwrapArray,
  removeOptional,
  addOptional,
  addOptionalToProperties,
} from './transforms';
import { isStructureArray } from './is-structure';
import { transformSchemaToStructure } from '../transform-schema-to-structure';
import { wrapArray } from './wrap-array';

// see here
// https://github.com/facebook/react/issues/11098#issuecomment-370614347
beforeEach(() => {
  jest.spyOn(console, 'warn');
  (global.console.warn as jest.Mock).mockImplementation(() => {});
});

afterEach(() => {
  (global.console.warn as jest.Mock).mockRestore();
});

describe('addNull', () => {
  it('takes in a structure and adds canBeNull: true to all the leaf nodes', () => {
    const structureWithoutNulls = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeOptional: false,
          value: null,
        }),
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'Number',
              canBeNull: false,
              canBeOptional: false,
              value: null,
            }),
            createStructure({
              type: 'Boolean',
              canBeNull: false,
              canBeOptional: false,
            }),
          ],
        }),
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
            // Note that this won't be touched since object is already a leaf
            // node
            {
              key: 'foo',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: null,
              }),
            },
          ],
        }),
      ],
    });

    expect(addNull(structureWithoutNulls)).toMatchObject({
      type: 'Or',
      children: [
        { type: 'String', canBeNull: true },
        {
          type: 'And',
          children: [
            { type: 'Number', canBeNull: true },
            { type: 'Boolean', canBeNull: true },
          ],
        },
        {
          type: 'Object',
          canBeNull: true,
          properties: [
            { key: 'foo', value: { type: 'String', canBeNull: false } },
          ],
        },
      ],
    });
  });

  it('simply returns unknown nodes', () => {
    const unknownNode = createStructure({ type: 'Unknown' });

    expect(addNull(unknownNode)).toBe(unknownNode);
  });

  it('has a Lazy implementation with a consistent hash', () => {
    const selfReferencingStructure = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'Lazy',
          get: () => selfReferencingStructure,
          hashInput: ['self', 'referencing', 'structure'],
        }),
      ],
    });

    const result = addNull(
      selfReferencingStructure,
    ) as Sanity.GroqCodegen.AndNode;
    const lazy1 = result.children[0] as Sanity.GroqCodegen.LazyNode;
    const pull1 = lazy1.get() as Sanity.GroqCodegen.AndNode;
    const lazy2 = pull1.children[0] as Sanity.GroqCodegen.LazyNode;
    const pull2 = lazy2.get() as Sanity.GroqCodegen.AndNode;

    expect(result.hash).toMatchInlineSnapshot(`"MZPEB8522Kw90BYI"`);
    expect(pull1.hash).toBe(result.hash);
    expect(pull1.hash).toBe(pull2.hash);
  });
});

describe('unwrapReferences', () => {
  it('takes in a reference structure and returns a structure where that reference points to', () => {
    const normalizedSchema = schemaNormalizer([
      {
        name: 'book',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'author', type: 'reference', to: [{ type: 'author' }] },
        ],
      },
      {
        name: 'author',
        type: 'document',
        fields: [{ name: 'name', type: 'string' }],
      },
    ]);

    const everything = transformSchemaToStructure({
      normalizedSchema,
    }) as Sanity.GroqCodegen.ArrayNode;

    const bookNode = (everything.of as Sanity.GroqCodegen.OrNode).children.find(
      (child): child is Sanity.GroqCodegen.ObjectNode =>
        child.type === 'Object' &&
        child.properties.some(
          (prop) =>
            prop.key === '_type' &&
            prop.value.type === 'String' &&
            prop.value.value === 'book',
        ),
    )!;

    const referenceNode = bookNode.properties.find(
      (prop) => prop.key === 'author',
    )?.value as Sanity.GroqCodegen.ReferenceNode;

    const unwrappedReference = unwrapReferences(referenceNode);
    expect(unwrappedReference).toMatchObject({
      type: 'Or',
      children: [
        {
          type: 'Object',
          properties: [
            { key: '_type', value: { value: 'author' } },
            { key: '_id', value: { type: 'String' } },
            { key: 'name', value: { type: 'String' } },
          ],
        },
      ],
    });
  });

  it('takes in a reference structure nested in groups and returns it unwrapped', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    const andStructure = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'Lazy',
          get: () => stringStructure,
          hashInput: ['Lazy', stringStructure.hash],
        }),
      ],
    });

    const referenceStructure = createStructure({
      type: 'Reference',
      canBeNull: false,
      canBeOptional: false,
      to: andStructure,
    });

    const orStructure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'And',
          children: [referenceStructure],
        }),
      ],
    });

    const lazyStructure = createStructure({
      type: 'Lazy',
      get: () => orStructure,
      hashInput: ['Testing', orStructure.hash],
    });

    const unwrapped = unwrapReferences(
      lazyStructure,
    ) as Sanity.GroqCodegen.LazyNode;
    expect(unwrapped.get()).toMatchObject({
      type: 'Or',
      children: [
        {
          type: 'And',
          children: [{ type: 'And', children: [{ type: 'String' }] }],
        },
      ],
    });
  });

  it('returns the original node if a reference structure is not found', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    const unwrapped = unwrapReferences(stringStructure);
    expect(unwrapped).toMatchObject({ type: 'String' });
  });
});

describe('unwrapArray', () => {
  it('takes in an array structure and returns it unwrapped', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });
    const arrayStructure = createStructure({
      type: 'Array',
      of: stringStructure,
      canBeNull: false,
      canBeOptional: false,
    });

    const unwrappedStructure = unwrapArray(arrayStructure);

    expect(unwrappedStructure).toEqual(stringStructure);
  });

  it('takes in an array structure nested in groups and returns it unwrapped', () => {
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
    const orStructure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'Array',
          canBeNull: false,
          canBeOptional: false,
          of: stringStructure,
        }),
        createStructure({
          type: 'Array',
          canBeNull: false,
          canBeOptional: false,
          of: numberStructure,
        }),
      ],
    });

    const unwrappedStructure = unwrapArray(orStructure);
    expect(unwrappedStructure).toMatchObject({
      type: 'Or',
      children: [stringStructure, numberStructure],
    });
  });

  it('returns the original node if the structure is not an array structure', () => {
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
    const orStructure = createStructure({
      type: 'Or',
      children: [
        // `isStructureArray` only returns true if every child is an array
        createStructure({
          type: 'Array',
          canBeNull: false,
          canBeOptional: false,
          of: stringStructure,
        }),
        numberStructure,
      ],
    });

    expect(isStructureArray(orStructure)).toBe(false);

    const result = unwrapArray(orStructure);
    expect(result).toEqual(orStructure);
  });

  it('converts tuples to arrays and then unwraps them', () => {
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

    const tupleStructure = createStructure({
      type: 'Tuple',
      canBeNull: false,
      canBeOptional: false,
      elements: [stringStructure, numberStructure],
    });

    const unwrappedStructure = unwrapArray(tupleStructure);
    expect(unwrappedStructure).toMatchObject({
      type: 'Or',
      children: [stringStructure, numberStructure],
    });
  });

  it('works with lazy structures', () => {
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
    const andStructure = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'Array',
          canBeNull: false,
          canBeOptional: false,
          of: stringStructure,
        }),
        createStructure({
          type: 'Array',
          canBeNull: false,
          canBeOptional: false,
          of: numberStructure,
        }),
      ],
    });
    const lazyStructure = createStructure({
      type: 'Lazy',
      get: () => andStructure,
      hashInput: ['TransformLazyB', andStructure.hash],
    });

    const unwrappedStructure = unwrapArray(lazyStructure);

    expect(isStructureArray(unwrappedStructure)).toBe(false);
  });
});

describe('wrapArray', () => {
  it('takes in a structure and returns it as an array', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    const arrayStructure = wrapArray(stringStructure, {
      canBeNull: true,
      canBeOptional: true,
    });

    expect(arrayStructure).toMatchObject({
      type: 'Array',
      of: stringStructure,
      canBeNull: true,
      canBeOptional: true,
    });
  });

  it('takes in a structure nested in groups and returns it as an array', () => {
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
    const orStructure = createStructure({
      type: 'Or',
      children: [stringStructure, numberStructure],
    });

    const arrayStructure = wrapArray(orStructure, {
      canBeNull: false,
      canBeOptional: false,
    });

    expect(isStructureArray(arrayStructure)).toBe(true);
    expect(arrayStructure).toMatchObject({
      type: 'Or',
      children: [
        { type: 'Array', of: stringStructure },
        { type: 'Array', of: numberStructure },
      ],
    });
  });

  it('works with lazy structures', () => {
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
    const andStructure = createStructure({
      type: 'And',
      children: [stringStructure, numberStructure],
    });
    const lazyNode = createStructure({
      type: 'Lazy',
      get: () => andStructure,
      hashInput: ['TransformLazyA', stringStructure.hash],
    });

    const arrayStructure = wrapArray(lazyNode, {
      canBeNull: false,
      canBeOptional: false,
    });
    expect(isStructureArray(arrayStructure)).toBe(true);
  });
});

describe('removeOptional', () => {
  it('traverses the given structure and marks all leaf nodes with `canBeOptional: false`', () => {
    const structure = createStructure({
      type: 'And',
      children: [
        createStructure({ type: 'Unknown' }),
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeOptional: true,
          value: null,
        }),
        createStructure({
          type: 'Or',
          children: [
            createStructure({
              type: 'Number',
              canBeNull: false,
              canBeOptional: true,
              value: null,
            }),
          ],
        }),
      ],
    });

    expect(removeOptional(structure)).toMatchObject({
      type: 'And',
      children: [
        { type: 'Unknown' },
        { type: 'String', canBeOptional: false },
        {
          type: 'Or',
          children: [{ type: 'Number', canBeOptional: false }],
        },
      ],
    });
  });
});

describe('addOptional', () => {
  it('adds optional to leaf nodes', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    expect(addOptional(stringStructure)).toMatchObject({
      type: 'String',
      canBeOptional: true,
    });
  });
});

describe('addOptionalToProperties', () => {
  it('adds optional to the properties of leaf nodes', () => {
    const andStructure = createStructure({
      type: 'Object',
      properties: [
        {
          key: 'a',
          value: createStructure({
            type: 'String',
            canBeOptional: false,
            canBeNull: false,
            value: null,
          }),
        },
        {
          key: 'b',
          value: createStructure({
            type: 'Number',
            canBeOptional: false,
            canBeNull: false,
            value: null,
          }),
        },
      ],
      canBeNull: false,
      canBeOptional: false,
    });

    expect(addOptionalToProperties(andStructure)).toMatchObject({
      type: 'Object',
      properties: [
        { key: 'a', value: { type: 'String', canBeOptional: true } },
        { key: 'b', value: { type: 'Number', canBeOptional: true } },
      ],
    });
  });
});
