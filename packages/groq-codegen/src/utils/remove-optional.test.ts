import { createStructure } from './create-structure';
import { removeOptional } from './remove-optional';

describe('removeOptional', () => {
  it('traverses the given structure and marks all leaf nodes with `canBeOptional: false`', () => {
    const structure = createStructure({
      type: 'And',
      children: [
        createStructure({ type: 'Unknown' }),
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeOptional: true,
          value: null,
        }),
        createStructure({
          type: 'Or',
          children: [
            createStructure({
              type: 'Number',
              canBeNull: false,
              canBeOptional: true,
              value: null,
            }),
          ],
        }),
      ],
    });

    expect(removeOptional(structure)).toMatchObject({
      type: 'And',
      children: [
        { type: 'Unknown' },
        { type: 'String', canBeOptional: false },
        {
          type: 'Or',
          children: [{ type: 'Number', canBeOptional: false }],
        },
      ],
    });
  });

  it('has a Lazy implementation with a consistent hash', () => {
    const selfReferencingStructure = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'Lazy',
          get: () => selfReferencingStructure,
          hashInput: ['self', 'referencing', 'structure'],
        }),
      ],
    });

    const result = removeOptional(
      selfReferencingStructure,
    ) as Sanity.GroqCodegen.AndNode;
    const lazy1 = result.children[0] as Sanity.GroqCodegen.LazyNode;
    const pull1 = lazy1.get() as Sanity.GroqCodegen.AndNode;
    const lazy2 = pull1.children[0] as Sanity.GroqCodegen.LazyNode;
    const pull2 = lazy2.get() as Sanity.GroqCodegen.AndNode;

    expect(result.hash).toMatchInlineSnapshot(`"1kje9yc"`);
    expect(pull1.hash).toBe(result.hash);
    expect(pull1.hash).toBe(pull2.hash);
  });
});
