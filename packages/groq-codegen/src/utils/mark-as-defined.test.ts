import { createStructure } from './create-structure';
import { markAsDefined } from './mark-as-defined';

describe('markAsDefined', () => {
  it('traverses the given structure and marks all leaf nodes with `canBeUndefined: false`', () => {
    const structure = createStructure({
      type: 'And',
      children: [
        createStructure({ type: 'Unknown' }),
        createStructure({
          type: 'String',
          canBeNull: false,
          canBeUndefined: true,
          value: null,
        }),
        createStructure({
          type: 'Or',
          children: [
            createStructure({
              type: 'Number',
              canBeNull: false,
              canBeUndefined: true,
              value: null,
            }),
          ],
        }),
      ],
    });

    expect(markAsDefined(structure)).toMatchObject({
      type: 'And',
      children: [
        { type: 'Unknown' },
        { type: 'String', canBeUndefined: false },
        {
          type: 'Or',
          children: [{ type: 'Number', canBeUndefined: false }],
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

    const result = markAsDefined(
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
