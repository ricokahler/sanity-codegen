import { ResolveConfigOptions, format, resolveConfig } from 'prettier';

type ArrayType = { type: 'array'; of: Array<{ type: string }> };
type BlockType = { type: 'block' };
type BooleanType = { type: 'boolean' };
type DateType = { type: 'date' };
type DatetimeType = { type: 'datetime' };
type DocumentType = {
  type: 'document';
  fields: Field[];
  name: string;
  title?: string;
  description?: string;
};
type FileType = { type: 'file'; name?: string; fields?: any[] };
type GeopointType = { type: 'geopoint' };
type ImageType = { type: 'image'; name?: string; fields?: any[] };
type NumberType = { type: 'number' };
type ObjectType = {
  type: 'object';
  fields: Field[];
  name?: string;
  title?: string;
  description?: string;
};
type ReferenceType = {
  type: 'reference';
  to: Array<{ type: string }>;
  weak?: boolean;
};
type SlugType = { name?: string; type: 'slug' };
type StringType = {
  type: 'string';
  options?: { list?: Array<string | { title: string; value: string }> };
};
type SpanType = { type: 'span' };
type TextType = { type: 'text'; rows?: number };
type UrlType = { type: 'url' };

type IntrinsicType =
  | ArrayType
  | BlockType
  | BooleanType
  | DateType
  | DatetimeType
  | DocumentType
  | FileType
  | GeopointType
  | ImageType
  | NumberType
  | ObjectType
  | ReferenceType
  | SlugType
  | StringType
  | SpanType
  | TextType
  | UrlType;

type GetNameTypes<T> = T extends { name?: string } ? T : never;
type NamedType = GetNameTypes<IntrinsicType>;

type Field = {
  name: string;
  title?: string;
  type: string;
  description?: string;
  codegen?: { required?: boolean };
  validation?: any;
};

function validatePropertyName(
  sanityTypeName: string,
  parents: (string | number)[]
) {
  if (!/^[A-Z][A-Z0-9_]*$/i.test(sanityTypeName)) {
    throw new Error(
      `Name "${sanityTypeName}" ${
        parents.length > 0 ? `in type "${parents.join('.')}" ` : ''
      }is not valid. Ensure camel case, alphanumeric and underscore characters only`
    );
  }
}

function defaultGenerateTypeName(sanityTypeName: string) {
  validatePropertyName(sanityTypeName, []);

  const typeName = `${sanityTypeName
    .substring(0, 1)
    .toUpperCase()}${sanityTypeName
    // If using snake_case, remove underscores and convert to uppercase the letter following them.
    .replace(/(_[A-Z])/gi, (replace) => replace.substring(1).toUpperCase())
    .substring(1)}`;

  return typeName;
}

export interface GenerateTypesOptions {
  /**
   * Provide an array of uncompiled sanity types prior to running them through
   * sanity's `createSchema`
   */
  types: IntrinsicType[];
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

async function generateTypes({
  types,
  generateTypeName = defaultGenerateTypeName,
  prettierResolveConfigPath,
  prettierResolveConfigOptions,
}: GenerateTypesOptions) {
  const documentTypes = types.filter(
    (t): t is DocumentType => t.type === 'document'
  );
  const otherTypes = types.filter(
    (t): t is Exclude<IntrinsicType, DocumentType> => t.type !== 'document'
  );

  const createdTypeNames: { [name: string]: boolean } = {};
  const referencedTypeNames: { [name: string]: boolean } = {};

  function createTypeName(name: string) {
    const typeName = generateTypeName(name);
    createdTypeNames[typeName] = true;
    return typeName;
  }

  /**
   * Given a sanity type name, it returns a normalized name that will be used for
   * typescript interfaces throwing if invalid
   */
  function getTypeName(sanityTypeName: string) {
    const typeName = generateTypeName(sanityTypeName);
    referencedTypeNames[typeName] = true;
    return typeName;
  }

  /**
   * Converts a sanity type to a typescript type recursively
   */
  function convertType(
    obj: IntrinsicType | { type: string },
    parents: (string | number)[]
  ): string {
    const intrinsic = obj as IntrinsicType;

    if (intrinsic.type === 'array') {
      const union = intrinsic.of
        .map((i, index) => convertType(i, [...parents, index]))
        .join(' | ');
      return `Array<${union}>`;
    }
    if (intrinsic.type === 'block') {
      return 'SanityBlock';
    }
    if (intrinsic.type === 'document') {
      throw new Error('Found nested document type');
    }
    if (intrinsic.type === 'span') {
      throw new Error('Found span outside of a block type.');
    }
    if (intrinsic.type === 'geopoint') {
      return 'SanityGeoPoint';
    }
    if (intrinsic.type === 'image' || intrinsic.type === 'file') {
      // it will be from an array if the last parent is a number
      const lastParent = parents[parents.length - 1];
      const fromArray = typeof lastParent === 'number';

      // if this object is from a parent that is an array, then the _key
      // property will be present.
      const keyClause = fromArray ? `_key: string;` : '';
      const typeClause = `_type: '${intrinsic.name || intrinsic.type}'; `;
      const assetClause = 'asset: SanityAsset;';

      const fields = intrinsic?.fields || [];

      return `{ ${typeClause} ${keyClause} ${assetClause} ${fields
        .map((field) =>
          convertField(field, [
            ...parents,
            intrinsic.name || `(anonymous ${intrinsic.type})`,
          ])
        )
        .filter(Boolean)
        .join('\n')} }`;
    }
    if (intrinsic.type === 'object') {
      // it will be from an array if the last parent is a number
      const lastParent = parents[parents.length - 1];
      const fromArray = typeof lastParent === 'number';

      const typeClause = intrinsic.name ? `_type: '${intrinsic.name}';` : '';
      // if this object is from a parent that is an array, then the _key
      // property will be present.
      const keyClause = fromArray ? `_key: string;` : '';

      return `{ ${typeClause} ${keyClause} ${intrinsic.fields
        .map((field) =>
          convertField(field, [
            ...parents,
            intrinsic.name || '(anonymous object)',
          ])
        )
        .filter(Boolean)
        .join('\n')} }`;
    }
    if (intrinsic.type === 'reference') {
      // TODO for weak references, the expand should return \`T | undefined\`
      const union = intrinsic.to
        .map((refType) => convertType(refType, [...parents, '_ref']))
        .join(' | ');

      // Note: we want the union to be wrapped by one Reference<T> so when
      // unwrapped the union can be further discriminated using the `_type`
      // of each individual reference type
      return `SanityReference<${union}>`;
    }

    if (intrinsic.type === 'boolean') {
      return 'boolean';
    }
    if (intrinsic.type === 'date') {
      return 'string';
    }
    if (intrinsic.type === 'datetime') {
      return 'string';
    }
    if (intrinsic.type === 'number') {
      return 'number';
    }
    if (intrinsic.type === 'slug') {
      return `{ _type: '${
        intrinsic.name || intrinsic.type
      }'; current: string; }`;
    }
    if (intrinsic.type === 'string') {
      // Sanity lets you specify a set of list allowed strings in the editor
      // for the type of string. This checks for that and returns unioned
      // literals instead of just `string`
      if (intrinsic.options?.list && Array.isArray(intrinsic.options?.list)) {
        return intrinsic.options?.list
          .map((item) => (typeof item === 'object' ? item.value : item))
          .map((item) => `'${item}'`)
          .join(' | ');
      }

      // else just return a string
      return 'string';
    }
    if (intrinsic.type === 'text') {
      return 'string';
    }
    if (intrinsic.type === 'url') {
      return 'string';
    }

    return getTypeName(obj.type);
  }

  function convertField(field: Field, parents: (string | number)[]) {
    const required = !!field.codegen?.required;
    const optional = !required ? '?' : '';

    if (required && typeof field.validation !== 'function') {
      throw new Error(
        `Field "${[...parents, field.name].join(
          '.'
        )}" was marked as required but did not have a validation function.`
      );
    }

    validatePropertyName(field.name, parents);

    return `
    /**
     * ${field.title || field.name} — \`${field.type}\`
     *
     * ${field.description || ''}
     */
    ${field.name}${optional}: ${convertType(field, [...parents, field.name])};
  `;
  }

  function generateTypeForDocument(schemaType: DocumentType) {
    const { name, title, description, fields } = schemaType;

    if (!name) {
      throw new Error(`Found a document type with no name field.`);
    }

    return `
    /**
     * ${title || name}
     *
     * ${description || ''}
     */
    export interface ${createTypeName(name)} extends SanityDocument {
        _type: '${name}';
        ${fields
          .map((field) => convertField(field, [name]))
          .filter(Boolean)
          .join('\n')}
    }
  `;
  }

  const typeStrings = [
    `
      import type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      } from 'sanity-codegen';

      export type {
        SanityReference,
        SanityAsset,
        SanityImage,
        SanityFile,
        SanitySlug,
        SanityGeoPoint,
        SanityBlock,
        SanityDocument,
      };
  `,
    ...types
      .filter((t): t is DocumentType => t.type === 'document')
      .map(generateTypeForDocument),
    ...otherTypes
      .filter(
        (t): t is Exclude<NamedType, DocumentType> & { name: string } =>
          !!(t as any).name
      )
      .map((type) => {
        return `
          export type ${createTypeName(type.name)} = ${convertType(type, [])};
        `;
      }),
  ];

  if (documentTypes.length) {
    typeStrings.push(`
      export type Documents = ${documentTypes
        .map(({ name }) => getTypeName(name))
        .join(' | ')}
    `);
  }

  const missingTypes = Object.keys(referencedTypeNames).filter(
    (typeName) => !createdTypeNames[typeName]
  );

  if (missingTypes.length) {
    console.warn(
      `Could not find types for: ${missingTypes
        .map((t) => `"${t}"`)
        .join(', ')}. Ensure they are present in your schema. ` +
        `Future versions of sanity-codegen will allow you to type them separately.`
    );
  }

  for (const missingType of missingTypes) {
    typeStrings.push(`
      /**
       * This interface is a stub. It was referenced in your sanity schema but
       * the definition was not actually found. Future versions of
       * sanity-codegen will let you type this explicity.
       * 
       * Interface merging may help for the time being:
       * https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces
       */
      interface ${missingType} {}
    `);
  }

  const resolvedConfig = prettierResolveConfigPath
    ? await resolveConfig(
        prettierResolveConfigPath,
        prettierResolveConfigOptions
      )
    : null;

  return format(typeStrings.join('\n'), {
    ...resolvedConfig,
    parser: 'typescript',
  });
}

export default generateTypes;
