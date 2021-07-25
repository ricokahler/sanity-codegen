import { schemaNormalizer } from '@sanity-codegen/schema-codegen';
import { transformSchemaToStructure } from '../transform-schema-to-structure';
import { createStructure } from './create-structure';
import { unwrapReferences } from './unwrap-references';

describe('unwrapReferences', () => {
  it('takes in a reference structure and returns a structure where that reference points to', () => {
    const normalizedSchema = schemaNormalizer([
      {
        name: 'book',
        type: 'document',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'author', type: 'reference', to: [{ type: 'author' }] },
        ],
      },
      {
        name: 'author',
        type: 'document',
        fields: [{ name: 'name', type: 'string' }],
      },
    ]);

    const everything = transformSchemaToStructure({
      normalizedSchema,
    }) as Sanity.GroqCodegen.ArrayNode;

    const bookNode = (everything.of as Sanity.GroqCodegen.OrNode).children.find(
      (child): child is Sanity.GroqCodegen.ObjectNode =>
        child.type === 'Object' &&
        child.properties.some(
          (prop) =>
            prop.key === '_type' &&
            prop.value.type === 'String' &&
            prop.value.value === 'book',
        ),
    )!;

    const referenceNode = bookNode.properties.find(
      (prop) => prop.key === 'author',
    )?.value as Sanity.GroqCodegen.ReferenceNode;

    const unwrappedReference = unwrapReferences(referenceNode);
    expect(unwrappedReference).toMatchObject({
      type: 'Or',
      children: [
        {
          type: 'Object',
          properties: [
            { key: '_type', value: { value: 'author' } },
            { key: '_id', value: { type: 'String' } },
            { key: 'name', value: { type: 'String' } },
          ],
        },
      ],
    });
  });

  it('takes in a reference structure nested in groups and returns it unwrapped', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    const andStructure = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'Lazy',
          get: () => stringStructure,
          hashInput: ['Lazy', stringStructure.hash],
        }),
      ],
    });

    const referenceStructure = createStructure({
      type: 'Reference',
      canBeNull: false,
      canBeOptional: false,
      to: andStructure,
    });

    const orStructure = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'And',
          children: [referenceStructure],
        }),
      ],
    });

    const lazyStructure = createStructure({
      type: 'Lazy',
      get: () => orStructure,
      hashInput: ['Testing', orStructure.hash],
    });

    const unwrapped = unwrapReferences(
      lazyStructure,
    ) as Sanity.GroqCodegen.LazyNode;
    expect(unwrapped.get()).toMatchObject({
      type: 'Or',
      children: [
        {
          type: 'And',
          children: [{ type: 'And', children: [{ type: 'String' }] }],
        },
      ],
    });
  });

  it('returns the original node if a reference structure is not found', () => {
    const stringStructure = createStructure({
      type: 'String',
      canBeNull: false,
      canBeOptional: false,
      value: null,
    });

    const unwrapped = unwrapReferences(stringStructure);
    expect(unwrapped).toMatchObject({ type: 'String' });
  });
});
