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
  declarations: ({ t, normalizedSchemas, getWorkspaceName }) =>
    normalizedSchemas.flatMap((normalizedSchema) => [
      /* ts */ `
      namespace Sanity.${getWorkspaceName(normalizedSchema)}.Schema {
        type CustomTypeFromString = {
          foo: string;
        };
      }
    `,
      t.tsModuleDeclaration(
        t.identifier('Sanity'),
        t.tsModuleDeclaration(
          t.identifier(getWorkspaceName(normalizedSchema)),
          t.tsModuleDeclaration(
            t.identifier('Schema'),
            t.tsModuleBlock([
              t.tsTypeAliasDeclaration(
                t.identifier('CustomTypeFromTSModuleDeclaration'),
                undefined,
                t.tsTypeLiteral([
                  t.tsPropertySignature(
                    t.identifier('foo'),
                    t.tsTypeAnnotation(t.tsStringKeyword()),
                  ),
                ]),
              ),
            ]),
          ),
        ),
      ),
    ]),
};

export default config;
