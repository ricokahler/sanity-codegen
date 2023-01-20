export function defaultGenerateTypeName(sanityTypeName: string) {
  const typeName = `${sanityTypeName
    .substring(0, 1)
    .toUpperCase()}${sanityTypeName
    // If using snake_case, remove underscores and convert to uppercase the letter following them.
    .replace(/(_[A-Z])/gi, (replace) => replace.substring(1).toUpperCase())
    .replace(/(-[A-Z])/gi, (replace) => replace.substring(1).toUpperCase())
    .replace(/(\.[A-Z])/gi, (replace) => replace.substring(1).toUpperCase())
    .substring(1)}`;

  return typeName;
}
