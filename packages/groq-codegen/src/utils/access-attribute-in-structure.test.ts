import { accessAttributeInStructure } from './access-attribute-in-structure';
import { createStructure } from './create-structure';

describe('accessAttributeInStructure', () => {
  it('returns a new structure via the current one at the given attribute name', () => {
    const objectStructure = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
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
    });

    const accessedStructuredAtFoo = accessAttributeInStructure(
      objectStructure,
      'foo',
    );

    expect(accessedStructuredAtFoo).toMatchObject({
      type: 'String',
    });
  });

  it('removes optionals and adds null if the value is optional', () => {
    const objectWithDefinedFoo = createStructure({
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
    expect(
      accessAttributeInStructure(objectWithDefinedFoo, 'foo'),
    ).toMatchObject({
      type: 'String',
      canBeOptional: false,
      canBeNull: false,
    });

    const objectWithOptionalFoo = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: 'foo',
          value: createStructure({
            type: 'String',
            canBeOptional: true,
            canBeNull: false,
            value: null,
          }),
        },
      ],
    });
    expect(
      accessAttributeInStructure(objectWithOptionalFoo, 'foo'),
    ).toMatchObject({
      type: 'String',
      canBeOptional: false,
      canBeNull: true,
    });
  });

  it('accesses attributes inside of `And`s and `Or`s', () => {
    const structure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
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
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'Object',
              canBeNull: false,
              canBeOptional: false,
              properties: [
                {
                  key: 'foo',
                  value: createStructure({
                    type: 'Number',
                    canBeNull: false,
                    canBeOptional: false,
                    value: null,
                  }),
                },
              ],
            }),
            createStructure({
              type: 'Object',
              canBeNull: false,
              canBeOptional: false,
              properties: [
                {
                  key: 'foo',
                  value: createStructure({
                    type: 'Array',
                    canBeNull: false,
                    canBeOptional: false,
                    of: createStructure({
                      type: 'Boolean',
                      canBeNull: false,
                      canBeOptional: false,
                    }),
                  }),
                },
              ],
            }),
          ],
        }),
      ],
    });

    expect(accessAttributeInStructure(structure, 'foo')).toMatchObject({
      type: 'Or',
      children: [
        { type: 'String' },
        {
          type: 'And',
          children: [
            { type: 'Number' },
            { type: 'Array', of: { type: 'Boolean' } },
          ],
        },
      ],
    });
  });

  it('accesses attributes inside of `Array`s (unwrapping and re-wrapping arrays)', () => {
    const arrayStructure = createStructure({
      type: 'Array',
      canBeNull: false,
      canBeOptional: false,
      of: createStructure({
        type: 'Or',
        children: [
          createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
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
      }),
    });

    expect(accessAttributeInStructure(arrayStructure, 'foo')).toMatchObject({
      type: 'Or',
      children: [{ type: 'Array', of: { type: 'String' } }],
    });
  });

  it('returns unknown if an attribute could not be found', () => {
    const objectStructure = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: 'foo',
          value: createStructure({
            type: 'Boolean',
            canBeNull: false,
            canBeOptional: false,
          }),
        },
      ],
    });

    expect(
      accessAttributeInStructure(objectStructure, 'nonExistent'),
    ).toMatchObject({ type: 'Unknown' });
  });

  it('returns unknown if trying to access a leaf node', () => {
    // e.g. when trying to access 'foo' on a string type

    expect(
      accessAttributeInStructure(
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeOptional: false,
          value: null,
        }),
        'foo',
      ),
    ).toMatchObject({
      type: 'Unknown',
    });

    expect(
      accessAttributeInStructure(
        createStructure({
          type: 'Number',
          canBeNull: false,
          canBeOptional: false,
          value: null,
        }),
        'foo',
      ),
    ).toMatchObject({
      type: 'Unknown',
    });

    expect(
      accessAttributeInStructure(
        createStructure({
          type: 'Boolean',
          canBeNull: false,
          canBeOptional: false,
        }),
        'foo',
      ),
    ).toMatchObject({
      type: 'Unknown',
    });
  });

  it('has a Lazy implementation with a consistent hash', () => {
    const selfReferencingStructure = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'Lazy',
          get: () => selfReferencingStructure,
          hashNamespace: 'SelfReferencingStructure',
          hashInput: '',
        }),
      ],
    });

    const result = accessAttributeInStructure(
      selfReferencingStructure,
      'foo',
    ) as Sanity.GroqCodegen.AndNode;
    const lazy1 = result.children[0] as Sanity.GroqCodegen.LazyNode;
    const pull1 = lazy1.get() as Sanity.GroqCodegen.AndNode;
    const lazy2 = pull1.children[0] as Sanity.GroqCodegen.LazyNode;
    const pull2 = lazy2.get() as Sanity.GroqCodegen.AndNode;

    expect(result.hash).toMatchInlineSnapshot(`"Q4Kjyxb2pEQam7jg"`);
    expect(pull1.hash).toBe(result.hash);
    expect(pull1.hash).toBe(pull2.hash);
  });

  it('follows references', () => {
    const referenceStructure = createStructure({
      type: 'Reference',
      canBeNull: false,
      canBeOptional: false,
      to: createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties: [
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
    });

    expect(accessAttributeInStructure(referenceStructure, 'foo')).toMatchObject(
      {
        type: 'String',
      },
    );
  });
});
