import { parse } from 'groq-js';
import { createStructure } from './create-structure';
import {
  narrowStructure,
  accept,
  transformExprNodeToLogicExpr,
} from './narrow-structure';

// TODO: there are a lot of negative paths that are not covered in this suite.
// these behaviors may become more defined as this function evolves though.
describe('transformExprNodeToLogicExpr', () => {
  it('converts a GROQ AST node to a LogicExprNode', () => {
    const result = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));
    expect(result).toMatchObject({
      type: 'SingleVariableEquality',
      variable: '_type',
      literal: 'foo',
    });
  });

  it('converts GROQ And expressions', () => {
    const result = transformExprNodeToLogicExpr(
      parse(`_type == 'foo' && title == 'test'`),
    );
    expect(result).toMatchObject({
      type: 'And',
      children: [
        { type: 'SingleVariableEquality', variable: '_type', literal: 'foo' },
        { type: 'SingleVariableEquality', variable: 'title', literal: 'test' },
      ],
    });
  });

  it('converts GROQ Not expressions', () => {
    const result = transformExprNodeToLogicExpr(parse(`!(_type == 'foo')`));
    expect(result).toMatchObject({
      type: 'Not',
      child: {
        type: 'SingleVariableEquality',
        variable: '_type',
        literal: 'foo',
      },
    });
  });

  it('normalizes `a != b` to `!(a == b)`', () => {
    const result = transformExprNodeToLogicExpr(parse(`value != 5`));
    expect(result).toMatchObject({
      type: 'Not',
      child: { type: 'SingleVariableEquality', variable: 'value', literal: 5 },
    });
  });

  it("normalizes `a in ['foo', ...['bar']]` to (a == 'foo' || a == 'bar')", () => {
    const result = transformExprNodeToLogicExpr(
      parse(`a in ['foo', ...['bar']]`),
    );
    expect(result).toMatchObject({
      type: 'Or',
      children: [
        { type: 'SingleVariableEquality', variable: 'a', literal: 'foo' },
        {
          type: 'Or',
          children: [
            { type: 'SingleVariableEquality', variable: 'a', literal: 'bar' },
          ],
        },
      ],
    });
  });

  it('captures literal boolean values', () => {
    const trueLiteral = transformExprNodeToLogicExpr(parse(`true`));
    const falseLiteral = transformExprNodeToLogicExpr(parse(`false`));

    expect(trueLiteral).toMatchObject({ type: 'Literal', value: true });
    expect(falseLiteral).toMatchObject({ type: 'Literal', value: false });
  });

  it('defaults to an unknown expression', () => {
    const result = transformExprNodeToLogicExpr(
      parse(
        // just picking some random function that's not currently supported
        `identity()`,
      ),
    );
    expect(result).toMatchObject({ type: 'UnknownExpression' });
  });

  it.todo('supports single variable equalities stuff where base is present');
  it.todo('works with coalesce/multiple left-hand side conditions');
});

describe('accept', () => {
  it('takes in a structure and condition and returns an acceptance state', () => {
    const objectStructure = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: '_type',
          value: createStructure({
            type: 'String',
            canBeNull: false,
            canBeOptional: false,
            value: 'foo',
          }),
        },
      ],
    });

    const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

    expect(accept(objectStructure, typeIsFoo, new Set())).toBe('yes');
  });

  it('is memoized based on hashes', () => {
    const objectStructure = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: '_type',
          value: createStructure({
            type: 'String',
            canBeNull: false,
            canBeOptional: false,
            value: 'foo',
          }),
        },
      ],
    });

    const mockGet = jest.fn(() => objectStructure);

    const lazyStructure = createStructure({
      type: 'Lazy',
      get: mockGet,
      hashInput: ['LazyNarrowStructureTest', objectStructure.hash],
    });
    const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

    expect(accept(lazyStructure, typeIsFoo, new Set())).toBe('yes');

    for (let i = 0; i < 100; i++) {
      accept(lazyStructure, typeIsFoo, new Set());
    }

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  describe('And conditions', () => {
    it('accepts an And condition if every sub-condition is accepted', () => {
      const objectStructure = createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties: [
          {
            key: 'a',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'foo',
            }),
          },
          {
            key: 'b',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'bar',
            }),
          },
        ],
      });

      const andCondition = transformExprNodeToLogicExpr(
        parse(`a == 'foo' && b == 'bar'`),
      );

      expect(accept(objectStructure, andCondition, new Set())).toBe('yes');
    });

    it('rejects an And condition if one sub-condition is rejected', () => {
      const objectStructure = createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties: [
          {
            key: 'a',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'foo',
            }),
          },
          {
            key: 'b',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'bar',
            }),
          },
        ],
      });

      const andCondition = transformExprNodeToLogicExpr(
        parse(`a == 'foo' && b == 'baz'`),
      );

      expect(accept(objectStructure, andCondition, new Set())).toBe('no');
    });

    it('returns unknown if one sub-condition returns unknown and no sub-conditions returned no', () => {
      const objectStructure = createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties: [
          {
            key: 'a',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'foo',
            }),
          },
        ],
      });

      const andCondition = transformExprNodeToLogicExpr(
        // identity() is an expression that will resolve to an UnknownExpression
        parse(`a == 'foo' && identity()`),
      );

      expect(accept(objectStructure, andCondition, new Set())).toBe('unknown');
    });
  });

  describe('Or conditions', () => {
    it('accepts an Or condition if one sub-condition is accepted', () => {
      const objectStructure = createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties: [
          {
            key: 'a',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'foo',
            }),
          },
          {
            key: 'b',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'bar',
            }),
          },
        ],
      });

      const orCondition = transformExprNodeToLogicExpr(
        parse(`a == 'wrong' || b == 'bar'`),
      );

      expect(accept(objectStructure, orCondition, new Set())).toBe('yes');
    });

    it('rejects an Or condition if every sub-condition is rejected', () => {
      const objectStructure = createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties: [
          {
            key: 'a',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'foo',
            }),
          },
          {
            key: 'b',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'bar',
            }),
          },
        ],
      });

      const orCondition = transformExprNodeToLogicExpr(
        parse(`a == 'wrong' || b == 'baz'`),
      );

      expect(accept(objectStructure, orCondition, new Set())).toBe('no');
    });

    it('returns unknown if one sub-condition returns unknown and no sub-conditions returned yes', () => {
      const objectStructure = createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties: [
          {
            key: 'a',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'foo',
            }),
          },
        ],
      });

      const orCondition = transformExprNodeToLogicExpr(
        // identity() is an expression that will resolve to an UnknownExpression
        parse(`a == 'wrong' || identity()`),
      );

      expect(accept(objectStructure, orCondition, new Set())).toBe('unknown');
    });
  });

  describe('Literal conditions', () => {
    it('returns yes or no when given literal conditions', () => {
      const structure = createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: 'null',
      });
      const trueCondition = transformExprNodeToLogicExpr(parse(`true`));
      const falseCondition = transformExprNodeToLogicExpr(parse(`false`));

      expect(accept(structure, trueCondition, new Set())).toBe('yes');
      expect(accept(structure, falseCondition, new Set())).toBe('no');
    });
  });

  describe('Not conditions', () => {
    it('negates the acceptance when a Not condition is found', () => {
      const structure = createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: 'null',
      });
      const notTrueCondition = transformExprNodeToLogicExpr(parse(`!true`));
      const notFalseCondition = transformExprNodeToLogicExpr(parse(`!false`));
      // `identity()` is an expression that will result is an 'unknown' acceptance
      const unknownCondition = transformExprNodeToLogicExpr(
        parse(`!identity()`),
      );

      expect(accept(structure, notTrueCondition, new Set())).toBe('no');
      expect(accept(structure, notFalseCondition, new Set())).toBe('yes');
      expect(accept(structure, unknownCondition, new Set())).toBe('unknown');
    });
  });

  describe('SingleVariableEquality conditions', () => {
    it('accepts SingleVariableEquality conditions based on objects', () => {
      const objectStructure = createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties: [
          {
            key: '_type',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'foo',
            }),
          },
        ],
      });

      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));
      const typeIsBar = transformExprNodeToLogicExpr(parse(`_type == 'bar'`));

      expect(accept(objectStructure, typeIsFoo, new Set())).toBe('yes');
      expect(accept(objectStructure, typeIsBar, new Set())).toBe('no');
    });

    it('rejects SingleVariableEquality conditions against non-objects', () => {
      const stringStructure = createStructure({
        type: 'String',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      });
      const numberStructure = createStructure({
        type: 'Number',
        canBeNull: false,
        canBeOptional: false,
        value: null,
      });
      const booleanStructure = createStructure({
        type: 'Boolean',
        canBeNull: false,
        canBeOptional: false,
      });
      const arrayStructure = createStructure({
        type: 'Array',
        canBeNull: false,
        canBeOptional: false,
        of: createStructure({
          type: 'Boolean',
          canBeNull: false,
          canBeOptional: false,
        }),
      });

      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

      expect(accept(stringStructure, typeIsFoo, new Set())).toBe('no');
      expect(accept(numberStructure, typeIsFoo, new Set())).toBe('no');
      expect(accept(booleanStructure, typeIsFoo, new Set())).toBe('no');
      expect(accept(arrayStructure, typeIsFoo, new Set())).toBe('no');
    });

    it("returns `unknown` if an object structure doesn't contain a matching property", () => {
      const objectStructure = createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties: [
          {
            key: 'title',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: null,
            }),
          },
        ],
      });

      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

      expect(accept(objectStructure, typeIsFoo, new Set())).toBe('unknown');
    });

    it('returns `unknown` if an `Unknown` structure is found', () => {
      const unknownStructure = createStructure({ type: 'Unknown' });
      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));
      expect(accept(unknownStructure, typeIsFoo, new Set())).toBe('unknown');
    });

    it('accepts an And structure if every child is accepted', () => {
      // note this kind of structure is redundant and is unlikely to appear in
      // real usage
      const andStructure = createStructure({
        type: 'And',
        children: [
          createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
              {
                key: '_type',
                value: createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'foo',
                }),
              },
            ],
          }),
          createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
              {
                key: '_type',
                value: createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'foo',
                }),
              },
            ],
          }),
        ],
      });

      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

      expect(accept(andStructure, typeIsFoo, new Set())).toBe('yes');
    });

    it('rejects an And structure if one child is rejected', () => {
      // note this kind of structure is illogical and is unlikely to appear in
      // real usage
      const andStructure = createStructure({
        type: 'And',
        children: [
          createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
              {
                key: '_type',
                value: createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'bar',
                }),
              },
            ],
          }),
          createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
              {
                key: '_type',
                value: createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'foo',
                }),
              },
            ],
          }),
        ],
      });

      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

      expect(accept(andStructure, typeIsFoo, new Set())).toBe('no');
    });

    it("returns unknown if any of the And structure's children returns unknown", () => {
      const andStructure = createStructure({
        type: 'And',
        children: [
          createStructure({ type: 'Unknown' }),
          createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
              {
                key: '_type',
                value: createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'bar',
                }),
              },
            ],
          }),
        ],
      });

      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

      expect(accept(andStructure, typeIsFoo, new Set())).toBe('unknown');
    });

    it('accepts an Or structure if one child is accepted', () => {
      const orStructure = createStructure({
        type: 'Or',
        children: [
          createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
              {
                key: '_type',
                value: createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'foo',
                }),
              },
            ],
          }),
          createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
              {
                key: '_type',
                value: createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'bar',
                }),
              },
            ],
          }),
        ],
      });

      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

      expect(accept(orStructure, typeIsFoo, new Set())).toBe('yes');
    });

    it('rejects an Or structure if every child is rejected', () => {
      const orStructure = createStructure({
        type: 'Or',
        children: [
          createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
              {
                key: '_type',
                value: createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'bar',
                }),
              },
            ],
          }),
          createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
              {
                key: '_type',
                value: createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'baz',
                }),
              },
            ],
          }),
        ],
      });

      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

      expect(accept(orStructure, typeIsFoo, new Set())).toBe('no');
    });

    it("returns unknown if any of the Or structure's children returns unknown", () => {
      const orStructure = createStructure({
        type: 'Or',
        children: [
          createStructure({ type: 'Unknown' }),
          createStructure({
            type: 'Object',
            canBeNull: false,
            canBeOptional: false,
            properties: [
              {
                key: '_type',
                value: createStructure({
                  type: 'String',
                  canBeNull: false,
                  canBeOptional: false,
                  value: 'bar',
                }),
              },
            ],
          }),
        ],
      });

      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

      expect(accept(orStructure, typeIsFoo, new Set())).toBe('unknown');
    });

    it('works with self-referencing lazy structures', () => {
      const lazyStructure = createStructure({
        type: 'Lazy',
        get: () => objectStructure,
        hashInput: ['NarrowStructureTesting'],
      });
      const objectStructure = createStructure({
        type: 'Object',
        canBeNull: false,
        canBeOptional: false,
        properties: [
          {
            key: '_type',
            value: createStructure({
              type: 'String',
              canBeNull: false,
              canBeOptional: false,
              value: 'foo',
            }),
          },
          {
            key: 'selfReference',
            value: lazyStructure,
          },
        ],
      });

      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

      expect(accept(lazyStructure, typeIsFoo, new Set())).toBe('yes');
    });

    it('rejects if a lazy structure references itself before finding an end state (no infinite loop)', () => {
      const firstLazyStructure = createStructure({
        type: 'Lazy',
        get: () => intermediateLazyStructure,
        hashInput: ['NarrowStructureFirst'],
      });

      const intermediateLazyStructure = createStructure({
        type: 'Lazy',
        get: () => finalLazyStructure,
        hashInput: ['NarrowStructureFirstIntermediate'],
      });

      const finalLazyStructure = createStructure({
        type: 'Lazy',
        get: () => firstLazyStructure,
        hashInput: ['NarrowStructureFirstFinal'],
      });

      const typeIsFoo = transformExprNodeToLogicExpr(parse(`_type == 'foo'`));

      expect(accept(firstLazyStructure, typeIsFoo, new Set())).toBe('no');
    });
  });
});

describe('narrowStructure', () => {
  it('returns a more specific type based on a condition', () => {
    const input = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
            {
              key: '_type',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: 'foo',
              }),
            },
          ],
        }),
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
            {
              key: '_type',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: 'bar',
              }),
            },
          ],
        }),
      ],
    });

    const result = narrowStructure(input, parse(`_type == 'foo'`));
    expect(result).toMatchObject({
      type: 'Or',
      children: [
        {
          type: 'Object',
          properties: [
            { key: '_type', value: { type: 'String', value: 'foo' } },
          ],
        },
      ],
    });
  });

  it('works recursively with `And` and `Or` structures', () => {
    const input = createStructure({
      type: 'And',
      children: [
        createStructure({
          type: 'Or',
          children: [
            createStructure({
              type: 'Object',
              canBeNull: false,
              canBeOptional: false,
              properties: [
                {
                  key: '_type',
                  value: createStructure({
                    type: 'String',
                    canBeNull: false,
                    canBeOptional: false,
                    value: 'foo',
                  }),
                },
              ],
            }),
            createStructure({
              type: 'Object',
              canBeNull: false,
              canBeOptional: false,
              properties: [
                {
                  key: '_type',
                  value: createStructure({
                    type: 'String',
                    canBeNull: false,
                    canBeOptional: false,
                    value: 'bar',
                  }),
                },
              ],
            }),
          ],
        }),
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
            {
              key: 'title',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: null,
              }),
            },
          ],
        }),
      ],
    });

    const result = narrowStructure(input, parse(`_type == 'foo'`));
    expect(result).toMatchObject({
      type: 'And',
      children: [
        {
          type: 'Or',
          children: [
            {
              type: 'Object',
              properties: [
                {
                  key: '_type',
                  value: { type: 'String', value: 'foo' },
                },
              ],
            },
          ],
        },
        {
          type: 'Object',
          properties: [{ key: 'title', value: { type: 'String' } }],
        },
      ],
    });
  });

  it('can narrow on more than one condition via `And` and `Or` GROQ clauses', () => {
    const input = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
            {
              key: '_type',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: 'movie',
              }),
            },
            {
              key: 'x',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: 'foo',
              }),
            },
          ],
        }),
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
            {
              key: '_type',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: 'book',
              }),
            },
            {
              key: 'x',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: 'bar',
              }),
            },
          ],
        }),
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
            {
              key: '_type',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: 'journal',
              }),
            },
          ],
        }),
      ],
    });

    const resultOr = narrowStructure(
      input,
      parse(`_type == 'movie' || _type == 'book'`),
    );
    expect(resultOr).toMatchObject({
      type: 'Or',
      children: [
        {
          type: 'Object',
          properties: [
            { key: '_type', value: { value: 'movie' } },
            { key: 'x', value: { value: 'foo' } },
          ],
        },
        {
          type: 'Object',
          properties: [
            { key: '_type', value: { value: 'book' } },
            { key: 'x', value: { value: 'bar' } },
          ],
        },
      ],
    });

    const resultAnd = narrowStructure(
      input,
      parse(`_type in ['movie', 'book'] && x == 'foo'`),
    );
    expect(resultAnd).toMatchObject({
      type: 'Or',
      children: [
        {
          type: 'Object',
          properties: [
            { key: '_type', value: { value: 'movie' } },
            { key: 'x', value: { value: 'foo' } },
          ],
        },
      ],
    });
  });

  it('works with lazy structures', () => {
    const objectStructure = createStructure({
      type: 'Object',
      canBeNull: false,
      canBeOptional: false,
      properties: [
        {
          key: '_type',
          value: createStructure({
            type: 'String',
            canBeNull: false,
            canBeOptional: false,
            value: 'foo',
          }),
        },
      ],
    });

    const lazyStructure = createStructure({
      type: 'Lazy',
      get: () => objectStructure,
      hashInput: ['NarrowStructureFirstLazy', objectStructure.hash],
    });

    const result = narrowStructure(
      lazyStructure,
      parse(`_type == 'foo'`),
    ) as Sanity.GroqCodegen.LazyNode;
    expect(result.get()).toEqual(objectStructure);
  });

  it('returns unknown if no sub-structure in an Or structure is accepted', () => {
    const input = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
            {
              key: '_type',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: 'foo',
              }),
            },
          ],
        }),
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
            {
              key: '_type',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: 'bar',
              }),
            },
          ],
        }),
      ],
    });

    const result = narrowStructure(input, parse(`_type == 'baz'`));
    expect(result).toMatchObject({ type: 'Unknown' });
  });

  it('will not narrow the structure if the condition was not understood', () => {
    const input = createStructure({
      type: 'Or',
      children: [
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
            {
              key: '_type',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: 'foo',
              }),
            },
          ],
        }),
        createStructure({
          type: 'Object',
          canBeNull: false,
          canBeOptional: false,
          properties: [
            {
              key: '_type',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: 'bar',
              }),
            },
            {
              key: 'date',
              value: createStructure({
                type: 'String',
                canBeNull: false,
                canBeOptional: false,
                value: null,
              }),
            },
          ],
        }),
      ],
    });

    const condition = parse(`defined(date)`);
    const logicExpr = transformExprNodeToLogicExpr(condition);
    expect(logicExpr).toMatchObject({ type: 'UnknownExpression' });

    const result = narrowStructure(input, condition);
    // notice how nothing was narrowed because the condition was an unknown shape
    expect(result).toEqual(input);
  });

  it.todo('utilizes `defined()` to remove nulls and optionals');
  it.todo('(tentative) works with the match operator');
  it.todo(
    '(tentative) adds a string literal value for SingleVariableEquality matches',
  );
  it.todo(
    '(tentative) supports joins references',
    //   *[_type == 'author'] {
    //     // this could know which types will show up here by scanning all
    //     // documents and finding the ones that have a type ref to the parent
    //     'references': *[references(^._id)]
    //   }
  );
});
