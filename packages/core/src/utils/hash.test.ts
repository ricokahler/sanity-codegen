describe('hash', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns a number', () => {
    const { objectHash } = require('./hash');

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

  it('caches the result if the instance is the same', () => {
    jest.doMock('object-hash', () => jest.fn());

    const { objectHash } = require('./hash');

    const hash = require('object-hash');

    hash.mockImplementation(() => '1337');

    const obj = { my: 'object' };

    objectHash(obj);
    objectHash(obj);
    const result = objectHash(obj);

    expect(result).toBe('0000000000001337');
    expect(hash).toHaveBeenCalledTimes(1);
  });
});
