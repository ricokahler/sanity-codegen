declare namespace Sanity {
  namespace GroqCodegen {
    type IntrinsicType = 'Asset' | 'Crop' | 'Hotspot' | 'Geopoint';

    type LazyNode = {
      type: 'Lazy';
      get: () => StructureNode;
    };

    type AndNode = {
      type: 'And';
      children: StructureNode[];
    };

    type OrNode = {
      type: 'Or';
      children: StructureNode[];
    };

    type ArrayNode = {
      type: 'Array';
      canBeNull: boolean;
      canBeUndefined: boolean;
      of: StructureNode;
    };

    type ObjectNode = {
      type: 'Object';
      properties: Array<{ key: string; value: StructureNode }>;
      canBeNull: boolean;
      canBeUndefined: boolean;
    };

    type StringNode = {
      type: 'String';
      canBeNull: boolean;
      canBeUndefined: boolean;
      value: string | null;
    };

    type NumberNode = {
      type: 'Number';
      canBeNull: boolean;
      canBeUndefined: boolean;
      value: number | null;
    };

    type BooleanNode = {
      type: 'Boolean';
      canBeNull: boolean;
      canBeUndefined: boolean;
    };

    type IntrinsicNode = {
      type: 'Intrinsic';
      intrinsicType: IntrinsicType;
      canBeNull: boolean;
      canBeUndefined: boolean;
    };

    type ReferenceNode = {
      type: 'Reference';
      to: StructureNode;
      canBeNull: boolean;
      canBeUndefined: boolean;
    };

    type UnknownNode = { type: 'Unknown' };

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
  }
}
