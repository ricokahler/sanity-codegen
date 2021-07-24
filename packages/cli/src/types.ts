import type { GenerateSchemaTypesOptions } from '@sanity-codegen/schema-codegen';
import type { GenerateGroqTypesOptions } from '@sanity-codegen/groq-codegen';

export interface SanityCodegenConfig
  extends Partial<GenerateSchemaTypesOptions>,
    Partial<GenerateGroqTypesOptions> {
  /**
   * Optionally provide the path to your sanity schema entry point. If not
   * provided, the CLI will try to get this value from your `sanity.json` file.
   */
  schemaPath?: string;
  /**
   * Optionally provide a destination path to the resulting sanity schema types.
   * The default value is `schema-types.d.ts`
   */
  schemaTypesOutputPath?: string;
  /**
   * Optionally provide a destination path to the resulting sanity schema JSON.
   * The default value is `schema-def.json`
   */
  schemaJsonOutputPath?: string;
  /**
   * Optionally provide a destination path to the resulting sanity groq types.
   * The default value is `query-types.d.ts`.
   */
  queryTypesOutputPath?: string;
  /**
   * Optionally provide an input `schema-def.json` file to be used for GROQ
   * codegen. This is the `schemaJsonOutputPath` by default.
   */
  schemaJsonInputPath?: string;
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
