import { groq } from './groq';

describe('groq', () => {
  it('spits out the same string', () => {
    const result = groq`hello`;

    expect(result).toBe('hello');
  });
});
