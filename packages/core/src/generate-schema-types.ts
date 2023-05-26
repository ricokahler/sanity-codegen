import * as t from '@babel/types';
import { defaultGenerateTypeName } from './default-generate-type-name';
import { transformSchemaNodeToStructure } from './transform-schema-to-structure';
import { transformStructureToTs } from './transform-structure-to-ts';
import { GenerateTypesOptions } from './generate-types';

interface GenerateSchemaTypesOptions {
  normalizedSchema: Sanity.SchemaDef.Schema;
  workspaceIdentifier?: string;
  generateTypeName?: GenerateTypesOptions['generateTypeName'];
}

export function generateSchemaTypes({
  normalizedSchema,
  workspaceIdentifier = defaultGenerateTypeName(normalizedSchema.name),
  generateTypeName = (typeName) => typeName,
}: GenerateSchemaTypesOptions) {
  const topLevelSchemaNodes = [
    ...normalizedSchema.documents,
    ...normalizedSchema.registeredTypes,
  ];

  const topLevelTypes = topLevelSchemaNodes.map((node) => {
    const structure = transformSchemaNodeToStructure({
      node,
      normalizedSchema,
    });

    const identifier = generateTypeName(defaultGenerateTypeName(node.name), {
      node,
      nodes: topLevelSchemaNodes,
      normalizedSchema,
    });

    const { tsType, declarations, substitutions } = transformStructureToTs({
      structure,
      substitutions: {},
    });

    return {
      structure,
      declarations: {
        ...declarations,
        [structure.hash]: t.tsModuleDeclaration(
          t.identifier('Sanity'),
          t.tsModuleDeclaration(
            t.identifier(workspaceIdentifier),
            t.tsModuleDeclaration(
              t.identifier('Schema'),
              t.tsModuleBlock([
                t.tsTypeAliasDeclaration(
                  t.identifier(identifier),
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
              t.identifier('Schema'),
            ),
            t.identifier(identifier),
          ),
        ),
      },
    };
  });

  const substitutions = Object.fromEntries(
    topLevelTypes.flatMap(({ substitutions }) => Object.entries(substitutions)),
  );

  const declarations = Object.fromEntries(
    topLevelTypes.flatMap(({ declarations }) => Object.entries(declarations)),
  );

  return { declarations, substitutions };
}
