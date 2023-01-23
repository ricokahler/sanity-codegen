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

const logLevels: Sanity.Codegen.LogLevel[] = [
  'success',
  'error',
  'warn',
  'info',
  'verbose',
  'debug',
];

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
   * An array of extracted and normalized schema results from the
   * `normalizeSchema` function
   */
  normalizedSchemas: Sanity.SchemaDef.Schema[];
  /**
   * Ignores workspace schemas and excludes them from codegen. Useful if you have a
   * workspace that mirrors another one in schema (e.g. for staging env)
   */
  ignoreSchemas?: string[];
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
  normalizedSchemas,
  ignoreSchemas = [],
  ...pluckOptions
}: GenerateTypesOptions) {
  const { logger = simpleLogger } = pluckOptions;

  const declarations: Record<string, t.TSModuleDeclaration> = {};
  const substitutions: Record<string, t.TSType> = {};

  const filteredSchemas = normalizedSchemas.filter(
    (schema) => !ignoreSchemas.includes(schema.name),
  );

  for (let i = 0; i < filteredSchemas.length; i++) {
    const normalizedSchema = filteredSchemas[i];
    const wrappedLogger = logLevels.reduce<Sanity.Codegen.Logger>(
      (acc, next) => {
        const prefix = `[${normalizedSchema.name}]${
          normalizedSchemas.length > 1
            ? ` (${i + 1}/${normalizedSchemas.length})`
            : ''
        }`;
        acc[next] = (message) => logger[next](`${prefix} ${message}`);

        return acc;
      },
      { ...logger },
    );

    wrappedLogger.verbose(
      `Generating types for workspace \`${normalizedSchema.name}\``,
    );

    const schemaTypes = generateSchemaTypes({ normalizedSchema });
    const schemaCount = Object.keys(schemaTypes.declarations).length;

    wrappedLogger[schemaCount ? 'success' : 'warn'](
      `Converted ${schemaCount} schema definition${
        schemaCount === 1 ? '' : 's'
      } to TypeScript`,
    );

    for (const [key, value] of Object.entries(schemaTypes.declarations)) {
      declarations[key] = value;
    }
    for (const [key, value] of Object.entries(schemaTypes.substitutions)) {
      substitutions[key] = value;
    }

    wrappedLogger.verbose(`Plucking queries from files…`);
    const extractedQueries = await pluckGroqFromFiles({
      ...pluckOptions,
      logger: wrappedLogger,
    });

    wrappedLogger.verbose(`Converting queries to typescript…`);
    const queryTypes = generateQueryTypes({
      normalizedSchema,
      substitutions: schemaTypes.substitutions,
      extractedQueries,
    });
    const queryCount = Object.keys(queryTypes.declarations).length;

    wrappedLogger[queryCount ? 'success' : 'success'](
      `Converted ${queryCount} ${
        queryCount === 1 ? 'query' : 'queries'
      } to TypeScript`,
    );

    for (const [key, value] of Object.entries(queryTypes.declarations)) {
      declarations[key] = value;
    }
    for (const [key, value] of Object.entries(queryTypes.substitutions)) {
      substitutions[key] = value;
    }
  }

  const finalCodegen = `
    /// <reference types="@sanity-codegen/types" />

    ${Object.values(declarations)
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
