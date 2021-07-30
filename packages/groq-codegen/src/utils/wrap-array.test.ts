import { createStructure } from './create-structure';
import { isStructureArray } from './is-structure';
import { wrapArray } from './wrap-array';

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
      hashInput: ['Lazy', stringStructure.hash],
    });

    const arrayStructure = wrapArray(lazyNode, {
      canBeNull: false,
      canBeOptional: false,
    });
    expect(isStructureArray(arrayStructure)).toBe(true);
  });
});
