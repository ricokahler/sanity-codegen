import { ResolveConfigOptions, format, resolveConfig } from 'prettier';

export interface GenerateTypesOptions {
  schema: Sanity.SchemaDef.Schema;
  /**
   * Optionally provide a function that generates the typescript type identifer
   * from the sanity type name. Use this function to override the default and
   * prevent naming collisions.
   */
  generateTypeName?: (sanityTypeName: string) => string;
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
}

type Segment = { node: Sanity.SchemaDef.Def; path: string | number };

function defaultGenerateTypeName(sanityTypeName: string) {
  const typeName = `${sanityTypeName
    .substring(0, 1)
    .toUpperCase()}${sanityTypeName
    // If using snake_case, remove underscores and convert to uppercase the letter following them.
    .replace(/(_[A-Z])/gi, (replace) => replace.substring(1).toUpperCase())
    .replace(/(-[A-Z])/gi, (replace) => replace.substring(1).toUpperCase())
    .substring(1)}`;

  return typeName;
}

/**
 * Converts a normalized schema schema definitions (created from
 * `@sanity-codegen/extractor`) and returns a TypeScript string formatted with
 * prettier.
 *
 * Note this function returns a string representation in order to embed
 * comments in a simple manner. Run it through babel or TypeScript to get an
 * AST.
 *
 * @param param0 options
 */
export async function generateTypes({
  schema: { documentTypes, topLevelTypes },
  generateTypeName = defaultGenerateTypeName,
  prettierResolveConfigOptions,
  prettierResolveConfigPath,
}: GenerateTypesOptions) {
  function convertType(t: Sanity.SchemaDef.Def, parents: Segment[]): string {
    switch (t.definitionType) {
      case 'alias': {
        return generateTypeName(t.type);
      }
      case 'primitive': {
        switch (t.type) {
          case 'array': {
            const union = t.of
              .map((i, index) =>
                convertType(i, [...parents, { node: t, path: index }])
              )
              .map((i) => {
                // if the wrapping type is a reference, we need to replace that
                // type with `SanityKeyedReference<T>` in order to preserve `T`
                // (which is purely for meta programming purposes)
                const refMatch = /^\s*Sanity\.Reference<([^>]+)>\s*$/.exec(i);

                if (refMatch) {
                  const innerType = refMatch[1];
                  return `Sanity.KeyedReference<${innerType}>`;
                }

                return `Sanity.Keyed<${i}>`;
              })
              .join(' | ');

            return `Array<${union}>`;
          }
          case 'block': {
            // TODO: parse markDefs and serialize in types
            return 'Sanity.Block';
          }
          case 'boolean': {
            return 'boolean';
          }
          case 'date':
          case 'datetime':
          case 'text':
          case 'url': {
            return 'string';
          }
          case 'document': {
            // TODO: should this be another error type?
            // TODO: should this check be moved into the normalizer?
            throw new Error('Found nested document type');
          }
          case 'image':
          case 'file':
          case 'object': {
            const lastNode: Sanity.SchemaDef.Def | undefined =
              parents[parents.length - 1]?.node;

            const lastNodeHasFields =
              lastNode?.definitionType === 'primitive' && 'fields' in lastNode;

            const typeClause =
              t.name && !lastNodeHasFields ? `_type: '${t.name}';` : '';

            const assetClause =
              t.type === 'image' || t.type === 'file'
                ? 'asset: Sanity.Asset;'
                : '';

            const imageClause =
              t.type === 'image'
                ? 'crop?: Sanity.ImageCrop; hotspot?: Sanity.ImageHotspot;'
                : '';

            const fieldsClause = (t.fields || [])
              .map((field) =>
                convertField(field, [
                  ...parents,
                  { node: t, path: t.name || '(anonymous object)' },
                ])
              )
              .filter(Boolean)
              .join('\n');

            return `{
              ${typeClause}
              ${assetClause}
              ${imageClause}
              ${fieldsClause}
            }`;
          }
          case 'geopoint': {
            return 'Sanity.Geopoint';
          }
          case 'string': {
            // Sanity lets you specify a set of list allowed strings in the
            // editor for the type of string. This checks for that and returns
            // unioned literals instead of just `string`
            if (t.list) {
              return t.list.map((i) => `'${i.value}'`).join(' | ');
            }

            // else just return a string
            return 'string';
          }
          case 'number': {
            // Sanity lets you specify a set of list allowed number in the
            // editor for the type of string. This checks for that and returns
            // unioned literals instead of just `number`
            if (t.list) {
              return t.list.map((i) => `${i.value}`).join(' | ');
            }

            // else just return a number
            return 'number';
          }
          case 'reference': {
            // TODO: do something for weak references
            const union = t.to
              .map((refType) =>
                convertType(refType, [...parents, { node: t, path: '_ref' }])
              )
              .join(' | ');

            // Note: we want the union to be wrapped by one Reference<T> so when
            // unwrapped the union can be further discriminated using the `_type`
            // of each individual reference type
            return `Sanity.Reference<${union}>`;
          }
          case 'slug': {
            // TODO: when does a slug get a `_type`?
            return `{
              _type: '${t.name || t.type}';
              current: string;
            }`;
          }
          default: {
            throw new Error(
              'Found unknown type. This is a bug in sanity-codegen. Please file an issue.'
            );
          }
        }
      }
    }
  }

  function convertField(f: Sanity.SchemaDef.Field, parents: Segment[]): string {
    return `
      /**
       * ${f.title} - \`${f.definition.type}\`${
      f.description ? `\n${f.description}` : ''
    }
       */
      ${f.name}${f.codegen.required ? '' : '?'}: ${convertType(f.definition, [
      ...parents,
      { node: f.definition, path: f.name },
    ])};
    `;
  }

  const allTypes = [
    ...documentTypes.map((documentType) => {
      const { name, title, description, fields } = documentType;

      return `
      /**
       * ${title}${description ? `\n${description}` : ''}
       */
      interface ${generateTypeName(name)} extends Sanity.Document {
          _type: '${name}';
          ${fields
            .map((t) => convertField(t, [{ node: documentType, path: name }]))
            .join('\n')}
      }
    `;
    }),
    ...topLevelTypes.map((t) => {
      return `
          type ${generateTypeName(t.name)} = ${convertType(t, [])};
        `;
    }),
    documentTypes.length
      ? `
        type Documents = ${documentTypes
          .filter(
            (t): t is Sanity.SchemaDef.Document & { name: string } => !!t.name
          )
          .map((t) => generateTypeName(t.name))
          .join(' | ')}
      `
      : '',
  ].join('\n');

  const result = `
    /// <reference types="@sanity-codegen/types" />

    declare namespace Sanity {
      namespace Schema {
        ${allTypes}
      }
    }
  `;

  const resolvedConfig = prettierResolveConfigPath
    ? await resolveConfig(
        prettierResolveConfigPath,
        prettierResolveConfigOptions
      )
    : null;

  return format(result, {
    ...resolvedConfig,
    parser: 'typescript',
  });
}
