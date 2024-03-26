> [!NOTE]
> # 🎉 `sanity-codegen` has been superseded by [Sanity TypeGen][sanity-typegen] 🎉
> 
> Exciting news! `sanity-codegen` has been superseded by [**Sanity TypeGen**][sanity-typegen]!
> 
> As the sole maintainer of `sanity-codegen`, I found myself unable to dedicate the time and attention it truly deserved. That's why I'm thrilled to announce the arrival of Sanity TypeGen! This project is a complete replacement for `sanity-codegen` and is maintained in-house by the same team that maintains GROQ itselt—you couldn't be in better hands ❤️.
> 
> **To the `sanity-codegen` community — Thank you! 💖**
> 
> I am deeply grateful for your support, feedback, and contributions to this project and hope you'll continue to offer the same warmth and insightful feedback to the amazing team behind Sanity TypeGen.
> 
> **🌟Here's to moving forward with Sanity TypeGen! 🌟**

[sanity-typegen]: https://www.sanity.io/blog/introducing-sanity-typegen

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

The `sanity-codegen.d.ts` file that was generated will add ambient types to your project. Access them via `Sanity.{WorkspaceName}.Schema.{TypeName}`

```js
interface Props {
  book: Sanity.Default.Schema.Book; // no import needed. just use it
}

function yourFunction({ book }: Props) {
  //
}
```

### Query types (aka GROQ-codegen)

See usage with the [`@sanity-codegen/client`](./packages/client).
