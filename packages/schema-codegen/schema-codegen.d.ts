/// <reference types="@sanity-codegen/types" />

declare namespace Sanity {
  namespace SchemaDef {
    type Schema = {
      documentTypes: Document[];
      topLevelTypes: TopLevelType<Exclude<Def, Document>>[];
    };

    type Def =
      | Array
      | Block
      | Document
      | Boolean
      | Date
      | Datetime
      | File
      | Geopoint
      | Image
      | Number
      | Object
      | Reference
      | Slug
      | String
      | Text
      | Url
      | Alias;

    /**
     * a definition but the `name` is required (because top-level types must)
     * have a name
     */
    type TopLevelType<T extends Def> = T & { name: string };

    interface Array extends Sanity.SchemaDef.DefProps<'array'> {
      of: Sanity.SchemaDef.Def[];
      list: List<string> | null;
    }

    interface Block extends Sanity.SchemaDef.DefProps<'block'> {
      // note: this represents inline objects
      of: Sanity.SchemaDef.Def[] | null;
      // do we need markDefs, styles, etc?
      markDefs: Object[];
      // given the above scope, i don't think we do
    }

    interface Boolean extends Sanity.SchemaDef.DefProps<'boolean'> {}

    interface Date extends Sanity.SchemaDef.DefProps<'date'> {}

    interface Datetime extends Sanity.SchemaDef.DefProps<'datetime'> {}

    interface Field {
      name: string;
      title: string;
      description: string;
      hidden: boolean;
      readOnly: boolean;
      codegen: { required: boolean };
      hasValidation: boolean;
      definition: Sanity.SchemaDef.Def;
    }

    interface Document extends Sanity.SchemaDef.DefProps<'document'> {
      // `name` is required for `document`s
      name: string;
      title: string;
      fields: Sanity.SchemaDef.Field[];
    }

    interface File extends Sanity.SchemaDef.DefProps<'file'> {
      fields: Sanity.SchemaDef.Field[] | null;
    }

    interface Geopoint extends Sanity.SchemaDef.DefProps<'geopoint'> {}

    interface Image extends Sanity.SchemaDef.DefProps<'image'> {
      fields: Sanity.SchemaDef.Field[] | null;
    }

    interface Number extends Sanity.SchemaDef.DefProps<'number'> {
      list: List<number> | null;
    }

    interface Object extends Sanity.SchemaDef.DefProps<'object'> {
      fields: Sanity.SchemaDef.Field[];
    }

    interface Reference extends Sanity.SchemaDef.DefProps<'reference'> {
      to: Sanity.SchemaDef.Alias[];
      weak: boolean;
    }

    interface Slug extends Sanity.SchemaDef.DefProps<'slug'> {}

    interface String extends Sanity.SchemaDef.DefProps<'string'> {
      list: List<string> | null;
    }

    interface Text extends Sanity.SchemaDef.DefProps<'text'> {}

    interface Url extends Sanity.SchemaDef.DefProps<'url'> {}

    interface DefProps<
      T extends string,
      U extends 'primitive' | 'alias' = 'primitive'
    > {
      /**
       * The `definitionType` can be either `'primitive'` or `'alias'`.
       *
       * A `primitive` definition is one that refers to a built-in schema type.
       * When the `definitionType` is `primitive`, the `type` can only be one of
       * the following `array`, `block`, `boolean`, `date`, `datetime`,
       * `document`, `file`, `geopoint`, `image`, `number`, `object`,
       * `reference`, `slug`, `string`, `text`, and `url`
       *
       * An `alias` definition refers to another non-primitive type. When the
       * `definitionType` is `alias`, the `type` is just string.
       */
      definitionType: U;
      type: T;
      title: string | null;
      name: string | null;
      hidden: boolean;
      readOnly: boolean;
      description: string | null;
      codegen: { required: boolean };
      hasValidation: boolean;
    }

    interface Alias extends Sanity.SchemaDef.DefProps<string, 'alias'> {}

    type List<T> = {
      // extractor will normalize to this
      title: string;
      value: T;
    }[];
  }
}
