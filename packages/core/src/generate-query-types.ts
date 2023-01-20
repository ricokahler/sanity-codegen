import * as t from '@babel/types';
import { parse } from 'groq-js';
import { transformGroqToStructure } from './transform-groq-to-structure';
import { transformStructureToTs } from './transform-structure-to-ts';

interface GenerateQueryTypesOptions {
  normalizedSchema: Sanity.SchemaDef.Schema;
  substitutions: { [hash: string]: t.TSType };
  extractedQueries: Array<{ queryKey: string; query: string }>;
  /**
   * optionally override the default logger (e.g. to silence it, etc)
   */
  logger?: Sanity.Codegen.Logger;
}

export function generateQueryTypes({
  normalizedSchema,
  extractedQueries,
  ...options
}: GenerateQueryTypesOptions) {
  const queries = extractedQueries.map(({ queryKey, query }) => {
    // TODO: should this be async?
    const structure = transformGroqToStructure({
      node: parse(query),
      scopes: [],
      normalizedSchema,
    });

    const { tsType, declarations, substitutions } = transformStructureToTs({
      structure,
      substitutions: options.substitutions,
    });

    return {
      structure,
      queryKey,
      declarations: {
        ...declarations,
        [structure.hash]: t.tsModuleDeclaration(
          t.identifier('Sanity'),
          t.tsModuleDeclaration(
            t.identifier('Query'),
            t.tsModuleBlock([
              t.tsTypeAliasDeclaration(
                t.identifier(queryKey),
                undefined,
                tsType,
              ),
            ]),
          ),
        ),
      },
      substitutions: {
        ...substitutions,
        [structure.hash]: t.tsTypeReference(
          t.tsQualifiedName(
            t.tsQualifiedName(t.identifier('Sanity'), t.identifier('Query')),
            t.identifier(queryKey),
          ),
        ),
      },
    };
  });

  const substitutions = queries.reduce<{ [key: string]: t.TSType }>(
    (acc, { queryKey, substitutions }) => {
      for (const [hash, substitution] of Object.entries(substitutions)) {
        if (!acc[hash]) {
          acc[hash] = substitution;
        } else {
          acc[`${hash}_${queryKey}`] = t.tsTypeReference(
            t.tsQualifiedName(
              t.tsQualifiedName(t.identifier('Sanity'), t.identifier('Query')),
              t.identifier(queryKey),
            ),
          );
        }
      }

      return acc;
    },
    {},
  );

  const declarations = queries.reduce<{ [key: string]: t.TSModuleDeclaration }>(
    (acc, { declarations, queryKey, structure }) => {
      for (const [hash, declaration] of Object.entries(declarations)) {
        if (!acc[hash]) {
          acc[hash] = declaration;
        } else {
          acc[`${hash}_${queryKey}`] = t.tsModuleDeclaration(
            t.identifier('Sanity'),
            t.tsModuleDeclaration(
              t.identifier('Query'),
              t.tsModuleBlock([
                t.tsTypeAliasDeclaration(
                  t.identifier(queryKey),
                  undefined,
                  substitutions[structure.hash],
                ),
              ]),
            ),
          );
        }
      }

      return acc;
    },
    {},
  );

  const queryKeys = Object.fromEntries(
    queries.map((i) => [i.queryKey, i.structure.hash]),
  );

  return {
    declarations: {
      ...declarations,
      QueryMap: t.tsModuleDeclaration(
        t.identifier('Sanity'),
        t.tsModuleDeclaration(
          t.identifier('Query'),
          t.tsModuleBlock([
            t.tsTypeAliasDeclaration(
              t.identifier('Map'),
              undefined,
              t.tsTypeLiteral(
                Object.entries(queryKeys).map(([queryKey, hash]) => {
                  return t.tsPropertySignature(
                    t.identifier(queryKey),
                    t.tsTypeAnnotation(
                      substitutions[`${hash}_${queryKey}`] ||
                        substitutions[hash],
                    ),
                  );
                }),
              ),
            ),
          ]),
        ),
      ),
    },
    substitutions,
  };
}
