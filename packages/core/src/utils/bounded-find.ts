/**
 * hi-jacks throws for better control flow inside of babel's traversals
 */
export function boundedFind<T>(
  boundary: (resolve: (value: T) => never) => void,
): T | null {
  // NOTE: the class is created inside here to prevent conflicts with multiple
  // bounded find's `resolve` functions
  class InstanceTraverseFindError<T> extends Error {
    constructor(public value: T) {
      super();
    }
  }

  try {
    boundary((value) => {
      throw new InstanceTraverseFindError<T>(value);
    });
    return null;
  } catch (e) {
    if (e instanceof InstanceTraverseFindError) return e.value;
    throw e;
  }
}
