declare namespace Sanity {
  namespace GroqCodegen {
    /**
     * An intermediate representation of a set of types. This structure is
     * first derived from a sanity schema. That structure is then altered to
     * match the types inside of a GROQ AST.
     *
     * @see `transformSchemaToStructure`
     * @see `transformGroqToStructure`
     */
    type StructureNode =
      | LazyNode
      | AndNode
      | OrNode
      | ArrayNode
      | ObjectNode
      | StringNode
      | NumberNode
      | BooleanNode
      | IntrinsicNode
      | ReferenceNode
      | UnknownNode;

    type LazyNode = {
      type: 'Lazy';
      get: () => StructureNode;
      // Note: it's important that `Lazy`'s hash a function of the the lazy
      // value to be pulled, otherwise, there may be weird behavior due
      // collisions. See `transformSchemaToStructure`.
      hash: string;
    };

    type AndNode = {
      type: 'And';
      children: StructureNode[];
      hash: string;
    };

    type OrNode = {
      type: 'Or';
      children: StructureNode[];
      hash: string;
    };

    type ArrayNode = {
      type: 'Array';
      canBeNull: boolean;
      canBeOptional: boolean;
      of: StructureNode;
      hash: string;
    };

    type ObjectNode = {
      type: 'Object';
      properties: Array<{ key: string; value: StructureNode }>;
      canBeNull: boolean;
      canBeOptional: boolean;
      hash: string;
    };

    type StringNode = {
      type: 'String';
      canBeNull: boolean;
      canBeOptional: boolean;
      value: string | null;
      hash: string;
    };

    type NumberNode = {
      type: 'Number';
      canBeNull: boolean;
      canBeOptional: boolean;
      value: number | null;
      hash: string;
    };

    type BooleanNode = {
      type: 'Boolean';
      canBeNull: boolean;
      canBeOptional: boolean;
      hash: string;
    };

    type IntrinsicType = 'Asset' | 'Crop' | 'Hotspot' | 'Geopoint';

    type IntrinsicNode = {
      type: 'Intrinsic';
      intrinsicType: IntrinsicType;
      canBeNull: boolean;
      canBeOptional: boolean;
      hash: string;
    };

    type ReferenceNode = {
      type: 'Reference';
      to: StructureNode;
      canBeNull: boolean;
      canBeOptional: boolean;
      hash: string;
    };

    type UnknownNode = { type: 'Unknown'; hash: 'unknown' };
  }
}
