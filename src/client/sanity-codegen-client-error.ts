type ErrorType = 'aborted' | 'json-parse' | 'network' | 'not-okay';

/**
 * A simple error type that used throughout the sanity-codegen to throw, catch,
 * and handle errors. Every error requires an `ErrorType` and can optionally
 * take in an untyped "bag" object that downstream catch blocks can use for
 * special errors.
 */
class SanityCodegenClientError extends Error {
  static is(errorType: ErrorType, e: Error): e is SanityCodegenClientError {
    if (e instanceof SanityCodegenClientError) {
      return e.errorType === errorType;
    }

    return false;
  }

  constructor(public errorType: ErrorType, message?: string, public bag?: any) {
    super(`[${errorType}]${message ? `: ${message}` : ''}`);
  }
}

export default SanityCodegenClientError;
