import type { GenerateTypesOptions } from '@sanity-codegen/core';

export interface SanityCodegenConfig extends Partial<GenerateTypesOptions> {
  /**
   * Optionally provide the path to your sanity config (sanity.config.ts). If
   * not provided, the CLI will look in the usual places.
   */
  sanityConfigPath?: string;
  /**
   * Optionally provide a destination path to the resulting sanity groq types.
   * The default value is `sanity-codegen-types.d.ts`.
   */
  typesOutputPath?: string;
  /**
   * Optionally provide a path to a .babelrc file. This will be passed into the
   * babel options of the schema executor.
   *
   * If both `babelOptions` and `babelrcPath` are provided, the results will be
   * merged with `babel-merge`
   */
  babelrcPath?: string;
  /**
   * Optionally provide babel options inline. This will be passed into the babel
   * options of the schema executor.
   *
   * Note: these options get serialized to JSON so if you need to pass any
   * non-serializable babel options, you must use `babelrcPath` (can be
   * `.babelrc.js`).
   *
   * If both `babelOptions` and `babelrcPath` are provided, the results will be
   * merged with `babel-merge`
   */
  // TODO: add types from babel
  babelOptions?: Record<string, unknown>;
  /**
   * Determines from where files are relative to. Defaults to where your
   * sanity-codegen config was found.
   */
  root?: string;
}
