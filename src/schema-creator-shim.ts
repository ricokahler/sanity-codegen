// The purpose of this file is to shim out the `createSchema` call from
// `import createSchema from 'part:@sanity/base/schema-creator';`
// so that it simple re-exports the uncompiled type
function createSchemaShim({ types }: any) {
  return types;
}

export default createSchemaShim;
