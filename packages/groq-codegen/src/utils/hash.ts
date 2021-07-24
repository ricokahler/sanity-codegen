import hash from 'object-hash';

function replacer(n: unknown) {
  // don't consider the contents of the function
  if (typeof n === 'function') {
    // this i just a random string that won't collide with anything
    return 'aaad5ec23bd8c7b1268fb02791c9a19ae1a43abb';
  }

  return n;
}

/**
 * a very simple object hash function powered by `object-hash`
 */
export function objectHash(n: unknown) {
  return hash(
    { sanityCodegen: n },
    { algorithm: 'md5', replacer, encoding: 'base64' },
  )
    .replace(/\W/g, '')
    .substring(0, 16)
    .padStart(16, '0');
}

/**
 * takes any number of items and returns a hash where the top-level order is not
 * considered
 */
export function unorderedHash(items: unknown[]) {
  return objectHash({
    sanityCodegenUnordered: items
      .map(objectHash)
      .sort((a, b) => a.localeCompare(b, 'en')),
  });
}
