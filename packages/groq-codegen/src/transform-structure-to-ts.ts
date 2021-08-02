import * as t from '@babel/types';
import { isStructureOptional, removeOptional } from './utils';

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

      case 'Object': {
        for (const property of node.properties) {
          if (isStructureOptional(property.value)) {
            // this alteration is due to how the transform function below works.
            // if inside an object, a value is found to be optional, the
            // transform removes the optional value and marks the current
            // property as optional instead. this alteration in the tree needs
            // to be accounted for when finding all the lazy nodes
            traverse(removeOptional(property.value));
            continue;
          }

          traverse(property.value);
        }
        return;
      }
      case 'Array': {
        // same comment as above
        if (isStructureOptional(node.of)) {
          traverse(removeOptional(node.of));
          return;
        }

        traverse(node.of);
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
      tsType = t.tsIntersectionType(
        node.children
          .sort((a, b) => a.hash.localeCompare(b.hash, 'en'))
          .map(next),
      );
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
        node.properties
          .sort((a, b) => a.key.localeCompare(b.key, 'en'))
          .map(({ key, value }) => {
            const valueIsOptional = isStructureOptional(value);

            const propertySignature = t.tsPropertySignature(
              t.stringLiteral(key),
              t.tsTypeAnnotation(
                next(valueIsOptional ? removeOptional(value) : value),
              ),
            );

            propertySignature.optional = valueIsOptional;

            return propertySignature;
          }),
      );
      break;
    }
    case 'Or': {
      tsType = t.tsUnionType(
        node.children
          .sort((a, b) => a.hash.localeCompare(b.hash, 'en'))
          .map(next),
      );
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
      tsType = t.tsArrayType(
        next(isStructureOptional(node.of) ? removeOptional(node.of) : node.of),
      );
      break;
    }
    case 'Tuple': {
      tsType = t.tsTupleType(node.elements.map(next));
      break;
    }
    default: {
      // TODO: better comment
      // @ts-expect-error
      throw new Error(node.type);
    }
  }

  if ('canBeNull' in node || 'canBeOptional' in node) {
    const types: t.TSType[] = [tsType];
    if (node.canBeNull) types.push(t.tsNullKeyword());
    if (node.canBeOptional) types.push(t.tsUndefinedKeyword());
    tsType = t.tsUnionType(types);
  }

  return tsType;
}

export interface TransformStructureToTsOptions {
  /**
   * The input `StructureNode` to be converted to a `TSType`
   */
  structure: Sanity.GroqCodegen.StructureNode;
}

/**
 * Takes in a `StructureNode` and returns an object with the resulting main
 * the type, `query`, as well as any named references created (necessary when
 * the schema has self-reference). Those references are stored in an object
 * keyed by that node's hash.
 *
 * The resulting `TSType`s can be printed to source code via `@babel/generator`.
 *
 * @see `generateGroqTypes` for a reference implementation
 */
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
