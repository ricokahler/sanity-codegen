import { transform } from '@babel/standalone';
import {
  schemaNormalizer,
  // defaultStructures,
} from '@sanity-codegen/core/standalone';

export function getNormalizedSchema(
  schemaString: string,
): Sanity.SchemaDef.Schema {
  const schema = schemaNormalizer(extractSchemaString(schemaString));

  return {
    ...schema,
    registeredTypes: [
      ...schema.registeredTypes,
      // ...(defaultStructures as unknown as Sanity.SchemaDef.RegisteredSchemaNode[]),
    ],
  };
}

export function extractSchemaString(schemaString: string) {
  const { code } = transform(schemaString, {
    filename: 'schema.tsx',
    presets: [
      ['env', { targets: 'defaults and not IE 11' }],
      ['react', { runtime: 'automatic' }],
      'typescript',
    ],
  });

  if (!code) throw new Error('Could not transform JS');

  // eslint-disable-next-line no-eval
  return eval(`(() => {
    let exports = {}

    ;${code};
    
    return exports.default
  })()`);
}
