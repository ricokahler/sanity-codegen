import { createStructure } from './create-structure';
import { isStructure } from './is-structure';

describe('isStructure', () => {
  it('traverses the structure to determine whether or not some leaf nodes are arrays', () => {
    const arrayStructure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'Array',
          canBeNull: false,
          canBeOptional: false,
          of: createStructure({
            type: 'String',
            canBeNull: false,
            canBeOptional: false,
            value: null,
          }),
        }),
        createStructure({
          type: 'Array',
          canBeNull: false,
          canBeOptional: false,
          of: createStructure({
            type: 'Number',
            canBeNull: false,
            canBeOptional: false,
            value: null,
          }),
        }),
      ],
    });

    expect(
      isStructure(arrayStructure, (n) => ['Array', 'Tuple'].includes(n.type)),
    ).toBe(true);

    const nonArrayStructure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeOptional: false,
          value: null,
        }),
        createStructure({
          type: 'Number',
          canBeNull: false,
          canBeOptional: false,
          value: null,
        }),
      ],
    });

    expect(
      isStructure(nonArrayStructure, (n) =>
        ['Array', 'Tuple'].includes(n.type),
      ),
    ).toBe(false);
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

    expect(
      isStructure(selfReferencingStructure, (n) => n.type === 'Array'),
    ).toBe(false);
  });
});
