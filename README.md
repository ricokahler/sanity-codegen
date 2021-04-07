# Sanity Codegen ✨ ·

[![codecov](https://codecov.io/gh/ricokahler/sanity-codegen/branch/main/graph/badge.svg?token=tsUGZsR5QG)](https://codecov.io/gh/ricokahler/sanity-codegen)
[![github status checks](https://badgen.net/github/checks/ricokahler/sanity-codegen/main)](https://github.com/ricokahler/sanity-codegen/actions)
[![bundlephobia](https://badgen.net/bundlephobia/minzip/sanity-codegen)](https://bundlephobia.com/result?p=sanity-codegen)

> Generate TypeScript types from your Sanity schemas

## Installation

```
npm i --save-dev sanity-codegen@alpha
```

or

```
yarn add --dev sanity-codegen@alpha
```

## CLI Usage

At the root of your sanity project, run:

```
npx sanity-codegen schema-codegen
```

This command will locate your schema, generate TypeScript types, and write them to `schema.d.ts`.

[You can also create a configuration file and see other options here.](./packages/cli)

### Using the types

In the project that will use the types, install the package `@sanity-codegen/types@alpha`

```
npm i --save-dev @sanity-codegen/types@alpha
```

or

```
yarn add --dev @sanity-codegen/types@alpha
```

From there, include the types file generated from the CLI at the root of your repo. This will create ambient types that you can use in any file without importing them.

### Schema Codegen Options

If you want your type to be marked as required instead of optional, add `codegen: { required: true }` to your schema fields:

```ts
export default {
  name: 'myDocument',
  type: 'document',
  fields: [
    {
      name: 'aRequiredField',
      type: 'string',
      // 👇👇👇
      codegen: { required: true },
      validation: (Rule) => Rule.required(),
      // 👆👆👆
    },
  ],
};
```

This will tell the codegen to remove the optional `?` modifier on the field.

> **NOTE:** Drafts that are run through the document may have incorrect types. Be aware of this when using preview mode.

## Usage with first-party client (`@sanity/codegen`)

For more stable usage, you can use the generated types with the first party javascript client [`@sanity/client`](https://www.sanity.io/docs/js-client) (or the tiny alternative [`picosanity`](https://github.com/rexxars/picosanity)).

Query for documents like normal but use the generated types to create the correct type for your query.

```ts
import sanityClient from '@sanity/client';
import groq from 'groq';

const client = sanityClient({
  projectId: 'your-project-id',
  dataset: 'bikeshop',
  token: 'sanity-auth-token', // or leave blank to be anonymous user
  useCdn: true, // `false` if you want to ensure fresh data
});

// Step 1: write a query
const query = groq`
  *[_type == 'blogPost'] {
    // pick the title
    title,
    // then a full expansion of the author
    author -> { ... },
  }
`;

// Step 2: create a type for your query's result composed from the codegen types.
//
// Refer to Typescript's utility types for useful type helpers:
// https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys
//
// And also intersections:
// https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#intersection-types
type QueryResult = Array<
  Omit<Pick<Sanity.Schema.BlogPost, 'title'>, 'author'> & {
    author: Sanity.Schema.Author;
  }
>;

async function main() {
  // Step 3: add the `QueryResult` as the type parameter as well as the query
  const results = await client.fetch<QueryResult>(query);

  const first = results[0];

  console.log(first.title); // "Title"
  console.log(first.author); // { name: 'Example', bio: '...' }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

## API/Programatic Usage

[See the `@sanity-codegen/schema-codegen` package.](./packages/schema-codegen)
