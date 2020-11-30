import SanityCodegenClientError from './sanity-codegen-client-error';

interface CreateClientOptions {
  projectId: string;
  dataset: string;
  fetch: WindowOrWorkerGlobalScope['fetch'];
  token?: string;
  previewMode?: boolean;
}

interface SanityResult<T> {
  ms: number;
  query: string;
  result: T[];
}

/**
 * Represents a reference in Sanity to another entity. Note that the
 * generic type is strictly for TypeScript meta programming.
 */
// NOTE: the _T is for only for typescript meta
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Reference<_T> = {
  _type: 'reference';
  _key?: string;
  _ref: string;
};

function createClient<Documents extends { _type: string; _id: string }>({
  dataset,
  projectId,
  token,
  previewMode = false,
  fetch,
}: CreateClientOptions) {
  async function jsonFetch<T>(url: RequestInfo, options?: RequestInit) {
    const response = await (async () => {
      try {
        const response = await fetch(url, options);
        if (options?.signal?.aborted) {
          throw new SanityCodegenClientError('aborted');
        }
        return response;
      } catch (e) {
        throw new SanityCodegenClientError('network', e, e);
      }
    })();

    if (!response.ok) {
      throw new SanityCodegenClientError('not-okay', await response.text());
    }

    try {
      return (await response.json()) as T;
    } catch (e) {
      throw new SanityCodegenClientError('json-parse', e, e);
    }
  }

  /**
   * Given a type string and a document ID, this function returns a typed
   * version of that document.
   *
   * If previewMode is true and a token is provided, then the client will prefer
   * drafts over the published version.
   */
  async function get<T extends Documents['_type']>(
    // NOTE: type is exclusively for typescript, it's not actually used in code
    _type: T,
    id: string
  ) {
    type R = Documents & { _type: T };
    const searchParams = new URLSearchParams();
    const preview = previewMode && !!token;
    const previewClause = preview
      ? // sanity creates a new document with an _id prefix of `drafts.`
        // for when a document is edited without being published
        `|| _id=="drafts.${id}"`
      : '';

    searchParams.set('query', `* [_id == "${id}" ${previewClause}]`);
    const response = await jsonFetch<SanityResult<R>>(
      `https://${projectId}.api.sanity.io/v1/data/query/${dataset}?${searchParams.toString()}`,
      {
        // conditionally add the authorization header if the token is present
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      }
    );

    // this will always be undefined in non-preview mode
    const previewDoc = response.result.find((doc) =>
      doc._id.startsWith('drafts.')
    );

    const publishedDoc = response.result.find(
      (doc) => !doc._id.startsWith('drafts.')
    );

    return previewDoc || publishedDoc || null;
  }

  /**
   * Gets all the documents of a particular type. In preview mode, if a document
   * has a draft, that will be returned instead.
   */
  async function getAll<T extends Documents['_type']>(
    type: T,
    filterClause?: string
  ) {
    // force typescript to narrow the type using the intersection.
    // TODO: might be a cleaner way to do this. this creates an ugly lookin type
    type R = { _type: T } & Documents;

    const searchParams = new URLSearchParams();
    const preview = previewMode && !!token;

    searchParams.set(
      'query',
      `* [_type == "${type}"${filterClause ? ` && ${filterClause}` : ''}]`
    );
    const response = await jsonFetch<SanityResult<R>>(
      `https://${projectId}.api.sanity.io/v1/data/query/${dataset}?${searchParams.toString()}`,
      {
        // conditionally add the authorization header if the token is present
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      }
    );

    const prefix = 'drafts.';

    if (!preview) {
      return response.result.filter((doc) => !doc._id.startsWith(prefix));
    }

    const removeDraftPrefix = (_id: string) =>
      _id.startsWith(prefix) ? _id.substring(prefix.length) : _id;

    // create a lookup of only draft docs
    const draftDocs = response.result
      .filter((doc) => doc._id.startsWith('drafts.'))
      .reduce<{ [_id: string]: R }>((acc, next) => {
        acc[removeDraftPrefix(next._id)] = next;
        return acc;
      }, {});

    // in this dictionary, if there is draft doc, that will be preferred,
    // otherwise it'll use the published version
    const finalAcc = response.result.reduce<{ [_id: string]: R }>(
      (acc, next) => {
        const id = removeDraftPrefix(next._id);
        acc[id] = draftDocs[id] || next;
        return acc;
      },
      {}
    );

    return Object.values(finalAcc);
  }

  /**
   * If a sanity document refers to another sanity document, then you can use this
   * function to expand that document, preserving the type
   */
  async function expand<T extends Documents>(ref: Reference<T>) {
    // this function is primarily for typescript
    const response = await get<T['_type']>(null as any, ref._ref);
    // since this is a ref, the response will be defined (unless weak reference)
    return response!;
  }

  return { get, getAll, expand };
}

export default createClient;
