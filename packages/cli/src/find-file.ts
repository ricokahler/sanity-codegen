import fs from 'fs';
import path from 'path';

// Note: @babel/register must be hooked prior to this file running because this
// resolving method uses `require.resolve`.
export async function findFile(filename: string, startingPath?: string) {
  // if direct path then return it
  if (startingPath && fs.existsSync(startingPath)) {
    const stat = await fs.promises.stat(startingPath);
    if (!stat.isDirectory()) {
      return startingPath;
    }
  }

  // otherwise walk up the tree
  async function findConfig(configPath: string): Promise<string | null> {
    try {
      return require.resolve(`${configPath}/${filename}`);
    } catch {
      const currentFolder = path.resolve('./', configPath);
      const parentFolder = path.resolve('../', configPath);

      if (currentFolder === parentFolder) {
        return null;
      }

      return await findConfig(parentFolder);
    }
  }

  return await findConfig(startingPath || process.cwd());
}
