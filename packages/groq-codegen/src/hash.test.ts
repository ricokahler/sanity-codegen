import { hash } from './hash';

describe('hash', () => {
  it('returns a number', () => {
    expect(hash('test')).toMatchInlineSnapshot(`"evp9vd"`);
    expect(hash('test')).toBe(hash('test'));

    expect(hash(3)).toMatchInlineSnapshot(`"un7bpm"`);
    expect(hash(3)).toBe(hash(3));

    expect(hash(null)).toMatchInlineSnapshot(`"1r8fttm"`);
    expect(hash(null)).toBe(hash(null));

    expect(hash(undefined)).toMatchInlineSnapshot(`"1pjqkvu"`);
    expect(hash(undefined)).toBe(hash(undefined));

    expect(hash({ foo: { bar: 'test' } })).toMatchInlineSnapshot(`"9c7am1"`);
    expect(hash({ foo: { bar: 'test' } })).toBe(hash({ foo: { bar: 'test' } }));

    expect(hash({ bar: 'bar', baz: 'baz' })).toMatchInlineSnapshot(`"1t32967"`);
    expect(hash({ bar: 'bar', baz: 'baz' })).toBe(
      hash({ baz: 'baz', bar: 'bar' }),
    );
  });
});
