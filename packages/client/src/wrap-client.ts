interface SanityClient {
  fetch: (query: string, params?: any) => Promise<any>;
}

type QueryParams = { [key: string]: any };
type ConditionalIndexAccess<T, U> = U extends keyof T ? T[U] : unknown;

/**
 * Takes in any sanity client that implements the
 * [`fetch`](https://www.sanity.io/docs/js-client#performing-queries) method and
 * returns a configure function. When that configure function is called, a
 * wrapped client with a new method `query` will be returned.
 *
 * The purpose of this function is to decorate an existing sanity client with
 * an API that's compatible with the `@sanity-codegen/groq-codegen`'s query
 * extraction. @see `@sanity-codegen/groq-codegen` for more info.
 *
 * > NOTE: the two separate functions exist as a work around for TypeScript's
 * lack of partial type parameter inference.
 * [See here](https://stackoverflow.com/a/45514257/5776910)
 */
export function wrapClient<Client extends SanityClient>(client: Client) {
  function configureClient<QueryMap extends { [QueryKey: string]: any }>() {
    function query<QueryKey extends string>(
      // the query key is only used for typescript meta programming and is not
      // actually used during runtime
      _queryKey: QueryKey,
      groqQuery: string,
      queryParams?: QueryParams,
    ): Promise<ConditionalIndexAccess<QueryMap, QueryKey>> {
      return client.fetch(groqQuery, queryParams);
    }

    const wrapped = Object.defineProperty(client, 'query', {
      get: () => query,
    }) as Client & {
      query: typeof query;
    };

    return wrapped;
  }

  return configureClient;
}
