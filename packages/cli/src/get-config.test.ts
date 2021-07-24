import path from 'path';
import { getConfig } from './get-config';

describe('getConfig', () => {
  it('takes in CLI flags and returns a resolve config, root, babelrcPath, and babelOptions', async () => {
    const { babelOptions, babelrcPath, root, config } = await getConfig({
      flags: {
        configPath: require.resolve(
          './__example-folders__/example-config-folder/example-config',
        ),
      },
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
  });
});
