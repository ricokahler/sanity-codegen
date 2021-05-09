/**
 * Simple GROQ template tag that re-exports the string its given. This tag's
 * types does not let you pass in any expressions.
 */
export function groq(strings: TemplateStringsArray, ...values: never[]) {
  return strings.reduce(
    (acc, next, i) => `${acc}${next}${values[i] || ''}`,
    '',
  );
}
