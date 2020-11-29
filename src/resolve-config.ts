import fs from 'fs';
import path from 'path';

// Note: @babel/register must be hooked prior to this file running because this
// resolving method uses `require.resolve`.
async function resolveConfig() {
  // this path can either be the direct path to the config or a path to a
  // directory. If it's a directory we'll walk up the file system checking for
  // `sanity-codegen.config.js` or `sanity-codegen.config.ts`
  const configContextPath = process.argv[2] || process.cwd();

  // if direct path then return it
  if (fs.existsSync(configContextPath)) {
    const stat = await fs.promises.stat(configContextPath);
    if (!stat.isDirectory()) {
      return configContextPath;
    }
  }

  // otherwise walk up the tree
  async function findConfig(configPath: string): Promise<string | null> {
    try {
      return require.resolve(`${configPath}/sanity-codegen.config`);
    } catch {
      const currentFolder = path.resolve('./', configPath);
      const parentFolder = path.resolve('../', configPath);

      if (currentFolder === parentFolder) {
        return null;
      }

      return await findConfig(parentFolder);
    }
  }

  return await findConfig(configContextPath);
}

export default resolveConfig;
