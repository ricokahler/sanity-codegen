import createClient from './create-client';

describe('get', () => {
  it('gets one document from the sanity instance', async () => {
    const mockDoc = {
      _createdAt: '2020-10-24T03:00:29Z',
      _id: 'settings',
      _rev: 'XoaOTvah7ZFSBIsJK8Ahfx',
      _type: 'settings',
      _updatedAt: '2020-10-24T03:04:54Z',
    };

    const mockFetch: any = jest.fn(() => ({
      ok: true,
      json: () => Promise.resolve({ result: [mockDoc] }),
    }));

    const sanity = createClient({
      projectId: 'test-project-id',
      dataset: 'test-dataset',
      fetch: mockFetch,
    });

    const doc = await sanity.get('settings', 'settings');

    expect(doc).toBe(mockDoc);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://test-project-id.api.sanity.io/v1/data/query/test-dataset?query=*+%5B_id+%3D%3D+%22settings%22+%5D",
        Object {
          "headers": Object {
            "Accept": "application/json",
          },
        },
      ]
    `);
  });

  it('returns a draft doc if in preview mode', async () => {
    const mockDoc = {
      _createdAt: '2020-10-24T03:00:29Z',
      _id: 'settings',
      _rev: 'XoaOTvah7ZFSBIsJK8Ahfx',
      _type: 'settings',
      _updatedAt: '2020-10-24T03:04:54Z',
    };
    const mockDraftDoc = {
      _createdAt: '2020-10-24T03:00:29Z',
      _id: 'drafts.settings',
      _rev: 'XoaOTvah7ZFSBIsJK8Ahfx',
      _type: 'settings',
      _updatedAt: '2020-10-24T03:04:54Z',
    };

    const mockFetch: any = jest.fn(() => ({
      ok: true,
      json: () => Promise.resolve({ result: [mockDoc, mockDraftDoc] }),
    }));

    const sanity = createClient({
      projectId: 'test-project-id',
      dataset: 'test-dataset',
      fetch: mockFetch,
      previewMode: true,
      token: 'test-token',
    });

    const doc = await sanity.get('settings', 'settings');

    expect(doc).toBe(mockDraftDoc);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://test-project-id.api.sanity.io/v1/data/query/test-dataset?query=*+%5B_id+%3D%3D+%22settings%22+%7C%7C+_id%3D%3D%22drafts.settings%22%5D",
        Object {
          "headers": Object {
            "Accept": "application/json",
            "Authorization": "Bearer test-token",
          },
        },
      ]
    `);
  });
});

describe('getAll', () => {
  it('returns all the documents of a particular type', async () => {
    const postOne = {
      _createdAt: '2020-10-24T03:00:29Z',
      _id: 'post-one',
      _rev: 'rev',
      _type: 'post',
      _updatedAt: '2020-10-24T03:04:54Z',
    };
    const postTwo = {
      _createdAt: '2020-10-24T03:00:29Z',
      _id: 'post-two',
      _rev: 'rev',
      _type: 'post',
      _updatedAt: '2020-10-24T03:04:54Z',
    };
    const postTwoDraft = {
      _createdAt: '2020-10-24T03:00:29Z',
      _id: 'drafts.post-two',
      _rev: 'rev',
      _type: 'post',
      _updatedAt: '2020-10-24T03:04:54Z',
    };

    const mockFetch: any = jest.fn(() => ({
      ok: true,
      json: () => Promise.resolve({ result: [postOne, postTwo, postTwoDraft] }),
    }));

    const sanity = createClient({
      projectId: 'test-project-id',
      dataset: 'test-dataset',
      fetch: mockFetch,
    });
    const docs = await sanity.getAll('post');

    expect(docs).toEqual([postOne, postTwo]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://test-project-id.api.sanity.io/v1/data/query/test-dataset?query=*+%5B_type+%3D%3D+%22post%22%5D",
        Object {
          "headers": Object {
            "Accept": "application/json",
          },
        },
      ]
    `);
  });

  it('prefers draft documents in preview mode', async () => {
    const postOne = {
      _createdAt: '2020-10-24T03:00:29Z',
      _id: 'post-one',
      _rev: 'rev',
      _type: 'post',
      _updatedAt: '2020-10-24T03:04:54Z',
    };
    const postTwo = {
      _createdAt: '2020-10-24T03:00:29Z',
      _id: 'post-two',
      _rev: 'rev',
      _type: 'post',
      _updatedAt: '2020-10-24T03:04:54Z',
    };
    const postTwoDraft = {
      _createdAt: '2020-10-24T03:00:29Z',
      _id: 'drafts.post-two',
      _rev: 'rev',
      _type: 'post',
      _updatedAt: '2020-10-24T03:04:54Z',
    };

    const mockFetch: any = jest.fn(() => ({
      ok: true,
      json: () => Promise.resolve({ result: [postOne, postTwo, postTwoDraft] }),
    }));

    const sanity = createClient({
      projectId: 'test-project-id',
      dataset: 'test-dataset',
      fetch: mockFetch,
      previewMode: true,
      token: 'test-token',
    });

    const docs = await sanity.getAll('post');

    expect(docs).toEqual([postOne, postTwoDraft]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://test-project-id.api.sanity.io/v1/data/query/test-dataset?query=*+%5B_type+%3D%3D+%22post%22%5D",
        Object {
          "headers": Object {
            "Accept": "application/json",
            "Authorization": "Bearer test-token",
          },
        },
      ]
    `);
  });
});

describe('expand', () => {
  it('calls get with a ref id', async () => {
    const mockDoc = {
      _createdAt: '2020-10-24T03:00:29Z',
      _id: 'settings',
      _rev: 'XoaOTvah7ZFSBIsJK8Ahfx',
      _type: 'settings',
      _updatedAt: '2020-10-24T03:04:54Z',
    };

    const mockFetch: any = jest.fn(() => ({
      ok: true,
      json: () => Promise.resolve({ result: [mockDoc] }),
    }));

    const sanity = createClient({
      projectId: 'test-project-id',
      dataset: 'test-dataset',
      fetch: mockFetch,
    });

    const mockRef = {
      _ref: 'settings',
      _type: 'reference' as 'reference',
      _key: '-',
    };

    const doc = await sanity.expand(mockRef);

    expect(doc).toBe(mockDoc);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://test-project-id.api.sanity.io/v1/data/query/test-dataset?query=*+%5B_id+%3D%3D+%22settings%22+%5D",
        Object {
          "headers": Object {
            "Accept": "application/json",
          },
        },
      ]
    `);
  });
});
