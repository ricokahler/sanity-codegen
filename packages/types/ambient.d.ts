declare namespace Sanity {
  /**
   * Represents a reference in Sanity to another entity. Note that the
   * generic type is strictly for TypeScript meta programming.
   */
  // NOTE: the _T is for only for typescript meta
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type Reference<_T> = {
    _type: 'reference';
    _ref: string;
  };

  /**
   * Represents a reference in Sanity to another entity with a key. Note that the
   * generic type is strictly for TypeScript meta programming.
   */
  // NOTE: the _T is for only for typescript meta
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type KeyedReference<_T> = {
    _type: 'reference';
    _key: string;
    _ref: string;
  };

  /**
   * Assets in Sanity follow the same structure as references however
   * the string in _ref can be formatted differently than a document.
   */
  type Asset = Reference<any>;

  interface Image {
    asset: Sanity.Asset;
  }

  interface File {
    asset: Sanity.Asset;
  }

  interface Geopoint {
    _type: 'geopoint';
    lat: number;
    lng: number;
    alt: number;
  }

  // TODO: include things like markdefs
  interface Block {
    _type: 'block';
    [key: string]: any;
  }

  interface Document {
    _id: string;
    _createdAt: string;
    _rev: string;
    _updatedAt: string;
  }

  interface ImageCrop {
    _type: 'sanity.imageCrop';
    bottom: number;
    left: number;
    right: number;
    top: number;
  }

  interface ImageHotspot {
    _type: 'sanity.imageHotspot';
    height: number;
    width: number;
    x: number;
    y: number;
  }

  type Keyed<T> = T extends object ? T & { _key: string } : T;

  // TODO: possibly move these into a Codegen namespace into the codegen package
  type UndefinedToNull<T> = T extends null | undefined
    ? NonNullable<T> | null
    : NonNullable<T>;

  // TODO: clean up nullable chaining
  type SafeIndexedAccess<
    T extends { [key: string]: any } | null,
    K extends string
  > = T extends NonNullable<T>
    ? T extends any[]
      ? Sanity.SafeIndexedAccess<T[number], K>[]
      : UndefinedToNull<NonNullable<T>[K]>
    : SafeIndexedAccess<NonNullable<T>, K> | null;

  /** like normal extract expect works on array types */
  type MultiExtract<T, U> = T extends any[]
    ? Extract<T[number], U>[]
    : Extract<T, U>;

  type ArrayElementAccess<T extends any[]> = T[number] | null;

  type ReferenceType<T> = T extends NonNullable<T>
    ? T extends any[]
      ? ReferenceType<T[number]>[]
      : T extends Sanity.Reference<infer U>
      ? UndefinedToNull<U>
      : never
    : ReferenceType<NonNullable<T>> | null;

  type ObjectMap<
    Scope,
    Map extends { [key: string]: any },
    WithSplat extends 'with_splat' | 'without_splat'
  > = Scope extends NonNullable<Scope>
    ? Scope extends any[]
      ? Array<
          {
            [K in keyof Map]: Map[K][number];
          } &
            (WithSplat extends 'with_splat'
              ? Omit<Scope[number], keyof Map>
              : unknown)
        >
      : {
          [K in keyof Map]: Map[K];
        } &
          (WithSplat extends 'with_splat' ? Omit<Scope, keyof Map> : unknown)
    : ObjectMap<NonNullable<Scope>, Map, WithSplat> | null;
}
