import * as t from '@babel/types';
import { parse } from 'groq-js';
import { transformGroqToStructure } from './transform-groq-to-structure';
import { transformStructureToTs } from './transform-structure-to-ts';
import { defaultGenerateTypeName } from './default-generate-type-name';
import { simpleLogger } from './utils';

interface GenerateQueryTypesOptions {
  normalizedSchema: Sanity.SchemaDef.Schema;
  substitutions: { [hash: string]: t.TSType };
  extractedQueries: Array<{ queryKey: string; query: string }>;
  /**
   * optionally override the default logger (e.g. to silence it, etc)
   */
  logger?: Sanity.Codegen.Logger;
  workspaceIdentifier?: string;
}

export function generateQueryTypes({
  normalizedSchema,
  extractedQueries,
  workspaceIdentifier = defaultGenerateTypeName(normalizedSchema.name),
  ...options
}: GenerateQueryTypesOptions) {
  const { logger = simpleLogger } = options;
  const queries = extractedQueries
    .map(({ queryKey, query }) => {
      let structure;
      try {
        structure = transformGroqToStructure({
          node: parse(query),
          scopes: [],
          normalizedSchema,
        });
      } catch (e) {
        logger.error(`Failed to parse query \`${queryKey}\`. ${e}`);
        return null;
      }

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
              t.identifier(workspaceIdentifier),
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
          ),
        },
        substitutions: {
          ...substitutions,
          [structure.hash]: t.tsTypeReference(
            t.tsQualifiedName(
              t.tsQualifiedName(
                t.tsQualifiedName(
                  t.identifier('Sanity'),
                  t.identifier(workspaceIdentifier),
                ),
                t.identifier('Query'),
              ),
              t.identifier(queryKey),
            ),
          ),
        },
      };
    })
    .filter(<T>(t: T): t is NonNullable<T> => !!t);

  const substitutions = queries.reduce<{ [key: string]: t.TSType }>(
    (acc, { queryKey, substitutions }) => {
      for (const [hash, substitution] of Object.entries(substitutions)) {
        if (!acc[hash]) {
          acc[hash] = substitution;
        } else {
          acc[`${hash}_${queryKey}`] = t.tsTypeReference(
            t.tsQualifiedName(
              t.tsQualifiedName(
                t.tsQualifiedName(
                  t.identifier('Sanity'),
                  t.identifier(workspaceIdentifier),
                ),
                t.identifier('Query'),
              ),
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
              t.identifier(workspaceIdentifier),
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
      _ClientConfig: t.tsModuleDeclaration(
        t.identifier('Sanity'),
        t.tsModuleDeclaration(
          t.identifier(workspaceIdentifier),
          t.tsModuleDeclaration(
            t.identifier('Client'),
            t.tsModuleBlock([
              t.tsTypeAliasDeclaration(
                t.identifier('Config'),
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
      ),
    },
    substitutions,
  };
}
