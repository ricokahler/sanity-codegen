import { createStructure } from './create-structure';

describe('createStructureNode', () => {
  it('takes in a partial structure node without a hash and adds the hash', () => {
    const node = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    expect(node.hash).toMatchInlineSnapshot(`"1i1vqj4"`);
  });

  it('utilizes child hashes for faster, incremental hashing', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });
    const mockStringHashGet = jest.fn(() => 'string hash');
    Object.defineProperty(stringStructure, 'hash', { get: mockStringHashGet });

    const nestedArray = createStructure({
      type: 'Array',
      of: stringStructure,
      canBeNull: false,
      canBeOptional: false,
    });
    const mockArrayHashGet = jest.fn(() => 'array hash');
    Object.defineProperty(nestedArray, 'hash', { get: mockArrayHashGet });

    const nestedReference = createStructure({
      type: 'Reference',
      to: nestedArray,
      canBeNull: false,
      canBeOptional: false,
    });
    const mockReferenceHashGet = jest.fn(() => 'reference hash');
    Object.defineProperty(nestedReference, 'hash', {
      get: mockReferenceHashGet,
    });

    const node = createStructure({
      type: 'And',
      children: [nestedReference],
    });

    expect(node.hash).toMatchInlineSnapshot(`"y0npk2"`);
    expect(mockStringHashGet).toHaveBeenCalledTimes(1);
    expect(mockArrayHashGet).toHaveBeenCalledTimes(1);
    expect(mockReferenceHashGet).toHaveBeenCalledTimes(1);
  });
});
