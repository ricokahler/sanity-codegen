import globby from 'globby';
import { parse, traverse } from '@babel/core';
import { Scope } from '@babel/traverse';
import babelMerge from 'babel-merge';
import * as t from '@babel/types';
import pool from '@ricokahler/pool';
import fs from 'fs';
import path from 'path';
import register, { revert } from '@babel/register';
import { resolveExpression } from './utils';
import { ResolveExpressionError } from './resolve-expression-error';

const defaultPluckBabelOptions = {
  presets: [
    ['@babel/preset-env', { targets: 'maintained node versions' }],
    '@babel/preset-typescript',
  ],
  rootMode: 'upward-optional',
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
};

export interface PluckGroqFromSourceOptions {
  /**
   * The contents of the source file to pluck GROQ queries from.
   */
  source: string;
  /**
   * An incoming filename. This is sent to babel and the pathname is also used
   * to resolve relative files
   */
  filename: string;
  /**
   * The template tag to look for when plucking GROQ queries. Defaults to
   * `groq`.
   */
  groqTagName?: string;
  /**
   * Babel options configuration object that is merged with a provided default
   * configuration.
   */
  babelOptions?: Record<string, unknown>;
  /**
   * A function used to resolve imports across different files. Defaults to
   * `require.resolve` (Note: babel is registered so `require.resolve` requests
   * will go through babel).
   */
  resolvePluckedFile?: (request: string) => string | Promise<string>;
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
export async function pluckGroqFromSource({
  source,
  filename,
  babelOptions: inputBabelOptions,
  resolvePluckedFile = require.resolve,
  groqTagName = 'groq',
}: PluckGroqFromSourceOptions) {
  const babelOptions: Record<string, unknown> = babelMerge(
    defaultPluckBabelOptions,
    inputBabelOptions || {},
  );
  register(babelOptions);

  const babelOptionsWithoutExtensions = { ...babelOptions };
  // causes error "Error: Unknown option: .extensions."
  delete babelOptionsWithoutExtensions.extensions;

  function parseSourceFile(source: string, filename: string): t.File {
    const result = parse(source, {
      ...babelOptionsWithoutExtensions,
      filename,
    });
    if (!result) {
      throw new ResolveExpressionError(`Failed to parse ${filename}`);
    }
    if (t.isProgram(result)) {
      throw new ResolveExpressionError(
        `Got type \`Program\` for ${filename} when type \`File\` was expected. Please open an issue.`,
      );
    }
    return result;
  }

  try {
    const queriesToPluck: Array<{
      queryKey: string;
      queryExpressionToResolve: t.TaggedTemplateExpression;
      queryScope: Scope;
    }> = [];
    const tree = parseSourceFile(source, filename);

    traverse(tree, {
      CallExpression({ node, scope }) {
        const [queryKeyLiteral, groqTemplateExpression] = node.arguments;

        // a bunch of early returns to ensure the current expression matches
        // the shape of: sanity.query('QueryKey', groq`*`)
        if (!t.isStringLiteral(queryKeyLiteral)) return;
        if (!t.isTaggedTemplateExpression(groqTemplateExpression)) return;
        if (!t.isIdentifier(groqTemplateExpression.tag)) return;
        if (groqTemplateExpression.tag.name !== groqTagName) return;
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

        queriesToPluck.push({
          queryKey,
          queryExpressionToResolve: groqTemplateExpression,
          queryScope: scope,
        });
      },
    });

    const pluckedQueries = await pool({
      collection: queriesToPluck,
      maxConcurrency: 5,
      task: async ({ queryKey, queryExpressionToResolve, queryScope }) => ({
        queryKey,
        query: await resolveExpression({
          node: queryExpressionToResolve,
          scope: queryScope,
          filename,
          parseSourceFile,
          resolvePluckedFile,
        }),
      }),
    });

    return pluckedQueries;
  } finally {
    revert();
  }
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
      maxConcurrency: 50,
      task: async (filename) => {
        const resolvedFilename = path.resolve(root, filename);
        const buffer = await fs.promises.readFile(resolvedFilename);
        const source = buffer.toString();

        return pluckGroqFromSource({
          source,
          filename: resolvedFilename,
          babelOptions,
        });
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
