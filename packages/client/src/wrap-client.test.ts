import { wrapClient } from './wrap-client';

describe('wrapClient', () => {
  it('returns a curried function that returns an augmented client', () => {
    const mockClient = {
      foo: () => 'bar',
      fetch: jest.fn(),
    };

    // @ts-expect-error
    expect(typeof mockClient.query).toBe('undefined');

    const configureClient = wrapClient(mockClient);
    const typedClient = configureClient();

    expect(typeof typedClient.query).toBe('function');
    expect(typeof typedClient.foo).toBe('function');
  });
});
