# @sanity-codegen/groq-codegen

The following is a sub-package of [`sanity-codegen`](https://github.com/ricokahler/sanity-codegen).

This package includes APIs to programmatically generate types from [GROQ](https://github.com/sanity-io/GROQ) — a query language and execution engine made at Sanity, Inc, for filtering and projecting JSON documents.

> 👋 **NOTE:** You don't have to use this package directly. It's only meant for users who want to use `sanity-codegen` programmatically. The [CLI](../cli) is the preferred way to use Sanity Codegen.

## Installation

```
npm install --save-dev @sanity-codegen/groq-codegen
```

or

```
yarn add --dev @sanity-codegen/groq-codegen
```

## Usage

This package is meant to be used alongside of `@sanity-codegen/schema-codegen` and `@sanity-codegen/types`. Generating the types from GROQ does not actually require any schema codegen dependencies, however the outputted TypeScript does.

For example:

```groq
// example input query:
*[_type == "book"] { "author": author.name, ... }
```

```ts
// example typescript codegen output:
type Query = ({
  author: Sanity.SafeIndexedAccess<
    Sanity.SafeIndexedAccess<
      Extract<Sanity.Schema.Document[][number], { _type: 'book' }>[][number],
      'author'
    >,
    'name'
  >;
} & Omit<
  Extract<Sanity.Schema.Document[][number], { _type: 'book' }>[][number],
  'author'
>)[];
```

You'll notice that the resulting output references the namespace `Sanity.`. This namespace refers to a global ambient namespace that [`@sanity-codegen/schema-codegen`](../packages/schema-codegen) generates. If you're using the CLI, this would be the `schema.d.ts` file.

> 👋 **NOTE:** The GROQ codegen is simply a 1-to-1 translation of your GROQ query to a TypeScript type. During the codegen, it will _not_ error if your query queries for an invalid property, however, the resulting TypeScript type should contain an error.
>
> By design, the GROQ codegen defers much error checking to TypeScript.

In order to generate TypeScript types, import `generateGroqTypes` and then use `generate` from `@babel/generator` to print the TS Type node to a string.

```ts
import { generateGroqTypes } from '@sanity-codegen/groq-codegen';
import generate from '@babel/generator';

const { code } = generate(generateGroqTypes({ query }));

console.log(`type Query = ${code}`);
```

You'll most likely need to combine this with the output of the [schema code generator](../packages/schema-codegen).

```ts
import { generateGroqTypes } from '@sanity-codegen/groq-codegen';
import generate from '@babel/generator';
import {
  schemaNormalizer,
  generateSchemaTypes,
} from '@sanity-codegen/schema-codegen';

interface Params {
  query: string;
  schema: any[];
}

async function getTypeOutput({ query, schema }: Params) {
  const { code } = generate(generateGroqTypes({ query }));
  const schemaTypes = await generateSchemaTypes({
    schema: schemaNormalizer(schema),
  });

  return `
// schema types
${schemaTypes}

// query type
${`type Query = ${code}`}
`;
}

async function main() {
  const types = await getTypeOutput({
    query: '*[_type == "movie"] { title }',
    schema: [
      {
        type: 'document',
        name: 'movie',
        title: 'Movie',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'releaseYear', type: 'number' },
        ],
      },
    ],
  });

  console.log(types);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

The following will be `console.log`ed:

```ts
// schema types
/// <reference types="@sanity-codegen/types" />

declare namespace Sanity {
  namespace Schema {
    /**
     * Movie
     */
    interface Movie extends Sanity.Document {
      _type: 'movie';

      /**
       * Title - `string`
       */
      title?: string;

      /**
       * ReleaseYear - `number`
       */
      releaseYear?: number;
    }

    type Document = Movie;
  }
}

// query type
type Query = {
  title: Sanity.SafeIndexedAccess<
    Extract<
      Sanity.Schema.Document[][number],
      {
        _type: 'movie';
      }
    >[][number],
    'title'
  >;
}[];
```

See [here](../packages/schema-codegen) for more details on the schema code generator.

## Reference

### `generateGroqTypes()`

```ts
interface GenerateGroqTypesOptions {
  /**
   * The query to generate a TypeScript type for
   */
  query: string;
}

/**
 * Given a GROQ query, returns a babel TSType node
 */
export declare function generateGroqTypes({
  query,
}: GenerateGroqTypesOptions): t.TSType;
```
