export interface SanityCodegenConfig
  extends Omit<
    import('@sanity-codegen/schema-codegen').GenerateSchemaTypesOptions,
    'types'
  > {
  /**
   * Optionally provide the path to your sanity schema entry point. If not
   * provided, the CLI will try to get this value from your `sanity.json` file.
   */
  schemaPath?: string;
  /**
   * Optionally provide a destination path to the resulting sanity schema types.
   * The default value is `schema.d.ts`.
   */
  outputPath?: string;
  /**
   * Optionally provide a path to a .babelrc file. This will be passed into the
   * babel options of the schema executor.
   *
   * Mutually exclusive with \`babelOptions\`.
   */
  babelrcPath?: string;
  /**
   * Optionally provide babel options inline. This will be passed into the babel
   * options of the schema executor.
   *
   * Note: these options get serialized to JSON so if you need to pass any
   * non-serializable babel options, you must use `babelrcPath` (can be
   * `.babelrc.js`).
   */
  babelOptions?: string;
  /**
   * Optionally provide a working directory. All of the sanity schema files must
   * be inside the current working directory. If not, you may get errors like
   * "Cannot use import statement outside a module".
   *
   * Defaults to `process.cwd()`
   */
  cwd?: string;
}
