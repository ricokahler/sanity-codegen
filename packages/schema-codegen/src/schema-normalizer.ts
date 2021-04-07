// TODO: utilize this error more and re-hydrate it when it goes over IPC
export class SchemaParseError extends Error {}

const getFormattedName = (i: any): string => {
  if (i.name) return i.name;
  return `(${['anonymous', i.type].filter(Boolean).join(' ')})`;
};

function getDefProps<T extends string, U extends 'primitive' | 'alias'>(
  i: any,
  definitionType?: U
): Sanity.SchemaDef.DefProps<T, U> {
  return {
    definitionType: definitionType || ('primitive' as U),
    codegen: {
      required: !!i.codegen?.required,
    },
    description: i.description || null,
    hidden: !!i.hidden,
    name: i.name || null,
    readOnly: !!i.readOnly,
    title: i.title || (i.name ? transformCamelCase(i.name) : null),
    type: i.type,
    hasValidation: !!i.validation,
  };
}

function normalizeFields(t: any, parents: Array<string | number>) {
  const fields: any[] = t.fields || [];

  if (!t?.fields?.length) {
    throw new SchemaParseError(
      `Expected type \`${parents.join(
        '.'
      )}\` to have property \`fields\` with at least one field.`
    );
  }

  return fields.map((f: any) => {
    const pathname = parents.join('.');

    if (typeof f.name !== 'string') {
      throw new SchemaParseError(
        `\`${pathname}\` had a field missing a \`name\` string.`
      );
    }

    if (typeof f.type !== 'string') {
      throw new SchemaParseError(
        `\`${pathname}\` has an invalid \`type\`. Expected a string but got \`${
          f.type === null ? 'null' : typeof f.type
        }\``
      );
    }

    const schemaFieldDef: Sanity.SchemaDef.Field = {
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

function normalizeType(t: any, parents: Array<string | number>) {
  switch (t.type) {
    case 'array': {
      const of = t.of;

      const pathname = [...parents, getFormattedName(t)].join('.');

      if (!of) {
        throw new SchemaParseError(
          `\`${pathname}\` was of type \`array\` but did not have an \`of\` property.`
        );
      }

      const schemaArrayDef: Sanity.SchemaDef.Array = {
        ...getDefProps(t),
        of: Array.isArray(of)
          ? of.map((i, index) => normalizeType(i, [...parents, index]))
          : [normalizeType(of, [...parents, 0])],
        list: normalizeList(t, [...parents, getFormattedName(t)]),
      };

      return schemaArrayDef;
    }

    case 'block': {
      const of = t.of;

      const schemaBlockDef: Sanity.SchemaDef.Block = {
        ...getDefProps(t),
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

    case 'object': {
      const schemaDef: Sanity.SchemaDef.Object = {
        ...getDefProps(t),
        fields: normalizeFields(t, [...parents, getFormattedName(t)]),
      };

      return schemaDef;
    }

    case 'document': {
      const defProps = getDefProps<'document', 'primitive'>(t);

      if (typeof defProps.name !== 'string') {
        throw new SchemaParseError(`\`name\` is required for documents`);
      }

      const schemaDef: Sanity.SchemaDef.Document = {
        ...(defProps as typeof defProps & { name: string; title: string }),
        fields: normalizeFields(t, [...parents, getFormattedName(t)]),
      };

      return schemaDef;
    }

    case 'boolean':
    case 'date':
    case 'datetime':
    case 'geopoint':
    case 'slug':
    case 'text':
    case 'url': {
      const schemaDef:
        | Sanity.SchemaDef.Boolean
        | Sanity.SchemaDef.Date
        | Sanity.SchemaDef.Datetime
        | Sanity.SchemaDef.Geopoint
        | Sanity.SchemaDef.Slug
        | Sanity.SchemaDef.Text
        | Sanity.SchemaDef.Url = getDefProps(t);

      return schemaDef;
    }

    case 'image':
    case 'file': {
      const schemaDef: Sanity.SchemaDef.File | Sanity.SchemaDef.Image = {
        ...getDefProps(t),
        fields: t.fields
          ? normalizeFields(t, [...parents, getFormattedName(t)])
          : null,
      };

      return schemaDef;
    }

    case 'number':
    case 'string': {
      const schemaDef: Sanity.SchemaDef.String | Sanity.SchemaDef.Number = {
        ...getDefProps(t),
        list: normalizeList(t, [...parents, getFormattedName(t)]),
      };

      return schemaDef;
    }

    case 'reference': {
      // TODO: confirm references are to documents
      const pathname = [...parents, getFormattedName(t)].join('.');

      const to = t.to;

      if (!to) {
        throw new SchemaParseError(
          `\`${pathname}\` was of type \`reference\` but did not have an \`to\` property.`
        );
      }

      const schemaReferenceDef: Sanity.SchemaDef.Reference = {
        ...getDefProps(t),
        to: (Array.isArray(to) ? to : [to]).map((i: any) =>
          getDefProps(i, 'alias')
        ),
        weak: !!t.weak,
      };

      return schemaReferenceDef;
    }

    // if not a primitive type, then assume it's an alias to another type.
    //
    // TODO: confirm this is not an unknown type by checking that a top-level
    // reference does exist
    default: {
      const alias: Sanity.SchemaDef.Alias = getDefProps(t, 'alias');
      return alias;
    }
  }
}

const transformCamelCase = (camelCase: string) =>
  // TODO: what's the logic here
  `${camelCase.substring(0, 1).toUpperCase()}${camelCase.substring(1)}`;

function normalizeList(
  t: any,
  parents: Array<string | number>
): Sanity.SchemaDef.List<any> | null {
  const list = t?.options?.list;

  const pathname = parents.join('.');

  if (!list) return null;
  if (!Array.isArray(list)) {
    throw new SchemaParseError(
      `Expected \`${pathname}.options.list\` to be an array but found \`${
        list === null ? 'null' : typeof list
      }\` instead.`
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
        }"`
      );
    }

    if (!('title' in option && 'value' in option)) {
      throw new SchemaParseError(
        `Invalid \`options.list\` item for type \`${pathname}\`. Expected item to have properties \`title\` and \`value\`.`
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
export function schemaNormalizer(types: any[]): Sanity.SchemaDef.Schema {
  const allTopLevelTypes = types.map((i) => normalizeType(i, []));

  // TODO: check if name is trying to override primitive types
  for (const topLevelType of allTopLevelTypes) {
    if (topLevelType.definitionType === 'primitive' && !topLevelType.name) {
      throw new SchemaParseError('Found top-level type with no `name` field.');
    }
  }

  const documentTypes = allTopLevelTypes.filter(
    (i): i is Sanity.SchemaDef.Document =>
      i.definitionType === 'primitive' && i.type === 'document'
  );

  const topLevelTypes = allTopLevelTypes.filter(
    <T extends Sanity.SchemaDef.Def>(
      i: T
    ): i is Exclude<
      Sanity.SchemaDef.TopLevelType<T>,
      Sanity.SchemaDef.Document
    > => i.type !== 'document' && !!i.name
  );

  return { documentTypes, topLevelTypes };

  // TODO: run validation afterwards
}
