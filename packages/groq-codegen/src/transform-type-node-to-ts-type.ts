import * as t from '@babel/types';
import { hash } from './hash';

/**
 * Internal transform function that takes in a `TypeNode` and a `next` function
 * and returns a `TSType`.
 *
 * The `next` function is used to intercept the traversal and return different
 * `TSType`s depending on the context
 */
function transform(
  node: Sanity.Groq.TypeNode,
  next: (node: Sanity.Groq.TypeNode) => t.TSType,
): t.TSType {
  switch (node.type) {
    case 'And': {
      const tsType = t.tsIntersectionType(node.children.map(next));
      return node.isArray ? t.tsArrayType(tsType) : tsType;
    }
    case 'Boolean': {
      const tsType = t.tsBooleanKeyword();
      return node.isArray ? t.tsArrayType(tsType) : tsType;
    }
    case 'Intrinsic': {
      // TODO:
      const tsType = t.tsUnknownKeyword();
      return node.isArray ? t.tsArrayType(tsType) : tsType;
    }
    case 'Number': {
      const tsType = t.tsNumberKeyword();
      return node.isArray ? t.tsArrayType(tsType) : tsType;
    }
    case 'Object': {
      const tsType = t.tsTypeLiteral(
        node.properties.map(({ key, value }) =>
          t.tsPropertySignature(
            t.stringLiteral(key),
            t.tsTypeAnnotation(next(value)),
          ),
        ),
      );
      return node.isArray ? t.tsArrayType(tsType) : tsType;
    }
    case 'Or': {
      const tsType = t.tsUnionType(node.children.map(next));
      return node.isArray ? t.tsArrayType(tsType) : tsType;
    }
    case 'String': {
      const tsType = node.value
        ? t.tsLiteralType(t.stringLiteral(node.value))
        : t.tsStringKeyword();
      return node.isArray ? t.tsArrayType(tsType) : tsType;
    }
    case 'Unknown': {
      const tsType = t.tsUnknownKeyword();
      return node.isArray ? t.tsArrayType(tsType) : tsType;
    }
    case 'Alias': {
      const tsType = next(node.get());
      return node.isArray ? t.tsArrayType(tsType) : tsType;
    }
    case 'Reference': {
      const tsType = t.tsTypeReference(
        t.tsQualifiedName(t.identifier('Sanity'), t.identifier('Reference')),
        t.tsTypeParameterInstantiation([next(node.to)]),
      );
      return node.isArray ? t.tsArrayType(tsType) : tsType;
    }
    default: {
      // TODO: better comment
      // @ts-expect-error
      throw new Error(node.type);
    }
  }
}

const idMap = new Map<Sanity.Groq.TypeNode, string>();

function getId(node: Sanity.Groq.TypeNode) {
  if (idMap.has(node)) return idMap.get(node)!;
  const id = `Ref_${hash(node)}`;
  idMap.set(node, id);
  return id;
}

function createAlias(node: Sanity.Groq.TypeNode) {
  const visited = new Set<Sanity.Groq.TypeNode>();

  const next = (n: Sanity.Groq.TypeNode) => {
    if (visited.has(n)) return t.tsTypeReference(t.identifier(getId(n)));
    visited.add(n);
    return transform(n, next);
  };

  return next(node);
}

export function transformTypeNodeToTsType(node: Sanity.Groq.TypeNode) {
  const visited = new Set<Sanity.Groq.TypeNode>();
  const aliasTypes = new Map<Sanity.Groq.TypeNode, t.TSType>();

  const next = (n: Sanity.Groq.TypeNode) => {
    if (aliasTypes.has(n)) return t.tsTypeReference(t.identifier(getId(n)));

    if (visited.has(n)) {
      aliasTypes.set(n, createAlias(n));
      return t.tsTypeReference(t.identifier(getId(n)));
    }

    visited.add(n);
    return transform(n, next);
  };

  return {
    query: next(node),
    references: Object.fromEntries(
      Array.from(aliasTypes).map(([k, v]) => [getId(k), v]),
    ),
  };
}
