import * as t from '@babel/types';
import generate from '@babel/generator';
import { ResolveConfigOptions, format, resolveConfig } from 'prettier';

import {
  pluckGroqFromFiles,
  PluckGroqFromFilesOptions,
} from './pluck-groq-from-files';
import { simpleLogger } from './utils';
import { generateQueryTypes } from './generate-query-types';
import { generateSchemaTypes } from './generate-schema-types';
import { defaultGenerateTypeName } from './default-generate-type-name';

const logLevels: Sanity.Codegen.LogLevel[] = [
  'success',
  'error',
  'warn',
  'info',
  'verbose',
  'debug',
];

export interface GenerateTypesOptions extends PluckGroqFromFilesOptions {
  /**
   * This option is fed directly to prettier `resolveConfig`
   *
   * https://prettier.io/docs/en/api.html#prettierresolveconfigfilepath--options
   */
  prettierResolveConfigPath?: string;
  /**
   * This options is also fed directly to prettier `resolveConfig`
   *
   * https://prettier.io/docs/en/api.html#prettierresolveconfigfilepath--options
   */
  prettierResolveConfigOptions?: ResolveConfigOptions;
  /**
   * An array of extracted and normalized schema results from the
   * `normalizeSchema` function
   */
  normalizedSchemas: Sanity.SchemaDef.Schema[];
  /**
   * Ignores workspace schemas and excludes them from codegen. Useful if you have a
   * workspace that mirrors another one in schema (e.g. for staging env)
   */
  ignoreSchemas?: string[];

  root?: string;
  /**
   * Function that generates the typescript type identifier from the node name.
   *
   * @param typeName The generated type name from the node name
   */
  generateTypeName?: (
    typeName: string,
    context: {
      normalizedSchema: Sanity.SchemaDef.Schema;
      node:
        | Sanity.SchemaDef.DocumentNode
        | Sanity.SchemaDef.RegisteredSchemaNode;
      nodes: (
        | Sanity.SchemaDef.DocumentNode
        | Sanity.SchemaDef.RegisteredSchemaNode
      )[];
    },
  ) => string;
  /**
   * Function that generates the typescript workspace identifier from the schema
   * name.
   *
   * @param typeName The generated workspace name from the schema name
   */
  generateWorkspaceName?: (
    typeName: string,
    context: {
      normalizedSchemas: Sanity.SchemaDef.Schema[];
      normalizedSchema: Sanity.SchemaDef.Schema;
    },
  ) => string;
  /**
   * Custom declarations to be added to the generated types, or a function that
   * returns such declarations.
   */
  declarations?:
    | (string | t.TSModuleDeclaration)[]
    | ((context: {
        t: typeof t;
        normalizedSchemas: Sanity.SchemaDef.Schema[];
        generateTypeName: GenerateTypesOptions['generateTypeName'];
        generateWorkspaceName: GenerateTypesOptions['generateWorkspaceName'];
        defaultGenerateTypeName: typeof defaultGenerateTypeName;
        getTypeName: (
          node:
            | Sanity.SchemaDef.DocumentNode
            | Sanity.SchemaDef.RegisteredSchemaNode,
        ) => string;
        getWorkspaceName: (normalizedSchema: Sanity.SchemaDef.Schema) => string;
      }) =>
        | (string | t.TSModuleDeclaration)[]
        | Promise<(string | t.TSModuleDeclaration)[]>);
}

/**
 * Given a selection of filenames, this will pluck matching GROQ queries
 * (@see `pluckGroqFromFiles`) and then run them through a GROQ-to-TypeScript
 * transform.
 *
 * The result of each plucked query is put together into one source string.
 */
export async function generateTypes({
  prettierResolveConfigOptions,
  prettierResolveConfigPath,
  normalizedSchemas,
  ignoreSchemas = [],
  generateTypeName = (typeName) => typeName,
  generateWorkspaceName = (typeName) => typeName,
  declarations: injectedDeclarationsOrFn = [],
  ...pluckOptions
}: GenerateTypesOptions) {
  const { logger = simpleLogger } = pluckOptions;

  const declarations: Record<string, t.TSModuleDeclaration> = {};
  const substitutions: Record<string, t.TSType> = {};

  const filteredSchemas = normalizedSchemas.filter(
    (schema) => !ignoreSchemas.includes(schema.name),
  );

  const getWorkspaceName = (normalizedSchema: Sanity.SchemaDef.Schema) =>
    generateWorkspaceName(defaultGenerateTypeName(normalizedSchema.name), {
      normalizedSchemas: filteredSchemas,
      normalizedSchema,
    });

  const getTypeName = (
    node: Sanity.SchemaDef.DocumentNode | Sanity.SchemaDef.RegisteredSchemaNode,
  ) => {
    const normalizedSchema = filteredSchemas.find(
      (schema) =>
        // perform cheap searches by reference first
        schema.documents.includes(node as Sanity.SchemaDef.DocumentNode) ||
        schema.registeredTypes.includes(
          node as Sanity.SchemaDef.RegisteredSchemaNode,
        ),
    );
    if (!normalizedSchema) {
      throw new Error(
        `Could not find normalized schema for node "${node.name}" in any of the normalized schemas. Please pass in the node as it is in the schema, not a copy, as the search is done by reference.`,
      );
    }

    return generateTypeName(defaultGenerateTypeName(node.name), {
      normalizedSchema,
      node,
      nodes: [
        ...normalizedSchema.documents,
        ...normalizedSchema.registeredTypes,
      ],
    });
  };

  for (let i = 0; i < filteredSchemas.length; i++) {
    const normalizedSchema = filteredSchemas[i];
    const wrappedLogger = logLevels.reduce<Sanity.Codegen.Logger>(
      (acc, next) => {
        const prefix = `[${normalizedSchema.name}]${
          normalizedSchemas.length > 1
            ? ` (${i + 1}/${normalizedSchemas.length})`
            : ''
        }`;
        acc[next] = (message) => logger[next](`${prefix} ${message}`);

        return acc;
      },
      { ...logger },
    );

    const workspaceIdentifier = getWorkspaceName(normalizedSchema);

    wrappedLogger.verbose(
      `Generating types for workspace \`${normalizedSchema.name}\` as \`${workspaceIdentifier}\``,
    );

    const schemaTypes = generateSchemaTypes({
      normalizedSchema,
      workspaceIdentifier,
      generateTypeName,
    });
    const schemaCount = Object.keys(schemaTypes.declarations).length;

    wrappedLogger[schemaCount ? 'success' : 'warn'](
      `Converted ${schemaCount} schema definition${
        schemaCount === 1 ? '' : 's'
      } to TypeScript`,
    );

    for (const [key, value] of Object.entries(schemaTypes.declarations)) {
      declarations[key] = value;
    }
    for (const [key, value] of Object.entries(schemaTypes.substitutions)) {
      substitutions[key] = value;
    }

    wrappedLogger.verbose(`Plucking queries from files…`);
    const extractedQueries = await pluckGroqFromFiles({
      ...pluckOptions,
      logger: wrappedLogger,
    });

    wrappedLogger.verbose(`Converting queries to typescript…`);
    const queryTypes = generateQueryTypes({
      normalizedSchema,
      substitutions: schemaTypes.substitutions,
      extractedQueries,
      workspaceIdentifier,
    });
    const queryCount = Object.keys(queryTypes.declarations).length;

    wrappedLogger[queryCount ? 'success' : 'success'](
      `Converted ${queryCount} ${
        queryCount === 1 ? 'query' : 'queries'
      } to TypeScript`,
    );

    for (const [key, value] of Object.entries(queryTypes.declarations)) {
      declarations[key] = value;
    }
    for (const [key, value] of Object.entries(queryTypes.substitutions)) {
      substitutions[key] = value;
    }
  }

  const injectedDeclarations = await Promise.resolve({
    t,
    normalizedSchemas: filteredSchemas,
    generateTypeName,
    generateWorkspaceName,
    defaultGenerateTypeName,
    getWorkspaceName,
    getTypeName,
  })
    .then(
      typeof injectedDeclarationsOrFn === 'function'
        ? injectedDeclarationsOrFn
        : () => injectedDeclarationsOrFn,
    )
    .then((maybeDeclarations) => maybeDeclarations || []);

  const finalCodegen = `
    /// <reference types="@sanity-codegen/types" />

    ${injectedDeclarations
      .concat(Object.values(declarations))
      .map((declaration) =>
        typeof declaration === 'string'
          ? declaration.trim()
          : generate(declaration).code,
      )
      .sort((a, b) => a.localeCompare(b, 'en'))
      .join('\n')}
  `;

  const resolvedConfig = prettierResolveConfigPath
    ? await resolveConfig(
        prettierResolveConfigPath,
        prettierResolveConfigOptions,
      )
    : null;

  return format(finalCodegen, {
    ...resolvedConfig,
    parser: 'typescript',
  });
}
