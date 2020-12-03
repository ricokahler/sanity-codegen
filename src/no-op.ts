// Used to resolve the sanity part system to a no-op.
// This ES6 proxy intercepts all properties calls and returns itself
const proxy: any = new Proxy(
  function () {
    return proxy;
  },
  {
    get: () => proxy,
  }
);

module.exports = proxy;
