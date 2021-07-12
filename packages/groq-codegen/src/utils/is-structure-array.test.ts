import { createStructure } from './create-structure';
import { isStructureArray } from './is-structure-array';

describe('isStructureArray', () => {
  it('traverses the structure to determine whether or not some leaf nodes are arrays', () => {
    const arrayStructure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'Array',
          canBeNull: false,
          canBeUndefined: false,
          of: createStructure({
            type: 'String',
            canBeNull: false,
            canBeUndefined: false,
            value: null,
          }),
        }),
        createStructure({
          type: 'Array',
          canBeNull: false,
          canBeUndefined: false,
          of: createStructure({
            type: 'Number',
            canBeNull: false,
            canBeUndefined: false,
            value: null,
          }),
        }),
      ],
    });

    expect(isStructureArray(arrayStructure)).toBe(true);

    const nonArrayStructure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeUndefined: false,
          value: null,
        }),
        createStructure({
          type: 'Number',
          canBeNull: false,
          canBeUndefined: false,
          value: null,
        }),
      ],
    });

    expect(isStructureArray(nonArrayStructure)).toBe(false);
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

    expect(isStructureArray(selfReferencingStructure)).toBe(false);
  });
});
