// "imports" the ambient types so that the package root can be used as a
// triple slash reference: https://stackoverflow.com/a/66951492/5776910
/// <reference types="./ambient" />

// re-exports the types put in `dist`
export * from './dist';