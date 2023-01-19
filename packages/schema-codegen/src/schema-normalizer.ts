import { defaultGenerateTypeName } from './default-generate-type-name';

// TODO: utilize this error more and re-hydrate it when it goes over IPC
export class SchemaParseError extends Error {}

const getFormattedName = (i: any): string => {
  if (i.name) return i.name;
  return `(${['anonymous', i.type].filter(Boolean).join(' ')})`;
};

const isRecord = (t: unknown): t is Record<string, unknown> => {
  if (typeof t !== 'object') return false;
  if (!t) return false;
  return true;
};

function getCommonProps(i: any): Sanity.SchemaDef.CommonNodeProps {
  return {
    codegen: {
      required: !!i.codegen?.required,
    },
    description: i.description || null,
    hidden: !!i.hidden,
    name: i.name || null,
    readOnly: !!i.readOnly,
    title: i.title || (i.name ? transformCamelCase(i.name) : null),
    hasValidation: !!i.validation,
    originalNode: i,
  };
}

const typeMap: Record<string, Sanity.SchemaDef.SchemaNode['type'] | undefined> =
  {
    array: 'Array',
    block: 'Block',
    object: 'Object',
    document: 'Document',
    boolean: 'Boolean',
    date: 'Date',
    datetime: 'Datetime',
    geopoint: 'Geopoint',
    slug: 'Slug',
    text: 'Text',
    url: 'Url',
    image: 'Image',
    file: 'File',
    number: 'Number',
    string: 'String',
    reference: 'Reference',
  };

function normalizeFields(t: any, parents: Array<string | number>) {
  const fields: any[] = t.fields || [];

  if (!t?.fields?.length) {
    throw new SchemaParseError(
      `Expected type \`${parents.join(
        '.',
      )}\` to have property \`fields\` with at least one field.`,
    );
  }

  return fields.map((f: any) => {
    const pathname = parents.join('.');

    if (typeof f.name !== 'string') {
      throw new SchemaParseError(
        `\`${pathname}\` had a field missing a \`name\` string.`,
      );
    }

    if (typeof f.type !== 'string') {
      throw new SchemaParseError(
        `\`${pathname}\` has an invalid \`type\`. Expected a string but got \`${
          f.type === null ? 'null' : typeof f.type
        }\``,
      );
    }

    const schemaFieldDef: Sanity.SchemaDef.FieldDef = {
      name: f.name,
      title: f.title || transformCamelCase(f.name),
      description: f.description || '',
      hidden: !!f.hidden,
      readOnly: !!f.readOnly,
      codegen: { required: !!f.codegen?.required },
      hasValidation: !!f.validation,
      definition: normalizeType(f, parents),
    };

    return schemaFieldDef;
  });
}

function normalizeType(t: unknown, parents: Array<string | number>) {
  const pathname = [...parents, getFormattedName(t)].join('.');

  if (!isRecord(t)) {
    throw new SchemaParseError(
      `Expected \`${pathname}\` to be a non-null object.`,
    );
  }
  if (typeof t.type !== 'string') {
    throw new SchemaParseError(`Expected \`${pathname}.type\` to be a string.`);
  }

  const type = typeMap[t.type] || t.type;

  switch (type) {
    case 'Array': {
      const of = t.of;

      if (!of) {
        throw new SchemaParseError(
          `\`${pathname}\` was of type \`array\` but did not have an \`of\` property.`,
        );
      }

      const schemaArrayDef: Sanity.SchemaDef.ArrayNode = {
        ...getCommonProps(t),
        type,
        of: Array.isArray(of)
          ? of.map((i, index) => normalizeType(i, [...parents, index]))
          : [normalizeType(of, [...parents, 0])],
        list: normalizeList(t, [...parents, getFormattedName(t)]),
      };

      return schemaArrayDef;
    }

    case 'Block': {
      const of = t.of;

      const schemaBlockDef: Sanity.SchemaDef.BlockNode = {
        ...getCommonProps(t),
        type,
        of: of
          ? Array.isArray(of)
            ? of.map((i, index) => normalizeType(i, [...parents, index]))
            : [normalizeType(of, [...parents, 0])]
          : null,
        // TODO: implement this
        markDefs: [],
      };

      return schemaBlockDef;
    }

    case 'Object': {
      const schemaDef: Sanity.SchemaDef.ObjectNode = {
        ...getCommonProps(t),
        type,
        fields: normalizeFields(t, [...parents, getFormattedName(t)]),
      };

      return schemaDef;
    }

    case 'Document': {
      const { name, title, ...defProps } = getCommonProps(t);

      if (!name || typeof name !== 'string') {
        throw new SchemaParseError(`\`name\` is required for documents`);
      }

      if (!title || typeof title !== 'string') {
        throw new SchemaParseError(`\`title\` is required for documents`);
      }

      const schemaDef: Sanity.SchemaDef.DocumentNode = {
        ...defProps,
        name,
        title,
        type,
        fields: normalizeFields(t, [...parents, getFormattedName(t)]),
      };

      return schemaDef;
    }

    case 'Boolean':
    case 'Date':
    case 'Datetime':
    case 'Geopoint':
    case 'Slug':
    case 'Text':
    case 'Url': {
      const node: Extract<Sanity.SchemaDef.SchemaNode, { type: typeof type }> =
        {
          ...getCommonProps(t),
          type,
        };
      return node;
    }

    case 'Image':
    case 'File': {
      const node: Extract<Sanity.SchemaDef.SchemaNode, { type: typeof type }> =
        {
          ...getCommonProps(t),
          type,
          fields: t.fields
            ? normalizeFields(t, [...parents, getFormattedName(t)])
            : null,
        };

      return node;
    }

    case 'Number':
    case 'String': {
      const node: Extract<Sanity.SchemaDef.SchemaNode, { type: typeof type }> =
        {
          ...getCommonProps(t),
          type,
          list: normalizeList(t, [...parents, getFormattedName(t)]),
        };

      return node;
    }

    case 'Reference': {
      // TODO: confirm references are to documents
      const to = t.to;

      if (!to) {
        throw new SchemaParseError(
          `\`${pathname}\` was of type \`reference\` but did not have an \`to\` property.`,
        );
      }

      const node: Sanity.SchemaDef.ReferenceNode = {
        ...getCommonProps(t),
        type,
        to: (Array.isArray(to) ? to : [to]).map((i: any) => {
          if (!i.type) {
            throw new SchemaParseError(
              `\`${pathname}\` of type \`reference\` has a \`to\` value without specifying a \`type\`.`,
            );
          }

          const n: Sanity.SchemaDef.RegistryReferenceNode = {
            ...getCommonProps(i),
            to: i.type,
            type: 'RegistryReference',
          };
          return n;
        }),
        weak: !!t.weak,
      };

      return node;
    }

    // if not an intrinsic type, then assume it's a registry reference to
    // another type.
    //
    // TODO: confirm this is not an unknown type by checking that a top-level
    // reference does exist
    default: {
      const node: Sanity.SchemaDef.RegistryReferenceNode = {
        ...getCommonProps(t),
        type: 'RegistryReference',
        to: t.type,
      };
      return node;
    }
  }
}

const transformCamelCase = (camelCase: string) => {
  const normalizedCamelCase = defaultGenerateTypeName(camelCase);

  return `${normalizedCamelCase
    .substring(0, 1)
    .toUpperCase()}${normalizedCamelCase
    .substring(1)
    .replace(/([A-Z])/g, ' $1')}`;
};

function normalizeList(
  t: any,
  parents: Array<string | number>,
): Sanity.SchemaDef.ListOptionsDef<any> | null {
  const list = t?.options?.list;

  const pathname = parents.join('.');

  if (!list) return null;
  if (!Array.isArray(list)) {
    throw new SchemaParseError(
      `Expected \`${pathname}.options.list\` to be an array but found \`${
        list === null ? 'null' : typeof list
      }\` instead.`,
    );
  }

  return list.map((option) => {
    if (typeof option === 'string') {
      return { title: transformCamelCase(option), value: option };
    }

    if (typeof option === 'number') {
      return { title: option.toString(), value: option };
    }

    if (typeof option !== 'object') {
      throw new SchemaParseError(
        `Invalid \`options.list\` item for type \`${pathname}\`. Expected a string, number, or object but found "${
          option === null ? 'null' : typeof option
        }"`,
      );
    }

    if (!('title' in option && 'value' in option)) {
      throw new SchemaParseError(
        `Invalid \`options.list\` item for type \`${pathname}\`. Expected item to have properties \`title\` and \`value\`.`,
      );
    }

    return { title: option.title, value: option.value };
  });
}

/**
 * Takes in a raw sanity schema and returns a statically typed normalized
 * version. This function also validates the raw schema, throwing when errors
 * are found.
 *
 * @param types raw sanity schema in the form of a type array
 * @returns normalized sanity schema
 */
// TODO: refactor this API to take in a config object instead of a single argument
export function schemaNormalizer(types: any[]): Sanity.SchemaDef.Schema {
  const allRegisteredTypes = types.map((i) => normalizeType(i, []));

  // TODO: check if name is trying to override primitive types
  for (const registeredType of allRegisteredTypes) {
    if (!registeredType.name) {
      throw new SchemaParseError(
        'Found top-level registered type with no `name` field.',
      );
    }
  }

  const documents = allRegisteredTypes.filter(
    (n): n is Sanity.SchemaDef.DocumentNode => n.type === 'Document',
  );

  const restOfRegisteredTypes = allRegisteredTypes.filter(
    (n): n is Sanity.SchemaDef.RegisteredSchemaNode => n.type !== 'Document',
  );

  return {
    type: 'SchemaRoot',
    documents,
    registeredTypes: restOfRegisteredTypes,
  };

  // TODO: run validation afterwards
}
