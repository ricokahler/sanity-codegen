import path from 'path';
import { getConfig } from './get-config';

describe('getConfig', () => {
  it('takes in CLI flags and returns a resolve config, root, babelrcPath, and babelOptions', async () => {
    const mockLog = jest.fn();
    const { babelOptions, babelrcPath, root, config } = await getConfig({
      flags: {
        configPath: require.resolve(
          './__example-folders__/example-config-folder/example-config',
        ),
      },
      log: mockLog,
    });

    // the root returns as an absolute path based on the root value in the
    // config (defaulting to process.cwd())
    expect(path.relative(__dirname, root)).toMatchInlineSnapshot(
      `"__example-folders__"`,
    );
    // the babelrcPath also returns as an absolute path, resolving based on the
    // root, babelrcPath from flags, and the babelrcPath from the config
    expect(path.relative(__dirname, babelrcPath!)).toMatchInlineSnapshot(
      `"__example-folders__/example-config-folder/example-babelrc.js"`,
    );

    const myPlugin = (babelOptions.plugins as string[]).find((p) =>
      p.includes('custom-plugin'),
    );

    expect(myPlugin).toBeDefined();
    expect(config).toBeDefined();

    expect(
      mockLog.mock.calls
        .map((call) => call[0])
        .map((message: string) => message.replace(/:\s[\w/\\.-]+/g, ' <PATH>')),
    ).toMatchInlineSnapshot(`
      Array [
        "Using sanity-codegen config found at <PATH>",
        "Using babelrc config found at <PATH>",
      ]
    `);
  });
});
