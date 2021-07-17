import { createStructure } from './create-structure';
import { isStructureOptional } from './is-structure-optional';

describe('isStructureOptional', () => {
  it('traverses the structure to determine whether or not every leaf node is optional', () => {
    const optionalStructure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: true,
              value: null,
            }),
          ],
        }),
        createStructure({
          type: 'And',
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

    expect(isStructureOptional(optionalStructure)).toBe(true);

    const nonOptionalStructure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: true,
              value: null,
            }),
            // this one is false so the whole thing should be false
            createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: null,
            }),
          ]
        }),
        createStructure({
          type: 'Number',
          canBeNull: false,
          canBeOptional: true,
          value: null,
        }),
      ],
    });

    expect(isStructureOptional(nonOptionalStructure)).toBe(false);
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

    expect(isStructureOptional(selfReferencingStructure)).toBe(false);
  });
});
