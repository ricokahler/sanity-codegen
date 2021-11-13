// "imports" the ambient types so that the package root can be used as a
// triple slash reference: https://stackoverflow.com/a/66951492/5776910
/// <reference types="@sanity-codegen/types" />

export { run } from '@oclif/command';
export * from './types';
