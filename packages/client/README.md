# @sanity-codegen/client

The following is a sub-package of [`sanity-codegen`](https://github.com/ricokahler/sanity-codegen).

This is a very small runtime dependency created to be used Sanity Codegen for query extraction and usage.

## Installation

```
# NOTE: the alpha is required at this time
npm i --save @sanity-codegen/client@alpha
```

## Usage

There are two ways to use this library with codegen:

1. Option 1: Pluck `codegen('MyQuery', /* ... */)` then use `Sanity.Query.MyQuery`
2. Option 2: Pluck and use all-in-one `client.query('MyQuery', /* ... */)`

### Option 1: Pluck then use

This method involves writing the query first, running the codegen, then using the type codegen outputs.

```ts
import { codegen, groq } from '@sanity-codegen/client';
import sanityClient from '@sanity/client';

const client = sanityClient({
  // ...
  // https://www.sanity.io/docs/js-client
  // ...
});

// step 1: write the query somewhere in your file.
// the codegen CLI will look for this call and pluck it out.
// note: the `codegen` function simply returns the second parameter as is.
const query = codegen(
  // the query key:
  'Books',
  // the query (must be wrapped in groq``):
  groq`*[_type == 'Book']`,
);

// step 2: re-run the codegen

// step 3: after running the codegen, the type for your query will be available.
// the codegen outputs types "ambiently" meaning they can be used without
// importing them. the type will be available via `Sanity.YourWorkspace.Query.YourQueryKey`
const myBooks = await client.fetch<Sanity.Default.Query.Books>(query);
```

Pluck then use is the most compatible way to use this library. [See below for important notes and limitations](#important-notes-and-limitations).

### Option 2: Pluck and use

This method wraps any sanity client with a [`fetch`](https://www.sanity.io/docs/js-client#performing-queries) method and adds an additional `query` method that returns the value typed from the wrapped client.

In a file called, `client.ts`, import your favorite Sanity client (both [`@sanity/client`](https://www.sanity.io/docs/js-client) and [`picosanity`](https://github.com/rexxars/picosanity) will work).

```ts
// client.ts

import sanityClient from '@sanity/client';
// or use the smaller `picosanity` client
// import sanityClient from 'picosanity';

import { wrapClient, groq } from '@sanity-codegen/client';

// step 1: configure your favorite sanity client
const sanityClient = sanityClient({
  // ...
  // https://www.sanity.io/docs/js-client
  // ...
});

// step 2: wrap that client with `wrapClient`
const configureClient = wrapClient(picoSanity);

// step 3: call this configure function passing in the type argument
// `Sanity.YourWorkspace.Client.Config` from the GROQ codegen output (you will have to run the
// codegen at least once before)
const sanity = configureClient<Sanity.Default.Client.Config>();

export { sanity, groq };
```

Then use the typed client in your files:

```ts
// step 1: import the client configured from the previous step
import { sanity, groq } from '../client';

async function someFunction() {
  // step 2: use the added `query` method instead of `fetch`.
  // pass in a query key followed by a query in a groq tag
  const bookAuthors = await sanity.query(
    'BookAuthors',
    groq`
      *[_type == 'books'].author
    `,
  );

  // step 3: re-run the codegen. `bookAuthors` is now typed
  return bookAuthors;
}

// extra note: if ever need to reference the type of a query again,
// you can do so via `Sanity.{WorkspaceName}.Query.{QueryKey}`
type ExampleType = Sanity.Default.Query.BookAuthors;
```

[See below for important notes and limitations](#important-notes-and-limitations).

## Important notes and limitations

This section is a WIP. Check back soon.

TODO:

- mention the plucker and how it has to pluck statically
- mention resolving identifiers to values etc
