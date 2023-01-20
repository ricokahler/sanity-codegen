# @sanity-codegen/client

The following is a sub-package of [`sanity-codegen`](https://github.com/ricokahler/sanity-codegen).

This is the very small runtime dependency required to use Sanity Codegen with GROQ. It's a client carefully coordinated with the GROQ codegen parser/extractor.

## Installation

```
# NOTE: the alpha is required at this time
npm i --save @sanity-codegen/client@alpha
```

or

```
# NOTE: the alpha is required at this time
yarn add @sanity-codegen/client@alpha
```

## Usage

In order to correctly configure the `@sanity-codegen/client`, you first need
to have the GROQ codegen types accessible.

This can be achieved via the CLI. By the default, the CLI will output GROQ codegen types to the file `queries.d.ts`. This file contains global ambient types that should be referenceable everywhere. Generate this file first.

### Configure the client

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

### Using the typed client

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
