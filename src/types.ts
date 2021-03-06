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
  /**
   * Pass options directly to `@babel/register`
   */
  babelOptions?: any;
}

/**
 * Represents a reference in Sanity to another entity. Note that the
 * generic type is strictly for TypeScript meta programming.
 */
// NOTE: the _T is for only for typescript meta
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type SanityReference<_T> = {
  _type: 'reference';
  _ref: string;
};

/**
 * Represents a reference in Sanity to another entity with a key. Note that the
 * generic type is strictly for TypeScript meta programming.
 */
// NOTE: the _T is for only for typescript meta
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type SanityKeyedReference<_T> = {
  _type: 'reference';
  _key: string;
  _ref: string;
};

/**
 * Assets in Sanity follow the same structure as references however
 * the string in _ref can be formatted differently than a document.
 */
export type SanityAsset = SanityReference<any>;

export interface SanityImage {
  asset: SanityAsset;
}

export interface SanityFile {
  asset: SanityAsset;
}

export interface SanityGeoPoint {
  _type: 'geopoint';
  lat: number;
  lng: number;
  alt: number;
}

// blocks are typically handled by a block conversion lib
// (e.g. block \`@sanity/block-content-to-react\`) so we only type lightly
export interface SanityBlock {
  _type: 'block';
  [key: string]: any;
}

export interface SanityDocument {
  _id: string;
  _createdAt: string;
  _rev: string;
  _updatedAt: string;
}

export interface SanityImageCrop {
  _type: 'sanity.imageCrop';
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface SanityImageHotspot {
  _type: 'sanity.imageHotspot';
  height: number;
  width: number;
  x: number;
  y: number;
}

export type SanityKeyed<T> = T extends object ? T & { _key: string } : T;
