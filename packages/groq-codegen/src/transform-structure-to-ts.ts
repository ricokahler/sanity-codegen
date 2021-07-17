import * as t from '@babel/types';

const getId = (node: Sanity.GroqCodegen.StructureNode) => `Ref_${node.hash}`;

function findAllLazyNodes(structure: Sanity.GroqCodegen.StructureNode) {
  const lazyNodes = new Map<string, Sanity.GroqCodegen.StructureNode>();

  function traverse(node: Sanity.GroqCodegen.StructureNode) {
    switch (node.type) {
      case 'Lazy': {
        if (lazyNodes.has(getId(node))) return;

        lazyNodes.set(getId(node), node);
        traverse(node.get());
        return;
      }
      case 'And':
      case 'Or': {
        for (const child of node.children) {
          traverse(child);
        }
        return;
      }
      case 'Array': {
        traverse(node.of);
        return;
      }
      case 'Object': {
        for (const property of node.properties) {
          traverse(property.value);
        }
        return;
      }
      case 'Reference': {
        traverse(node.to);
        return;
      }
    }
  }

  traverse(structure);

  return lazyNodes;
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

  // if ('canBeNull' in node || 'canBeOptional' in node) {
  //   const types: t.TSType[] = [tsType];
  //   if (node.canBeNull) types.push(t.tsNullKeyword());
  //   if (node.canBeOptional) types.push(t.tsUndefinedKeyword());
  //   tsType = t.tsUnionType(types);
  // }

  return tsType;
}

export interface TransformStructureToTsOptions {
  structure: Sanity.GroqCodegen.StructureNode;
}

export function transformStructureToTs({
  structure,
}: TransformStructureToTsOptions) {
  const lazyNodes = findAllLazyNodes(structure);

  const createAlias = (node: Sanity.GroqCodegen.StructureNode) => {
    const next = (n: Sanity.GroqCodegen.StructureNode) => {
      if (lazyNodes.has(getId(n))) {
        return t.tsTypeReference(t.identifier(getId(n)));
      }

      return transform(n, next);
    };

    // purposefully run the transform first before `next`
    return transform(node, next);
  };

  const aliasTypes = new Map(
    Array.from(lazyNodes.values()).map((lazyNode) => [
      getId(lazyNode),
      createAlias(lazyNode),
    ]),
  );

  const next = (node: Sanity.GroqCodegen.StructureNode) => {
    if (aliasTypes.has(getId(node))) {
      return t.tsTypeReference(t.identifier(getId(node)));
    }

    return transform(node, next);
  };

  return {
    query: next(structure),
    references: Object.fromEntries(Array.from(aliasTypes)),
  };
}
