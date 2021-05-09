import generate from '@babel/generator';
import { ResolveConfigOptions, format, resolveConfig } from 'prettier';
import { transformGroqToTypescript } from './transform-groq-to-typescript';
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
  ...pluckOptions
}: GenerateGroqTypesOptions) {
  const extractedQueries = await pluckGroqFromFiles(pluckOptions);

  const codegenResults = extractedQueries
    .map(({ queryKey, query }) => {
      const typescriptNode = transformGroqToTypescript({ query });
      // seems like the types to babel are mismatched
      // @ts-expect-error
      const codegen = generate(typescriptNode).code;

      return {
        queryKey,
        codegen: `type ${queryKey} = ${codegen}`,
      };
    })
    .sort((a, b) => a.queryKey.localeCompare(b.queryKey));

  const finalCodegen = `
    /// <reference types="@sanity-codegen/types" />

    declare namespace Sanity {
      namespace Queries {
        ${codegenResults.map((i) => i.codegen).join('\n')}

        /**
         * A keyed type of all the codegen'ed queries. This type is used for
         * TypeScript meta programming purposes only.
         */
        type QueryMap = {
          ${codegenResults
            .map((i) => `${i.queryKey}: ${i.queryKey};`)
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
