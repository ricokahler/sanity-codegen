# Sanity Codegen ✨ · [![codecov](https://codecov.io/gh/ricokahler/sanity-codegen/branch/main/graph/badge.svg?token=tsUGZsR5QG)](https://codecov.io/gh/ricokahler/sanity-codegen) [![github status checks](https://badgen.net/github/checks/ricokahler/sanity-codegen/main)](https://github.com/ricokahler/sanity-codegen/actions)

> Generate TypeScript types from your Sanity schemas

## Demos

### CLI — generate types in seconds

CLI handles a babel setup and shims out the Sanity part system to generate TypeScript types in seconds.

![CLI Demo](./cli-demo.gif)

### Client — for optimized Sanity DX

Sanity Codegen ships with a simple and tiny client that hooks up with your types.

![Client Demo](./client-demo.gif)

## Installation

```
npm i --save-dev sanity-codegen prettier
```

or

```
yarn add --dev sanity-codegen prettier
```

> Note: Prettier is a peer dependency

## CLI Usage

Create a `sanity-codegen.config.ts` or `sanity-codegen.config.js` at the root of your project.

```ts
import { SanityCodegenConfig } from 'sanity-codegen';

const config: SanityCodegenConfig = {
  schema: './path/to/your/schema',
  outputPath: './schema.ts',
};

export default config;
```

[See here for the rest of the available options.](https://github.com/ricokahler/sanity-codegen/blob/13250d60892bfc95b73d88b28e88b574a31935a7/src/generate-types.ts#L85-L109)

Then run the CLI with [`npx`](https://github.com/npm/npx) at the root of your sanity project.

```
npx sanity-codegen
```

> Running with `npx` runs the CLI in the context of your project's node_modules.

## Client

The Sanity Codegen client is a very simple Sanity client that utilizes the generated types for great DX.

Create `sanity-client.ts` file and configure and export the client.

### Client Installation

```ts
// sanity-client.ts
import { createClient } from 'sanity-codegen';
import { Documents } from './your-generated-schema-types.ts';

// This type parameter enables the client to be aware of your generated types
//                           👇👇👇
export default createClient<Documents>({
  // Note: these are useful to pull from environment variables
  // (required) your sanity project id
  projectId: '...',
  // (required) your sanity dataset
  dataset: '...',
  // (required) the fetch implementation to use
  fetch: window.fetch,
  //
  // (optional) if true, the client will prefer drafts over the published versions
  previewMode: true,
  // (optional) only required if your dataset is private or if you want to use preview mode
  token: '...',
});
```

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

### Client Usage

The client currently only contains 3 methods:

```ts
/**
 * Pass in a document type name and an ID and the client will return the full
 * document typed. Returns `null` if the document can't be found.
 */
function get<T>(type: string, id: string): Promise<T | null>;

/**
 * Pass in a document type and optionally a groq filter clause and the client
 * will return an array of those documents.
 */
function getAll<T>(type: string, filter?: string): Promise<T[]>;

/**
 * Given a Sanity reference, this will fetch that reference with types.
 * Calls the above `get` function internally
 */
function expand<T>(ref: SanityReference<T>): Promise<R>;
```

The design behind the client is to fetch full documents and handle projections and transforms in code.

The appeal of this approach is purely its simplicity, and in the context Jamstack apps the extra weight of the request doesn't matter since it'll get compiled to static data anyway.

If you're using next.js you can write your projections/transforms in `getStaticProps` and use the return type to infer incoming props. The types will flow down nicely 😎.

```tsx
import sanity from './sanity-client';

export const getStaticProps = async (context) => {
  const slug = context.params?.slug as string;
  const [blogPost] = sanity.getAll('blogPost', `seo.slug.current == "${slug}"`);
  const { title, content } = blogPost;

  return { props: { title, content } };
};

type Props = ReturnType<typeof getStaticProps>['props'];

function BlogPost({ title, content }: Props) {
  return (
    <>
      <h1>{title}</h1>
      <p>{content}</p>
    </>
  );
}

export default BlogPost;
```

## API Usage

Better docs coming soon. For now the gist is:

```ts
import generateTypes from 'sanity-codegen/generate-types';

generateTypes({
  // see here:
  // https://github.com/ricokahler/sanity-codegen/blob/13250d60892bfc95b73d88b28e88b574a31935a7/src/generate-types.ts#L85-L109
}).then((generatedTypes) => {
  // `generatedTypes` is a string with the typescript code
});
```

However you may run into challenges with executing the code if your schema imports from the sanity parts system. [The CLI tries to help you with this.](https://github.com/ricokahler/sanity-codegen/blob/13250d60892bfc95b73d88b28e88b574a31935a7/src/cli.ts#L18-L34)
