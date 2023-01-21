/**
 * Simple GROQ template tag that re-exports the string its given. This tag's
 * types does only lets you pass in strings or numbers.
 *
 * Note: for the query extraction to work, try not to put in expressions in that
 * need to be evaluated. The query extractor is a static extractor meaning that
 * it has to pull the query out without running the code.
 *
 * See the @sanity-codegen/core README for more info.
 */
export function groq(
  strings: TemplateStringsArray,
  ...values: Array<string | number>
) {
  return strings.reduce(
    (acc, next, i) => `${acc}${next}${values[i] || ''}`,
    '',
  );
}
