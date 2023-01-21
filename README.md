# Sanity Codegen ✨

> Generate TypeScript types from your Sanity schemas and queries

## Installation

```
# NOTE: the alpha is required at this time
npm i --save-dev sanity-codegen@alpha
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

### Query types (aka GROQ-codegen)

See usage with the [`@sanity-codegen/client`](./packages/client).
