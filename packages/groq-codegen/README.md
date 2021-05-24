# @sanity-codegen/groq-codegen

The following is a sub-package of [`sanity-codegen`](https://github.com/ricokahler/sanity-codegen).

This package includes APIs to programmatically generate types from [GROQ](https://github.com/sanity-io/GROQ).

> 👋 **NOTE:** You don't have to use this package directly. It's only meant for users who want to use `sanity-codegen` programmatically. The [CLI](../cli) is the preferred way to use Sanity Codegen and its setup and usage is much more streamlined.

## Installation

```
# NOTE: the alpha is required at this time
npm install --save-dev @sanity-codegen/groq-codegen@alpha
```

or

```
# NOTE: the alpha is required at this time
yarn add --dev @sanity-codegen/groq-codegen@alpha
```

## Usage

This package will parse TypeScript (or JavaScript) files for usages of [`@sanity-codegen/client`](../client) and will return the resulting TypeScript in a single source file as a string.

In order for a GROQ query to plucked and parsed by this package, the query expression in code must match the following shape:

```ts
query('QueryKey', groq`*[_type == 'foo']`);
```

In particular:

1. The query must be contained inside of a function call (any identifier can be used).
2. The first argument of that function call must be a string literal. This string literal is called the **query key**. Query keys are used to uniquely identify a query.
3. The second argument must be a tagged template literal with the tag being exactly `groq`.

If any source file contains a groq query in the form described above, Sanity Codegen will attempt to parse it and generate TypeScript types for it.

---

The most simple way to use this package is via `generateGroqTypes`:

```ts
import fs from 'fs';
import { generateGroqTypes } from '@sanity-codegen/groq-codegen';

async function main() {
  // `generateGroqTypes` starts with a blob of filenames.
  //
  // 1. every file matched is parsed for GROQ queries
  // 2. every query found is ran through a GROQ-to-TS transform
  // 3. the resulting types are printed as strings and joined together in one
  //    big typescript source file
  const codegenResult = await generateGroqTypes({
    filenames: './src/**/*.{js,ts,tsx}',
  });

  // write the result to an ambient types (*.d.ts) file
  await fs.promises.writeFile('./queries.d.ts', codegenResult);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

The result of the above code will look something like this:

`queries.d.ts`

```ts
/// <reference types="@sanity-codegen/types" />

declare namespace Sanity {
  namespace Queries {
    type BookAuthor = Sanity.SafeIndexedAccess<
      Extract<Sanity.Schema.Document[][number], { _type: 'book' }>[][number],
      'author'
    >;

    type BookTitles = Sanity.SafeIndexedAccess<
      Extract<Sanity.Schema.Document[][number], { _type: 'book' }>[][number],
      'title'
    >[];

    /**
     * A keyed type of all the codegen'ed queries. This type is used for
     * TypeScript meta programming purposes only.
     */
    type QueryMap = {
      BookAuthor: BookAuthor;
      BookTitles: BookTitles;
    };
  }
}
```

For each query found (in this case, just 2), a type will be created inside the namespace `Sanity.Queries` using the query key as the type name.

Each query type is also included in the `QueryMap` type. This type is utilized in the `@sanity-codegen/client` to match the query key provided in the client function call to the resulting generated type.

This orchestration between client and parser/plucker makes it so that query function calls will automatically reference the GROQ codegen result without needing to specify any types manually.

For example, if everything is set up correctly, the following call will be typed after the GROQ codegen runs.

```ts
import { sanity, groq } from './some-configured-client';

export async function someFunction() {
  const bookAuthors = await sanity.query(
    'BookAuthors',
    groq`*[_type == 'book'].author`,
  );

  return bookAuthors;
}
```

Notice how there are no type annotations to be seen 😎. See the [client docs](../packages/client) for more details.

> 👋 **NOTE:** However, if you need to reference any query types, you can do so via the `Sanity.Queries` namespace, e.g. `Sanity.Queries.BookAuthors`.

- See [here](../packages/schema-codegen) for more details on the schema code generator.
- See [here](../packages/client) for more details on the client.

> 👋 **NOTE:** The GROQ codegen is only a 1-to-1 translation of your GROQ query to a TypeScript type. During the codegen, it will _not_ error if your query queries for an invalid property.
>
> By design, GROQ codegen defers error checking to TypeScript and its primary job is to transform GROQ to TypeScript.

## Reference

This package contains also more granular functions to better fit your use case. See the functions below.

### `pluckGroqFromFiles()`

```ts
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
 * Goes through each specified file and statically plucks groq queries and their
 * corresponding query keys. @see `pluckGroqFromSource` for more info.
 */
export declare function pluckGroqFromFiles(
  options: PluckGroqFromFilesOptions,
): Promise<{ queryKey: string; query: string }[]>;
```

### `pluckGroqFromSource()`

````ts
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
export declare function pluckGroqFromSource(
  source: string,
  filename?: string,
): { queryKey: string; query: string }[];
````

### `transformGroqToTypescript()`

```ts
export interface TransformGroqToTypescriptOptions {
  /**
   * The groq query to generate a TypeScript type for
   */
  query: string;
}
/**
 * Given a GROQ query, returns a babel TSType node
 */
export declare function transformGroqToTypescript(
  options: TransformGroqToTypescriptOptions,
): t.TSType;
```

### `generateGroqTypes()`

```ts
import { ResolveConfigOptions } from 'prettier';
import { PluckGroqFromFilesOptions } from '@sanity-codegen/groq-codegen';

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
export declare function generateGroqTypes(
  options: GenerateGroqTypesOptions,
): Promise<string>;
```

### `transformGroqAstToTsAst()`

```ts
interface TransformGroqAstToTsAstParams {
  /**
   * A type that represents everything i.e. all documents. This is typically
   * `Sanity.Schema.Document[]`
   */
  everything: t.TSType;
  /**
   * The type that represents the current scope (as defined by the
   * [GROQ spec](https://sanity-io.github.io/GROQ/draft/#sec-Scope)).
   * This is used to derive types that refer to the current scope where
   * applicable,
   */
  scope: t.TSType;
  /**
   * Similar to the `scope` but refers to the scope one layer above the current
   * scope. This is used to derive types that refer to that parent scope.
   */
  parentScope: t.TSType;
  /**
   * The input GROQ syntax AST node you wish to convert to a `TSType`
   */
  node: Groq.SyntaxNode;
}

/**
 * A lower-level API (when compared to `transformGroqToTypescript`) that takes
 * in a GROQ AST (and some extra context) and returns a TS type AST node.
 */
export declare function transformGroqAstToTsAst({
  scope,
  parentScope,
  node,
  everything,
}: TransformGroqAstToTsAstParams): t.TSType;
```
