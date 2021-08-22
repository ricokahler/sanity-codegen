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
2. The first argument of that function call must be a string literal. This string literal is called the **query key**. Query keys are used to uniquely identify a query and must start with a capital letter.
3. The second argument must be a tagged template literal with the tag being exactly `groq`.
4. The template literal may _not_ contain any expressions. If you need to use parameters, use [GROQ parameters](https://www.sanity.io/docs/groq-parameters) (e.g. `$parameter`).

If any source file contains a groq query in the form described above, Sanity Codegen will attempt to parse it and generate TypeScript types for it.

---

The most simple way to use this package is via `generateGroqTypes`.

Note: you may also need to extract the schema using the [`@sanity-codegen/schema-codegen`](../schema-codegen) package.

```ts
import fs from 'fs';
import { generateGroqTypes } from '@sanity-codegen/groq-codegen';
import { schemaExtractor } from '@sanity-codegen/schema-codegen';

async function main() {
  // first get the normalized schema via the schema-extractor.
  // see the schema-codegen package for more usage info
  const schema = await schemaExtractor({
    schemaPath: './studio/schemas/schema.js',
  });

  // `generateGroqTypes` starts with a blob of filenames.
  //
  // 1. every file matched is parsed for GROQ queries
  // 2. every query found is ran through a GROQ-to-TS transform
  // 3. the resulting types are printed as strings and joined together in one
  //    big typescript source file
  const codegenResult = await generateGroqTypes({
    groqCodegenInclude: ['./src/**/*.{js,ts,tsx}'],
    groqCodegenExclude: ['**/*.test.{js,ts,tsx}', '**/node_modules'],
    schema,
  });

  // write the result to an ambient types (*.d.ts) file
  await fs.promises.writeFile('./query-types.d.ts', codegenResult);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

The result of the above code will look something like this:

`query-types.d.ts`

```ts
/// <reference types="@sanity-codegen/types" />

declare namespace Sanity {
  namespace Queries {
    type BookAuthor = {
      name?: string;
    } | null;
    type BookTitles = (string | null)[];

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

Notice how there are no type annotations to be seen 😎. See the [client docs](../client) for more details.

> 👋 **NOTE:** However, if you need to reference any query types, you can do so via the `Sanity.Queries` namespace, e.g. `Sanity.Queries.BookAuthors`.

- See [here](../packages/schema-codegen) for more details on the schema code generator.
- See [here](../packages/client) for more details on the client.

## Reference

This package contains also more granular functions to better fit your use case. See the functions below.

### `pluckGroqFromFiles()`

```ts
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
export declare function pluckGroqFromFiles(
  options: PluckGroqFromFilesOptions,
): Promise<
  {
    queryKey: string;
    query: string;
  }[]
>;
```

### `pluckGroqFromSource()`

````ts
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
 * matching the one provided (default is `groq`). The 3rd argument
 * (i.e. query parameters) does not need to be present.
 *
 * For the second argument (the query), there is some limited support for
 * template literals with expressions in them.
 *
 * See [here][0] for more info.
 *
 * This function also accepts an babel options configuration object that is
 * merged with a provided default configuration.
 *
 * [0]: https://github.com/ricokahler/sanity-codegen/tree/alpha/packages/groq-codegen#expressionsupport
 */
export declare function pluckGroqFromSource(
  options: PluckGroqFromSourceOptions,
): {
  queryKey: string;
  query: string;
}[];
````

#### Expression support

It's not currently possible for the query plucker to execute any code that makes up your query. This is due to the different environment your code runs in vs what sanity-codegen runs in. Sanity-codegen runs in node.js and your code most likely runs in the browser. We try not to make assumptions on environments so instead of executing the code that makes up your query, we statically pluck and combine the different expressions into one string from many different files.

This means, in order to pluck a query from your source code, it must be made of entirely static expressions.

For example, the following is allowed:

```js
// ✅ all of these expressions are static
const type = 'book';

const projection = `
  {
    'name': title,
    'description': summary,
  }
`;

const myQuery = groq`
  *[_type == '${type}' && _id == $id] ${projection}
`;

export function getEntity(id) {
  return sanity.query('QueryKey', myQuery, { id });
}
```

Notice how there are no dynamic expressions where javascript needs to be executed in order to pluck the query.

If you do need to use dynamic variables, use [GROQ parameters](https://www.sanity.io/docs/groq-parameters) and feed those in as the 3rd argument of `sanity.query`.

<!-- TODO: add bad example that won't work -->

### `generateGroqTypes()`

```ts
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
   * An extracted and normalized schema result from the
   * `@sanity-codegen/schema-codegen` package.
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
export declare function generateGroqTypes(
  options: GenerateGroqTypesOptions,
): Promise<string>;
```

### `Sanity.GroqCodegen.StructureNode`

The following `StructureNode` is used in the rest of the APIs.

```ts
declare namespace Sanity {
  namespace GroqCodegen {
    /**
     * An intermediate representation of a set of types. This structure is
     * first derived from a sanity schema. That structure is then altered to
     * match the types inside of a GROQ AST.
     *
     * @see `transformSchemaToStructure`
     * @see `transformGroqToStructure`
     */
    type StructureNode =
      | LazyNode
      | AndNode
      | OrNode
      | ArrayNode
      | ObjectNode
      | StringNode
      | NumberNode
      | BooleanNode
      | IntrinsicNode
      | ReferenceNode
      | UnknownNode;

    type LazyNode = {
      type: 'Lazy';
      get: () => StructureNode;
      // Note: it's important that `Lazy`'s hash a function of the the lazy
      // value to be pulled, otherwise, there may be weird behavior due
      // collisions. See `transformSchemaToStructure`.
      hash: string;
    };

    type AndNode = {
      type: 'And';
      children: StructureNode[];
      hash: string;
    };

    type OrNode = {
      type: 'Or';
      children: StructureNode[];
      hash: string;
    };

    type ArrayNode = {
      type: 'Array';
      canBeNull: boolean;
      canBeOptional: boolean;
      of: StructureNode;
      hash: string;
    };

    type ObjectNode = {
      type: 'Object';
      properties: Array<{ key: string; value: StructureNode }>;
      canBeNull: boolean;
      canBeOptional: boolean;
      hash: string;
    };

    type StringNode = {
      type: 'String';
      canBeNull: boolean;
      canBeOptional: boolean;
      value: string | null;
      hash: string;
    };

    type NumberNode = {
      type: 'Number';
      canBeNull: boolean;
      canBeOptional: boolean;
      value: number | null;
      hash: string;
    };

    type BooleanNode = {
      type: 'Boolean';
      canBeNull: boolean;
      canBeOptional: boolean;
      hash: string;
    };

    type IntrinsicType = 'Asset' | 'Crop' | 'Hotspot' | 'Geopoint';

    type IntrinsicNode = {
      type: 'Intrinsic';
      intrinsicType: IntrinsicType;
      canBeNull: boolean;
      canBeOptional: boolean;
      hash: string;
    };

    type ReferenceNode = {
      type: 'Reference';
      to: StructureNode;
      canBeNull: boolean;
      canBeOptional: boolean;
      hash: string;
    };

    type UnknownNode = { type: 'Unknown'; hash: 'unknown' };
  }
}
```

### `transformSchemaToStructure()`

```ts
export interface TransformSchemaToStructureOptions {
  /**
   * An extracted and normalized schema result from the
   * `@sanity-codegen/schema-codegen` package.
   */
  normalizedSchema: Sanity.SchemaDef.Schema;
}

/**
 * Takes in a schema (see the `@sanity-codegen/schema-codegen` package) and
 * returns a `StructureNode`
 */
export declare function transformSchemaToStructure(
  options: TransformSchemaToStructureOptions,
): Sanity.GroqCodegen.StructureNode;
```

### `transformGroqToStructure()`

```ts
export interface TransformGroqToStructureOptions {
  /**
   * A GROQ AST node from `groq-js`'s `parse` method
   */
  node: Groq.ExprNode;
  /**
   * An extracted and normalized schema result from the
   * `@sanity-codegen/schema-codegen` package.
   */
  normalizedSchema: Sanity.SchemaDef.Schema;
  /**
   * An array of scopes. These scopes stack as the GROQ AST is traversed and new
   * contexts are created. This should be an empty array to start with.
   */
  scopes: Sanity.GroqCodegen.StructureNode[];
}

/**
 * Used to transform a GROQ AST (e.g. `ExprNode`) into a `StructureNode`
 */
export declare function transformGroqToStructure(
  options: TransformGroqToStructureOptions,
): Sanity.GroqCodegen.StructureNode;
```

### `transformStructureToTs()`

```ts
export interface TransformStructureToTsOptions {
  /**
   * The input `StructureNode` to be converted to a `TSType`
   */
  structure: Sanity.GroqCodegen.StructureNode;
}

/**
 * Takes in a `StructureNode` and returns an object with the resulting main
 * the type, `query`, as well as any named references created (necessary when
 * the schema has self-reference). Those references are stored in an object
 * keyed by that node's hash.
 *
 * The resulting `TSType`s can be printed to source code via `@babel/generator`.
 *
 * @see `generateGroqTypes` for a reference implementation
 */
export declare function transformStructureToTs(
  options: TransformStructureToTsOptions,
): { query: TSType; references: Record<string, TSType> };
```
