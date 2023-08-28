// this is an example config used for testing
import { schemaNormalizer } from '@sanity-codegen/core';
import { SanityCodegenConfig } from '../../types';

const config: SanityCodegenConfig = {
  normalizedSchemas: [
    schemaNormalizer({
      name: 'default',
      types: [
        {
          name: 'book',
          type: 'document',
          fields: [
            { name: 'title', type: 'string' },
            { name: 'author', type: 'string' },
          ],
        },
        {
          name: 'foo',
          type: 'document',
          fields: [{ name: 'myStr', type: 'string' }],
        },
      ],
    }),
  ],
  include: '**/*.{js,ts,tsx}',
  generateWorkspaceName: (name) => `Overriden${name}`,
  generateTypeName: (name) => (name === 'Foo' ? 'Bar' : name),
};

export default config;
