import * as t from '@babel/types';
import generate from '@babel/generator';
import { ResolveConfigOptions, format, resolveConfig } from 'prettier';

import {
  pluckGroqFromFiles,
  PluckGroqFromFilesOptions,
} from './pluck-groq-from-files';
import { simpleLogger } from './utils';
import { generateQueryTypes } from './generate-query-types';
import { generateSchemaTypes } from './generate-schema-types';

export interface GenerateTypesOptions extends PluckGroqFromFilesOptions {
  /**
   * This option is fed directly to prettier `resolveConfig`
   *
   * https://prettier.io/docs/en/api.html#prettierresolveconfigfilepath--options
   */
  prettierResolveConfigPath?: string;
  /**
   * This options is also fed directly to prettier `resolveConfig`
   *
   * https://prettier.io/docs/en/api.html#prettierresolveconfigfilepath--options
   */
  prettierResolveConfigOptions?: ResolveConfigOptions;
  /**
   * An extracted and normalized schema result from the
   * `@sanity-codegen/extractor` package.
   */
  normalizedSchema: Sanity.SchemaDef.Schema;
}

/**
 * Given a selection of filenames, this will pluck matching GROQ queries
 * (@see `pluckGroqFromFiles`) and then run them through a GROQ-to-TypeScript
 * transform.
 *
 * The result of each plucked query is put together into one source string.
 */
export async function generateTypes({
  prettierResolveConfigOptions,
  prettierResolveConfigPath,
  normalizedSchema,
  ...pluckOptions
}: GenerateTypesOptions) {
  const { logger = simpleLogger } = pluckOptions;

  logger.verbose('Generating types from your schema…');
  const schemaTypes = generateSchemaTypes({ normalizedSchema });
  const schemaCount = Object.keys(schemaTypes.declarations).length;

  logger[schemaCount ? 'success' : 'warn'](
    `Converted ${schemaCount} schema definition${
      schemaCount === 1 ? '' : 's'
    } to TypeScript`,
  );

  logger.verbose('Converting queries to typescript…');
  const queryTypes = generateQueryTypes({
    normalizedSchema,
    substitutions: schemaTypes.substitutions,
    extractedQueries: await pluckGroqFromFiles(pluckOptions),
  });
  const queryCount = Object.keys(queryTypes.declarations).length;

  logger[queryCount ? 'success' : 'success'](
    `Converted ${queryCount} ${
      queryCount === 1 ? 'query' : 'queries'
    } to TypeScript`,
  );

  const finalCodegen = `
    /// <reference types="@sanity-codegen/types" />

    ${Object.values(schemaTypes.declarations)
      .map((declaration) => generate(declaration).code)
      .sort((a, b) => a.localeCompare(b, 'en'))
      .join('\n')}

    ${Object.values(queryTypes.declarations)
      .map((declaration) => generate(declaration).code)
      .sort((a, b) => a.localeCompare(b, 'en'))
      .join('\n')}
  `;

  const resolvedConfig = prettierResolveConfigPath
    ? await resolveConfig(
        prettierResolveConfigPath,
        prettierResolveConfigOptions,
      )
    : null;

  return format(finalCodegen, {
    ...resolvedConfig,
    parser: 'typescript',
  });
}
