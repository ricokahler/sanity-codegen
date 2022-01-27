import { transform } from '@babel/standalone';

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

    const mockCreateSchema = ({types}) => types
    
    const require = name => {
      if (name === 'part:@sanity/base/schema-creator') return mockCreateSchema
      if (name === 'all:part:@sanity/base/schema-type') return []
      throw new Error('Nothing else can be imported in this demo')
    }
    ;${code};
    return exports.default
  })()`);
}
