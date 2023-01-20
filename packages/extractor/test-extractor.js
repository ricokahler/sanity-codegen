const assert = require('assert');
const { schemaExtractor } = require('./dist');

// TODO: finish this test
async function main() {
  const schema = await schemaExtractor({
    sanityConfigPath: './mock-config.js',
  });

  assert(schema.type === 'SchemaRoot');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
