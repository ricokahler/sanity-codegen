import { createStructure } from './create-structure';
import { isStructureArray } from './is-structure-array';
import { unwrapArray } from './unwrap-array';

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
      hashInput: ['Lazy', andStructure.hash],
    });

    const unwrappedStructure = unwrapArray(lazyStructure);

    expect(isStructureArray(unwrappedStructure)).toBe(false);
  });
});
