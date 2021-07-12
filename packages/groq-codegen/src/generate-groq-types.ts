import * as t from '@babel/types';
import generate from '@babel/generator';
import { ResolveConfigOptions, format, resolveConfig } from 'prettier';
import { parse } from 'groq-js';
import { transformGroqToTypeNode } from './transform-groq-to-type-node';
import { transformTypeNodeToTsType } from './transform-type-node-to-ts-type';
import {
  pluckGroqFromFiles,
  PluckGroqFromFilesOptions,
} from './pluck-groq-from-files';

interface GenerateGroqTypesOptions extends PluckGroqFromFilesOptions {
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
   * TODO: update this comment
   */
  schema: Sanity.SchemaDef.Schema;
}

/**
 * Given a selection of filenames, this will pluck matching GROQ queries
 * (@see `pluckGroqFromFiles`) and then run them through a GROQ-to-TypeScript
 * transform.
 *
 * The result of each plucked query is put together into one source string.
 */
export async function generateGroqTypes({
  prettierResolveConfigOptions,
  prettierResolveConfigPath,
  schema,
  ...pluckOptions
}: GenerateGroqTypesOptions) {
  const extractedQueries = await pluckGroqFromFiles(pluckOptions);

  const { queries, references } = extractedQueries
    .map(({ queryKey, query }) => {
      const typeNode = transformGroqToTypeNode({
        node: parse(query),
        scopes: [],
        schema,
      });

      return { queryKey, ...transformTypeNodeToTsType(typeNode) };

      // const { query: queryNode, references } =
    })
    .reduce<{
      queries: { [queryKey: string]: t.TSType };
      references: { [referenceKey: string]: t.TSType };
    }>(
      (acc, { queryKey, query, references }) => {
        acc.queries[queryKey] = query;

        for (const [key, value] of Object.entries(references)) {
          acc[key] = value;
        }

        return acc;
      },
      { queries: {}, references: {} },
    );

  const finalCodegen = `
    /// <reference types="@sanity-codegen/types" />

    declare namespace Sanity {
      namespace Queries {
        ${Object.entries(queries)
          .sort(([queryKeyA], [queryKeyB]) =>
            queryKeyA.localeCompare(queryKeyB, 'en'),
          )
          .map(
            ([queryKey, queryTsType]) =>
              `type ${queryKey} = ${
                generate(
                  // @ts-expect-error there seems to an error with @babel/generator
                  queryTsType,
                ).code
              }`,
          )
          .join('\n')}

          ${Object.entries(references)
            .sort(([referenceKeyA], [referenceKeyB]) =>
              referenceKeyA.localeCompare(referenceKeyB, 'en'),
            )
            .map(
              ([referenceKey, referenceTsType]) =>
                `type ${referenceKey} = ${
                  generate(
                    // @ts-expect-error there seems to an error with @babel/generator
                    referenceTsType,
                  ).code
                }`,
            )
            .join('\n')}

        /**
         * A keyed type of all the codegen'ed queries. This type is used for
         * TypeScript meta programming purposes only.
         */
        type QueryMap = {
          ${Object.keys(queries)
            .map((queryKey) => `${queryKey}: ${queryKey};`)
            .join('\n')}
        };
      }
    }
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
