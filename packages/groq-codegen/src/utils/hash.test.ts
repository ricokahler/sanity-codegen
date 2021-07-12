import { objectHash } from './hash';

describe('hash', () => {
  it('returns a number', () => {
    expect(objectHash('test')).toMatchInlineSnapshot(`"evp9vd"`);
    expect(objectHash('test')).toBe(objectHash('test'));

    expect(objectHash(3)).toMatchInlineSnapshot(`"un7bpm"`);
    expect(objectHash(3)).toBe(objectHash(3));

    expect(objectHash(null)).toMatchInlineSnapshot(`"1r8fttm"`);
    expect(objectHash(null)).toBe(objectHash(null));

    expect(objectHash(undefined)).toMatchInlineSnapshot(`"1pjqkvu"`);
    expect(objectHash(undefined)).toBe(objectHash(undefined));

    expect(objectHash({ foo: { bar: 'test' } })).toMatchInlineSnapshot(
      `"9c7am1"`,
    );
    expect(objectHash({ foo: { bar: 'test' } })).toBe(
      objectHash({ foo: { bar: 'test' } }),
    );

    expect(objectHash({ bar: 'bar', baz: 'baz' })).toMatchInlineSnapshot(
      `"1t32967"`,
    );
    expect(objectHash({ bar: 'bar', baz: 'baz' })).toBe(
      objectHash({ baz: 'baz', bar: 'bar' }),
    );
  });
});
