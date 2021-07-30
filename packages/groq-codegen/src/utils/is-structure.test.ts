import { createStructure } from './create-structure';
import {
  isStructureArray,
  isStructureNull,
  isStructureOptional,
  isStructureBoolean,
  isStructureNumber,
  isStructureString,
} from './is-structure';

describe('isStructureArray', () => {
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

    expect(isStructureArray(arrayStructure)).toBe(true);

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

  it('returns false for unknown nodes', () => {
    const unknownStructure = createStructure({ type: 'Unknown' });
    expect(isStructureNull(unknownStructure)).toBe(false);
  });

  it('has mode every', () => {
    expect(
      isStructureArray(
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'Array',
              canBeNull: false,
              canBeOptional: false,
              of: createStructure({ type: 'Unknown' }),
            }),
            createStructure({
              type: 'Array',
              canBeNull: true,
              canBeOptional: false,
              of: createStructure({ type: 'Unknown' }),
            }),
          ],
        }),
      ),
    ).toBe(true);

    expect(
      isStructureArray(
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'Array',
              canBeNull: false,
              canBeOptional: false,
              of: createStructure({ type: 'Unknown' }),
            }),
            createStructure({
              type: 'Boolean',
              canBeNull: false,
              canBeOptional: false,
            }),
          ],
        }),
      ),
    ).toBe(false);
  });
});

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

  it('has mode some', () => {
    expect(
      isStructureNull(
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'Boolean',
              canBeNull: false,
              canBeOptional: false,
            }),
            createStructure({
              type: 'Boolean',
              canBeNull: true,
              canBeOptional: false,
            }),
          ],
        }),
      ),
    ).toBe(true);

    expect(
      isStructureNull(
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'Boolean',
              canBeNull: false,
              canBeOptional: false,
            }),
            createStructure({
              type: 'Boolean',
              canBeNull: false,
              canBeOptional: false,
            }),
          ],
        }),
      ),
    ).toBe(false);
  });
});

describe('isStructureOptional', () => {
  it('traverses the structure to determine whether or not some leaf nodes are optional', () => {
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

    expect(isStructureOptional(nonOptionalStructure)).toBe(false);
  });

  it('has mode some', () => {
    expect(
      isStructureOptional(
        createStructure({
          type: 'And',
          children: [
            createStructure({ type: 'Unknown' }),
            createStructure({
              type: 'Boolean',
              canBeNull: false,
              canBeOptional: true,
            }),
          ],
        }),
      ),
    ).toBe(true);

    expect(
      isStructureOptional(
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'Boolean',
              canBeNull: false,
              canBeOptional: false,
            }),
            createStructure({
              type: 'Boolean',
              canBeNull: false,
              canBeOptional: false,
            }),
          ],
        }),
      ),
    ).toBe(false);
  });
});

describe('isStructureBoolean', () => {
  it('returns true if every leaf node is a boolean', () => {
    const booleanStructure = createStructure({
      type: 'Boolean',
      canBeNull: false,
      canBeOptional: false,
    });

    expect(isStructureBoolean(booleanStructure)).toBe(true);
  });

  it('has mode every', () => {
    expect(
      isStructureBoolean(
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'Boolean',
              canBeNull: false,
              canBeOptional: false,
            }),
            createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: null,
            }),
          ],
        }),
      ),
    ).toBe(false);

    expect(
      isStructureBoolean(
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'Boolean',
              canBeNull: false,
              canBeOptional: false,
            }),
            createStructure({
              type: 'Boolean',
              canBeNull: false,
              canBeOptional: false,
            }),
          ],
        }),
      ),
    ).toBe(true);
  });
});

describe('isStructureNumber', () => {
  it('returns true if every leaf node is a number', () => {
    const numberStructure = createStructure({
      type: 'Number',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    expect(isStructureNumber(numberStructure)).toBe(true);
  });

  it('has mode every', () => {
    expect(
      isStructureNumber(
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
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: null,
            }),
          ],
        }),
      ),
    ).toBe(false);

    expect(
      isStructureNumber(
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
              type: 'Number',
              canBeNull: false,
              canBeOptional: false,
              value: null,
            }),
          ],
        }),
      ),
    ).toBe(true);
  });
});

describe('isStructureString', () => {
  it('returns true if every leaf node is a string', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    expect(isStructureString(stringStructure)).toBe(true);
  });

  it('has mode every', () => {
    expect(
      isStructureString(
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
              type: 'Number',
              canBeNull: false,
              canBeOptional: false,
              value: null,
            }),
          ],
        }),
      ),
    ).toBe(false);

    expect(
      isStructureString(
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
      ),
    ).toBe(true);
  });
});
