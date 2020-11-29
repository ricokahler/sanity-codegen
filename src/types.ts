import type { GenerateTypesOptions } from './generate-types';
export type { GenerateTypesOptions } from './generate-types';

export interface SanityCodegenConfig
  extends Omit<GenerateTypesOptions, 'types'> {
  /**
   * The path of your sanity schema where you call `createSchema`
   */
  schemaPath: string;
  /**
   * The output path for the resulting codegen. Defaults to `./schema.ts`
   */
  outputPath?: string;
}
