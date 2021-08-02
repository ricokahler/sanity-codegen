import { createStructure } from './create-structure';

describe('simplify', () => {
  it('de-dupes And and Or structures', () => {
    const andStructure = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeOptional: false,
          value: 'one',
        }),
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeOptional: false,
          value: 'one',
        }),
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeOptional: false,
          value: 'two',
        }),
      ],
    });

    expect(andStructure).toMatchObject({
      type: 'And',
      children: [
        { type: 'String', value: 'one' },
        { type: 'String', value: 'two' },
      ],
    });
  });

  it('flattens And and Or structures', () => {
    const andStructure = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeOptional: false,
          value: 'foo',
        }),
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'And',
              children: [
                createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'bar',
                }),
              ],
            }),
          ],
        }),
      ],
    });

    expect(andStructure).toMatchObject({
      type: 'And',
      children: [
        { type: 'String', value: 'foo' },
        { type: 'String', value: 'bar' },
      ],
    });
  });

  it('unwraps And and Or structures', () => {
    const andStructure = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeOptional: false,
          value: 'foo',
        }),
        createStructure({
          type: 'And',
          children: [
            createStructure({
              type: 'And',
              children: [
                createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'foo',
                }),
              ],
            }),
          ],
        }),
      ],
    });

    expect(andStructure).toMatchObject({ type: 'String', value: 'foo' });
  });
});

describe('createStructure', () => {
  it('takes in a partial structure node without a hash and adds the hash', () => {
    const node = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    expect(node.hash).toMatchInlineSnapshot(`"GJYMHcax4HJoxhTb"`);
  });

  it('utilizes child hashes for faster, incremental hashing', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: 'a36cf4f3a1bf836f',
    });
    const mockStringValueGet = jest.fn(() => 'string hash');
    Object.defineProperty(stringStructure, 'hash', { get: mockStringValueGet });

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

    const node = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'Or',
          children: [
            nestedReference,
            createStructure({
              type: 'Number',
              canBeNull: false,
              canBeOptional: false,
              value: null,
            }),
          ],
        }),
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeOptional: false,
          value: null,
        }),
      ],
    });

    expect(node.hash).toMatchInlineSnapshot(`"bou2qePtdtadkhFe"`);
    expect(mockStringValueGet).toHaveBeenCalledTimes(1);
    expect(mockArrayHashGet).toHaveBeenCalledTimes(1);
  });
});
