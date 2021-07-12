/// <reference types="@sanity-codegen/types" />

declare namespace Sanity {
  namespace SchemaDef {
    /**
     * The common props used on all schema node types.
     */
    type CommonNodeProps = {
      title: string | null;
      name: string | null;
      hidden: boolean;
      readOnly: boolean;
      description: string | null;
      codegen: { required: boolean };
      hasValidation: boolean;
    };

    /**
     * Defines a field that is common across `Document`s, `Object`s, `Image`s,
     * and `File`s.
     */
    type FieldDef = {
      name: string;
      title: string;
      description: string;
      hidden: boolean;
      readOnly: boolean;
      codegen: { required: boolean };
      hasValidation: boolean;
      definition: SchemaNode;
    };

    /**
     * Defines the options given to the `options.list` configuration of sanity
     * schema type that accepts a list of options (i.e. string, number, array)
     */
    type ListOptionsDef<T> = { title: string; value: T }[];

    /**
     * The root node that contains a list of documents and top-level registered
     * types.
     */
    type Schema = {
      type: 'SchemaRoot';
      /**
       * Holds all the documents found in the schema.
       */
      documents: DocumentNode[];
      /**
       * Holds every other registered type (excluding documents).
       *
       * A registered type is one that is provided to…
       *
       * ```js
       * createSchema({ types: [yourSchemaTypes] })
       * ```
       *
       * …to be used as a `type` when defining fields of other objects,
       * documents, etc.
       */
      registeredTypes: RegisteredSchemaNode[];
    };

    /**
     * A union of all of the different schema nodes.
     *
     * This is a data structure that represents all type-related information
     * about a sanity schema. Note that it purposely leaves out some schema
     * information that is irrelevant to type generation or that cannot be
     * easily serialized to JSON.
     *
     * @see `Sanity.SchemaDef.Schema`
     * @see `Sanity.SchemaDef.RegistryReferenceNode`
     */
    type SchemaNode =
      | DocumentNode
      | RegistryReferenceNode
      | ReferenceNode
      | ObjectNode
      | FileNode
      | ImageNode
      | ArrayNode
      | BlockNode
      | BooleanNode
      | NumberNode
      | StringNode
      | TextNode
      | UrlNode
      | DateNode
      | DatetimeNode
      | GeopointNode
      | SlugNode;

    /**
     * Represents a top-level `SchemaNode` (excluding the `DocumentNode`)
     */
    type RegisteredSchemaNode = Exclude<SchemaNode, { type: 'Document' }> & {
      // name will always be defined
      name: string;
    };

    /**
     * A node that represents a reference to top-level registered schema node.
     *
     * NOTE: this node is an additional one to the default sanity schema nodes
     * (meaning there is no 'registry reference' sanity type), that is used to
     * point to a registered sanity type.
     */
    type RegistryReferenceNode = CommonNodeProps & {
      type: 'RegistryReference';
      /**
       * A string that refer to registered type as part of the
       * schema's `registeredTypes`
       */
      to: string;
    };

    type DocumentNode = CommonNodeProps & {
      type: 'Document';
      // name is required for documents
      name: string;
      title: string;
      fields: FieldDef[];
    };

    type ReferenceNode = CommonNodeProps & {
      type: 'Reference';
      to: RegistryReferenceNode[];
      weak: boolean;
    };

    type ObjectNode = CommonNodeProps & {
      type: 'Object';
      /**
       * Fields are required for `Object`s and are guaranteed to have at least
       * one value (via validation)
       */
      fields: FieldDef[];
    };

    type FileNode = CommonNodeProps & {
      type: 'File';
      /**
       * Fields are optional for `File`s and may be null
       */
      fields: FieldDef[] | null;
    };

    type ImageNode = CommonNodeProps & {
      type: 'Image';
      /**
       * Fields are optional for `Image`s and may be null
       */
      fields: FieldDef[] | null;
    };

    type ArrayNode = CommonNodeProps & {
      type: 'Array';
      of: SchemaNode[];
      list: ListOptionsDef<string> | null;
    };

    type BlockNode = CommonNodeProps & {
      type: 'Block';
      of: SchemaNode[] | null;
      markDefs: ObjectNode[];
    };

    type BooleanNode = CommonNodeProps & { type: 'Boolean' };

    type NumberNode = CommonNodeProps & {
      type: 'Number';
      list: ListOptionsDef<number> | null;
    };

    type StringNode = CommonNodeProps & {
      type: 'String';
      list: ListOptionsDef<string> | null;
    };

    type TextNode = CommonNodeProps & { type: 'Text' };

    type UrlNode = CommonNodeProps & { type: 'Url' };

    type DateNode = CommonNodeProps & { type: 'Date' };

    type DatetimeNode = CommonNodeProps & { type: 'Datetime' };

    type GeopointNode = CommonNodeProps & { type: 'Geopoint' };

    type SlugNode = CommonNodeProps & { type: 'Slug' };
  }
}
