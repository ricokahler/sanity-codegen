planned features:

- programmatic codegen
- cli codegen
- client with generated types

## Installation

```
npm i sanity-codegen
```

or

```
yarn add sanity-codegen
```

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

Either install `sanity-codegen` globally or use [`npx`](https://github.com/npm/npx) (recommended).

Run:

```
npx sanity-codegen
```

## API Usage

docs coming soon

## Client Usage

docs coming soon
