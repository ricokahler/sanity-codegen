# @sanity-codegen/extractor

The following is a sub-package of [`sanity-codegen`](https://github.com/ricokahler/sanity-codegen).

This package includes APIs to programmatically, execute, validate, normalize, and generate types from [sanity.io](https://sanity.io) schemas.

> 👋 **NOTE:** You don't have to use this package directly. It's only meant for users who want to use `sanity-extractor` programmatically. The [CLI](../cli) is the preferred way to use Sanity Codegen.

## Installation

```
npm install --save-dev @sanity-codegen/extractor
```

or

```
yarn add --dev @sanity-codegen/extractor
```

## Usage

### Execute, validate, and normalize

The Sanity schemas are written for use inside of [Sanity Studio](https://www.sanity.io/docs/sanity-studio). Sanity Studio is the primary client that writes data to Sanity's backend so all knowledge of the schema lives there.

This poses a challenge because the way we write schemas can become highly dependent on that environment (e.g. importing React components, CSS imports etc).

In order to pull out the schema types for codegen, Sanity Codegen provides a pre-configured babel setup that makes your schema executable in a Node context by shimming out the Studio environment (e.g. using `css-modules-transform` to ignore CSS imports). This execution occurs in a forked process to prevent and babel conflicts on the main thread.

After the schema has been loaded, it's then run through a validate/normalize step. This will validate that the schema makes sense and then normalize it. The normalized version is statically typed and JSON serializable and is sent over to the main thread.

```js
const { schemaExtractor } = require('@sanity-codegen/extractor');

async function main() {
  // calling the `schemaExtractor` spins up another process and loads the schema
  // there. the resulting normalized types are returned
  const normalizedSchema = await schemaExtractor({
    sanityConfigPath: './studio/sanity.config.ts',
  });

  console.log(normalizedSchema); // { documents: [/* ... */], registeredTypes: [/* ... */] }
}
```

### Generate types

The normalized types can then be fed into `generateTypes`. This function takes in a normalized schema and returns a TypeScript source file.

```js
const {
  schemaExtractor,
  generateSchemaTypes,
} = require('@sanity-codegen/extractor');
const fs = require('fs');

async function main() {
  const normalizedSchema = await schemaExtractor({
    sanityConfigPath: './studio/sanity.config.ts',
  });
  const typescriptSource = await generateSchemaTypes({ normalizedSchema });

  await fs.promises.writeFile('./schema.d.ts', typescriptSource);
}
```

## Reference

### `schemaExtractor()`

```ts
interface ExecutorOptions {
  /**
   * Path of the sanity config entry point
   */
  sanityConfigPath: string;
  /**
   * Optionally provide a path to a .babelrc file. This will be sent to the
   * babel options while loading the schema.
   *
   * `babelOptions` takes precedence over `babelrcPath`
   */
  babelrcPath?: string;
  /**
   * Optionally provide babel options inline. These are serialized as JSON
   * and sent over to the forked process normalizing the schema.
   *
   * `babelOptions` takes precedence over `babelrcPath`
   */
  babelOptions?: any;
  /**
   * Optionally provide a working directory. All of the sanity schema files must
   * be inside the current working directory. If not, you may get errors like
   * "Cannot use import statement outside a module".
   */
  cwd?: string;
}

/**
 * Takes in a Sanity Schema file path and returns a validated and normalized
 * schema.
 *
 * Spins up a forked process where a new babel config is loaded to mimic a
 * Sanity Studio browser environment.
 */
export declare function schemaExtractor(
  params: ExecutorOptions,
): Promise<Sanity.SchemaDef.Schema>;
```

[See here for the definition of `Sanity.SchemaDef.Schema`](./extractor.d.ts)

### `schemaNormalizer()`

```ts
/**
 * Takes in a raw sanity schema and returns a statically typed normalized
 * version. This function also validates the raw schema, throwing when errors
 * are found.
 *
 * @param types raw sanity schema in the form of a type array
 * @returns normalized sanity schema
 */
export declare function schemaNormalizer(types: any[]): Sanity.SchemaDef.Schema;
```

### `defaultBabelOptions`

```ts
/**
 * These are the default options passed into babel used for loading Sanity
 * Schemas in a node context.
 *
 * If you need to customize the behavior, you can import these default options
 * and add on to them. `schemaExtractor` accepts the option `babelOptions`
 */
export declare const defaultBabelOptions: BabelOptions;
```
