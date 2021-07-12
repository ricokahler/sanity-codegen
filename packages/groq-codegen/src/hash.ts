// https://github.com/darkskyapp/string-hash/blob/cb38ab492aba198b9658b286bb2391278bb6992b/index.js
function stringHash(str: string) {
  let hash = 5381;
  let i = str.length;

  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  return (hash >>> 0).toString(36);
}

/**
 * a very simple object hash function.
 * designed for low churn but not meant to be perfect
 */
export function hash(obj: unknown) {
  if (typeof obj !== 'object') return stringHash(`__${typeof obj}_${obj}`);
  if (obj === null) return stringHash(`__null_${obj}`);

  if (Array.isArray(obj)) return hash(obj.map(hash).join('_'));

  return hash(
    Object.entries(obj)
      .map(([k, v]) => [k, hash(v)])
      .sort(([a], [b]) => a.toString().localeCompare(b.toString(), 'en')),
  );
}
