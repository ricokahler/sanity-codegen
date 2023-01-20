// this is an example config used for testing
import { schemaNormalizer } from '@sanity-codegen/core';
import { SanityCodegenConfig } from '../../types';

const config: SanityCodegenConfig = {
  normalizedSchema: schemaNormalizer([
    {
      name: 'book',
      type: 'document',
      fields: [
        { name: 'title', type: 'string' },
        { name: 'author', type: 'string' },
      ],
    },
  ]),
  groqCodegenInclude: '**/*.{js,ts,tsx}',
};

export default config;
