import { objectHash } from './hash';

describe('hash', () => {
  it('returns a number', () => {
    expect(objectHash('test')).toMatchInlineSnapshot(`"VpvpK9Tu7ni8GrPT"`);
    expect(objectHash('test')).toBe(objectHash('test'));

    expect(objectHash(3)).toMatchInlineSnapshot(`"Ax4kajiIxkz4dSG3"`);
    expect(objectHash(3)).toBe(objectHash(3));

    expect(objectHash(null)).toMatchInlineSnapshot(`"hmFHooKI3gPpvedz"`);
    expect(objectHash(null)).toBe(objectHash(null));

    expect(objectHash(undefined)).toMatchInlineSnapshot(`"eLBxHayNe1z8NDLB"`);
    expect(objectHash(undefined)).toBe(objectHash(undefined));

    expect(objectHash({ foo: { bar: 'test' } })).toMatchInlineSnapshot(
      `"dVnJLlbkueuLokQM"`,
    );
    expect(objectHash({ foo: { bar: 'test' } })).toBe(
      objectHash({ foo: { bar: 'test' } }),
    );

    expect(objectHash({ bar: 'bar', baz: 'baz' })).toMatchInlineSnapshot(
      `"A8OcupOUQ7YUOGIq"`,
    );
    expect(objectHash({ bar: 'bar', baz: 'baz' })).toBe(
      objectHash({ baz: 'baz', bar: 'bar' }),
    );
  });
});
