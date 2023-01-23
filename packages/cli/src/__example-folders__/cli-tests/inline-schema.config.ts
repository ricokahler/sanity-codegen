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
      ],
    }),
  ],
  include: '**/*.{js,ts,tsx}',
};

export default config;
