import { createStructure } from './create-structure';
import { isStructureNull } from './is-structure-null';

describe('isStructureNull', () => {
  it('traverses the structure to determine whether or not some leaf nodes are optional', () => {
    const nullStructure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'String',
              canBeNull: true,
              canBeOptional: false,
              value: null,
            }),
          ],
        }),
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'Number',
              canBeNull: true,
              canBeOptional: false,
              value: null,
            }),
          ],
        }),
      ],
    });

    expect(isStructureNull(nullStructure)).toBe(true);

    const nonNullStructure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: null,
            }),
            createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: null,
            }),
          ],
        }),
        createStructure({
          type: 'Number',
          canBeNull: false,
          canBeOptional: false,
          value: null,
        }),
      ],
    });

    expect(isStructureNull(nonNullStructure)).toBe(false);
  });

  it('returns false if a loop in the structure is found', () => {
    const selfReferencingStructure = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'Lazy',
          get: () =>
            createStructure({
              type: 'Or',
              children: [
                createStructure({
                  type: 'Lazy',
                  get: () => selfReferencingStructure,
                  hashInput: ['testing', '1'],
                }),
              ],
            }),
          hashInput: ['testing', '2'],
        }),
      ],
    });

    expect(isStructureNull(selfReferencingStructure)).toBe(false);
  });

  it('returns false for unknown nodes', () => {
    const unknownStructure = createStructure({ type: 'Unknown' });
    expect(isStructureNull(unknownStructure)).toBe(false);
  });
});
