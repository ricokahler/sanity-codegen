import { addNull } from './add-null';
import { createStructure } from './create-structure';

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

    expect(result.hash).toMatchInlineSnapshot(`"fIAY7odezgzxvkhR"`);
    expect(pull1.hash).toBe(result.hash);
    expect(pull1.hash).toBe(pull2.hash);
  });
});
