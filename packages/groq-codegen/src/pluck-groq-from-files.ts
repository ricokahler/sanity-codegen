import globby from 'globby';
import { parse, traverse } from '@babel/core';
import babelMerge from 'babel-merge';
import * as t from '@babel/types';
import pool from '@ricokahler/pool';
import fs from 'fs';
import path from 'path';

const defaultPluckBabelOptions = {
  presets: [
    ['@babel/preset-env', { targets: 'maintained node versions' }],
    '@babel/preset-typescript',
  ],
  rootMode: 'upward-optional',
};

export interface PluckGroqFromSourceOptions {
  /**
   * The contents of the source file to pluck GROQ queries from.
   */
  source: string;
  /**
   * An incoming filename (sent to babel)
   */
  filename?: string;
  /**
   * Babel options configuration object that is merged with a provided default
   * configuration.
   */
  babelOptions?: Record<string, unknown>;
}

/**
 * Given a source file as a string, this function will extract the queries and
 * their corresponding query keys.
 *
 * In order for a GROQ query to be plucked/extracted, the expression must match
 * the form:
 *
 * ```ts
 * anyCallExpression('QueryKey', groq`*[_type == 'foo']`)
 * ```
 *
 * The first argument of the call expression must be a string literal and the
 * second argument must be a tagged template literal expression with the tag
 * begin exactly `groq`. The 3rd argument (i.e. query parameters) does not need
 * to be present.
 *
 * This function also accepts an babel options configuration object that is
 * merged with a provided default configuration.
 */
export function pluckGroqFromSource({
  source,
  filename = 'file.ts',
  babelOptions,
}: PluckGroqFromSourceOptions) {
  const combinedBabelOptions: Record<string, unknown> = babelMerge(
    defaultPluckBabelOptions,
    babelOptions || {},
  );

  // causes error "Error: Unknown option: .extensions."
  delete combinedBabelOptions.extensions;

  const tree = parse(source, { ...combinedBabelOptions, filename });

  const pluckedQueries: Array<{ queryKey: string; query: string }> = [];

  traverse(tree, {
    CallExpression({ node }) {
      const [queryKeyLiteral, groqTemplateExpression] = node.arguments;

      // a bunch of early returns to ensure the current expression matches
      // the shape of: sanity.query('QueryKey', groq`*`)
      if (!t.isStringLiteral(queryKeyLiteral)) return;
      if (!t.isTaggedTemplateExpression(groqTemplateExpression)) return;
      if (!t.isIdentifier(groqTemplateExpression.tag)) return;
      if (groqTemplateExpression.tag.name !== 'groq') return;
      // note: the quasi cannot have any expressions since evaluating an
      // expression requires a runtime
      if (groqTemplateExpression.quasi.expressions.length) return;

      const queryKey = queryKeyLiteral.value;
      if (!/[A-Z][\w$]*/.test(queryKey)) {
        // TODO: think about a formal reporter
        console.warn(
          `Query Keys must be a valid TypeScript identifiers and must ` +
            `also start with a capital letter. Check query key ` +
            `\`${queryKey}\`.`,
        );
        return;
      }

      const query = groqTemplateExpression.quasi.quasis[0].value.cooked;
      if (!query) return;

      pluckedQueries.push({ queryKey, query });
    },
  });

  return pluckedQueries;
}

export interface PluckGroqFromFilesOptions {
  /**
   * Specify a glob (powered by
   * [`globby`](https://github.com/sindresorhus/globby)), a list of globs, or a
   * function that returns a list of paths to specify the source files you want
   * to generate types from.
   * 
   * If `groqCodegenInclude` is provided as a function then `groqCodegenExclude`
   * will not be used.
   */
  groqCodegenInclude: string | string[] | (() => Promise<string[]>);
  /**
   * Specify a glob (powered by
   * [`globby`](https://github.com/sindresorhus/globby)) or a list of globs to
   * specify which source files you want to exclude from type generation.
   */
  groqCodegenExclude?: string | string[];
  /**
   * Specify the root used to resolve relative filenames.
   * By default this is `process.env.cwd()`
   */
  root?: string;
  babelOptions?: Record<string, unknown>;
}

/**
 * Goes through each specified file and statically plucks groq queries and their
 * corresponding query keys. @see `pluckGroqFromSource` for more info.
 */
export async function pluckGroqFromFiles({
  groqCodegenInclude,
  groqCodegenExclude,
  root = process.cwd(),
  babelOptions,
}: PluckGroqFromFilesOptions) {
  const inclusions =
    typeof groqCodegenInclude === 'function'
      ? []
      : Array.isArray(groqCodegenInclude)
      ? groqCodegenInclude
      : [groqCodegenInclude];

  const exclusions = Array.isArray(groqCodegenExclude)
    ? groqCodegenExclude
    : [groqCodegenExclude];

  const filenames = Array.from(
    new Set(
      typeof groqCodegenInclude === 'function'
        ? await groqCodegenInclude()
        : await globby(
            [...inclusions, ...exclusions.map((pattern) => `!${pattern}`)],
            { cwd: root },
          ),
    ),
  );

  const extractedQueries = (
    await pool({
      collection: filenames,
      maxConcurrency: 25,
      task: async (filename) => {
        const buffer = await fs.promises.readFile(path.resolve(root, filename));
        const source = buffer.toString();

        return pluckGroqFromSource({ source, filename, babelOptions });
      },
    })
  ).flat();

  const queryKeys = new Set<string>();

  for (const { queryKey } of extractedQueries) {
    if (queryKeys.has(queryKey)) {
      throw new Error(
        `Saw query key \`${queryKey}\` more than once. Each query key must ` +
          `be unique`,
      );
    }

    queryKeys.add(queryKey);
  }

  return extractedQueries;
}
