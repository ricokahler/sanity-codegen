import { getNextFilename } from './get-next-filename';

describe('getNextFilename', () => {
  it('resolves relative targets', async () => {
    const result = await getNextFilename({
      currentFilename: '/path/one/two/three.js',
      targetFilename: '../target',
      resolvePluckedFile: (s) => s,
    });

    expect(result).toBe('/path/one/target');
  });

  it('returns non-relative targets', async () => {
    const result = await getNextFilename({
      currentFilename: '/path/one/two/three.js',
      targetFilename: '@/target',
      resolvePluckedFile: (s) => s,
    });

    expect(result).toBe('@/target');
  });
});
