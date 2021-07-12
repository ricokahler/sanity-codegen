import * as t from '@babel/types';

export interface TransformStructureToTsOptions {
  structure: Sanity.GroqCodegen.StructureNode;
}

export function transformStructureToTs({
  structure,
}: TransformStructureToTsOptions) {
  const visited = new Set<string>();
  const aliasTypes = new Map<string, t.TSType>();

  const next = (node: Sanity.GroqCodegen.StructureNode) => {
    const nodeId = getId(node);

    if (aliasTypes.has(nodeId)) {
      return t.tsTypeReference(t.identifier(nodeId));
    }

    if (visited.has(nodeId)) {
      aliasTypes.set(nodeId, createAlias(node));
      return t.tsTypeReference(t.identifier(nodeId));
    }

    if (node.type === 'Lazy') {
      visited.add(nodeId);
    }

    return transform(node, next);
  };

  return {
    query: next(structure),
    references: Object.fromEntries(
      Array.from(aliasTypes).map(([k, v]) => [k, v]),
    ),
  };
}

/**
 * Internal transform function that takes in a `StructureNode` and a `next`
 * function and returns a `TSType`.
 *
 * The `next` function is used to intercept the traversal and return different
 * `TSType`s depending on the context
 */
function transform(
  node: Sanity.GroqCodegen.StructureNode,
  next: (node: Sanity.GroqCodegen.StructureNode) => t.TSType,
): t.TSType {
  let tsType: t.TSType;

  switch (node.type) {
    case 'And': {
      tsType = t.tsIntersectionType(node.children.map(next));
      break;
    }
    case 'Boolean': {
      tsType = t.tsBooleanKeyword();
      break;
    }
    case 'Intrinsic': {
      // TODO:
      tsType = t.tsUnknownKeyword();
      break;
    }
    case 'Number': {
      tsType = t.tsNumberKeyword();
      break;
    }
    case 'Object': {
      tsType = t.tsTypeLiteral(
        node.properties.map(({ key, value }) =>
          t.tsPropertySignature(
            t.stringLiteral(key),
            t.tsTypeAnnotation(next(value)),
          ),
        ),
      );
      break;
    }
    case 'Or': {
      tsType = t.tsUnionType(node.children.map(next));
      break;
    }
    case 'String': {
      tsType = node.value
        ? t.tsLiteralType(t.stringLiteral(node.value))
        : t.tsStringKeyword();
      break;
    }
    case 'Unknown': {
      tsType = t.tsUnknownKeyword();
      break;
    }
    case 'Lazy': {
      tsType = next(node.get());
      break;
    }
    case 'Reference': {
      tsType = t.tsTypeReference(
        t.tsQualifiedName(t.identifier('Sanity'), t.identifier('Reference')),
        t.tsTypeParameterInstantiation([next(node.to)]),
      );
      break;
    }
    case 'Array': {
      tsType = t.tsArrayType(next(node.of));
      break;
    }
    default: {
      // TODO: better comment
      // @ts-expect-error
      throw new Error(node.type);
    }
  }

  // if ('canBeNull' in node || 'canBeUndefined' in node) {
  //   const types: t.TSType[] = [tsType];
  //   if (node.canBeNull) types.push(t.tsNullKeyword());
  //   if (node.canBeUndefined) types.push(t.tSUndefinedKeyword());
  //   tsType = t.tsUnionType(types);
  // }

  return tsType;
}

const getId = (node: Sanity.GroqCodegen.StructureNode) => `Ref_${node.hash}`;

function createAlias(node: Sanity.GroqCodegen.StructureNode) {
  const visited = new Set<string>();

  const next = (n: Sanity.GroqCodegen.StructureNode) => {
    const nodeId = getId(n);

    if (visited.has(nodeId)) {
      return t.tsTypeReference(t.identifier(nodeId));
    }

    if (n.type === 'Lazy') {
      visited.add(nodeId);
    }

    return transform(n, next);
  };

  return next(node);
}
