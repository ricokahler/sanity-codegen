declare namespace Sanity {
  namespace Groq {
    type IntrinsicType = 'Asset' | 'Crop' | 'Hotspot' | 'Geopoint';

    type TypeNode =
      | {
          type: 'Alias';
          get: () => TypeNode;
          isArray: boolean;
          canBeNull: boolean;
          canBeUndefined: boolean;
        }
      | {
          type: 'And';
          children: TypeNode[];
          isArray: boolean;
          canBeNull: boolean;
          canBeUndefined: boolean;
        }
      | {
          type: 'Or';
          children: TypeNode[];
          isArray: boolean;
          canBeNull: boolean;
          canBeUndefined: boolean;
        }
      | {
          type: 'Object';
          properties: Array<{ key: string; value: TypeNode }>;
          canBeNull: boolean;
          canBeUndefined: boolean;
          isArray: boolean;
        }
      | {
          type: 'String';
          canBeNull: boolean;
          canBeUndefined: boolean;
          value: string | null;
          isArray: boolean;
        }
      | {
          type: 'Number';
          canBeNull: boolean;
          canBeUndefined: boolean;
          value: number | null;
          isArray: boolean;
        }
      | {
          type: 'Boolean';
          canBeNull: boolean;
          canBeUndefined: boolean;
          isArray: boolean;
        }
      | {
          type: 'Intrinsic';
          intrinsicType: IntrinsicType;
          canBeNull: boolean;
          canBeUndefined: boolean;
          isArray: boolean;
        }
      | {
          type: 'Reference';
          to: TypeNode;
          canBeNull: boolean;
          canBeUndefined: boolean;
          isArray: boolean;
        }
      | { type: 'Unknown'; isArray: boolean };
  }
}
