import glob from 'glob';
import { parse, traverse } from '@babel/core';
import * as t from '@babel/types';
import pool from '@ricokahler/pool';
import fs from 'fs';
import path from 'path';

export interface PluckGroqFromFilesOptions {
  /**
   * Specify a glob, powered by [`glob`](https://github.com/isaacs/node-glob),
   * or a function that returns a list of paths.
   */
  filenames: string | (() => Promise<string[]>);
  /**
   * Specify the current working direction used to resolve relative filenames.
   * By default this is `process.env.cwd()`
   */
  cwd?: string;
  /**
   * Specify the max amount of files you want the pluck function to attempt to
   * read concurrently. Defaults to 50.
   */
  maxConcurrency?: number;
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
 * Note: in contrast to the schema codegen extractor, the babel set up for this
 * extractor is relatively standard. It also utilizes the
 * [`rootMode`](https://babeljs.io/docs/en/options#rootmode)
 * `'upward-optional'` to allow for top-level configuration to pass down.
 */
export function pluckGroqFromSource(
  source: string,
  filename: string = 'file.ts',
) {
  const tree = parse(source, {
    filename,
    presets: [
      ['@babel/preset-env', { targets: 'maintained node versions' }],
      '@babel/preset-typescript',
    ],
    rootMode: 'upward-optional',
  });

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

/**
 * Goes through each specified file and statically plucks groq queries and their
 * corresponding query keys. @see `pluckGroqFromSource` for more info.
 */
export async function pluckGroqFromFiles({
  filenames: inputFilenames,
  cwd = process.cwd(),
  // TODO: does this option need to exist?
  maxConcurrency = 50,
}: PluckGroqFromFilesOptions) {
  const filenames =
    typeof inputFilenames === 'function'
      ? await inputFilenames()
      : await new Promise<string[]>((resolve, reject) =>
          glob(inputFilenames, { cwd }, (err, matches) => {
            if (err) reject(err);
            else resolve(matches);
          }),
        );

  const extractedQueries = (
    await pool({
      collection: filenames,
      maxConcurrency,
      task: async (filename) => {
        const buffer = await fs.promises.readFile(path.resolve(cwd, filename));
        const source = buffer.toString();

        return pluckGroqFromSource(source, filename);
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
