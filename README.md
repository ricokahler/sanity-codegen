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
npx sanity-codegen codegen
```

This command will locate your schema, generate TypeScript types, and write them to `sanity-codegen.d.ts`.

[You can also create a configuration file and see other options here.](./packages/cli)

## Type usage

### Schema types

The `sanity-codegen.d.ts` file that was generated will add ambient types to your project. Access them via `Sanity.Schema.YourType`

```js
interface Props {
  book: Sanity.Schema.Book; // no import needed. just use it
}

function yourFunction({ book }: Props) {
  //
}
```

### Query types

First install the typed client:

```
npm i @sanity-codegen/client
```

#### Configure the client

After that's done, you can create your configured client file.

In a file called, `client.ts`, import your favorite Sanity client (both [`@sanity/client`](https://www.sanity.io/docs/js-client) and [`picosanity`](https://github.com/rexxars/picosanity) will work).

```ts
// client.ts

import SanityClient from '@sanity/client';
// or use the smaller `picosanity` client
// import SanityClient from 'picosanity';

import { wrapClient, groq } from '@sanity-codegen/client';

// 1. configure your favorite sanity client
const sanityClient = new SanityClient({
  // ...
});

// 2. wrap that client with `wrapClient`. this will return a configure function
const configureClient = wrapClient(picoSanity);

// 3. call this configure function passing in the type argument
//    `Sanity.Query.Map` from the GROQ codegen output.
const sanity = configureClient<Sanity.Query.Map>();

export { sanity, groq };
```

#### Using the typed client

```ts
// some-example.ts

// 1. import the client configured from the previous step
import { sanity, groq } from '../client';

export async function someFunction() {
  // 1. use the added `query` method.
  //    pass in a _query key_ followed by a template
  //    literal with the `groq` tag
  const bookAuthors = await sanity.query(
    'BookAuthors',
    groq`
      *[_type == 'books'].author
    `,
  );

  // 2. ensure the codegen re-runs.
  //    this is easiest via the CLI

  // 3. that's it. `bookAuthors` is now typed
  return bookAuthors;
}

// Extra note: if ever need to reference the type of a query again,
// you can do so via `Sanity.Query.{QueryKey}`
type ExampleType = Sanity.Query.BookAuthors;
```

Note: you'll have to re-run the codegen every time you update your schema or your queries.
