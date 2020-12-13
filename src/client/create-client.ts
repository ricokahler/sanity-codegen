import { SanityReference } from '../types';

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

function createClient<Documents extends { _type: string; _id: string }>({
  dataset,
  projectId,
  token,
  previewMode = false,
  fetch,
}: CreateClientOptions) {
  async function jsonFetch<T>(url: RequestInfo, options?: RequestInit) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options?.headers,
      },
    });
    return (await response.json()) as T;
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

    const preview = previewMode && !!token;
    const previewClause = preview
      ? // sanity creates a new document with an _id prefix of `drafts.`
        // for when a document is edited without being published
        `|| _id=="drafts.${id}"`
      : '';

    const result = await query<R>(`* [_id == "${id}" ${previewClause}]`);
    return result[0];
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

    return query<R>(
      `* [_type == "${type}"${filterClause ? ` && ${filterClause}` : ''}]`
    );
  }

  /**
   * If a sanity document refers to another sanity document, then you can use this
   * function to expand that document, preserving the type
   */
  async function expand<T extends Documents>(ref: SanityReference<T>) {
    // this function is primarily for typescript
    const response = await get<T['_type']>(null as any, ref._ref);
    // since this is a ref, the response will be defined (unless weak reference)
    return response!;
  }

  /**
   * Passes a query along to sanity. If preview mode is active and a token is
   * present, it will prefer drafts over the published versions.
   */
  async function query<T extends { _id: string } = any>(
    query: string
  ): Promise<T[]> {
    const searchParams = new URLSearchParams();
    const preview = previewMode && !!token;

    searchParams.set('query', query);
    const response = await jsonFetch<SanityResult<T>>(
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
      .reduce<{ [_id: string]: T }>((acc, next) => {
        acc[removeDraftPrefix(next._id)] = next;
        return acc;
      }, {});

    // in this dictionary, if there is draft doc, that will be preferred,
    // otherwise it'll use the published version
    const finalAcc = response.result.reduce<{ [_id: string]: T }>(
      (acc, next) => {
        const id = removeDraftPrefix(next._id);
        acc[id] = draftDocs[id] || next;
        return acc;
      },
      {}
    );

    return Object.values(finalAcc);
  }

  return { get, getAll, expand, query };
}

export default createClient;
