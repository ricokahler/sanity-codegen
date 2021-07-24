import path from 'path';
import { fileWalker } from './file-walker';
import { SanityCodegenConfig } from './types';

interface GetSchemaPathOptions {
  config: SanityCodegenConfig | null;
  args: { schemaPath?: string };
  root: string;
}

export async function getSchemaPath({
  config,
  args,
  root,
}: GetSchemaPathOptions) {
  if (args.schemaPath) {
    try {
      return require.resolve(path.resolve(process.cwd(), args.schemaPath));
    } catch {
      throw new Error(
        `Could not resolve \`schemaPath\` "${args.schemaPath}" provided via CLI args.`,
      );
    }
  }

  if (config?.schemaPath) {
    try {
      return require.resolve(path.resolve(process.cwd(), config.schemaPath));
    } catch {
      throw new Error(
        `Could not resolve \`schemaPath\` "${config.schemaPath}" provided via the config.`,
      );
    }
  }

  const sanityJsonPath = await fileWalker({
    filenameIfNotFound: 'sanity.json',
    startingPoint: root,
  });

  if (!sanityJsonPath) {
    throw new Error(
      `Failed to find schemaPath. No schemaPath was provided through CLI args, ` +
        `configs, and no sanity.json was found.`,
    );
  }

  try {
    const sanityJson: unknown = require(sanityJsonPath);

    if (typeof sanityJson !== 'object' || !sanityJson) {
      throw new Error(
        `Expected type of sanity.json to be an object but found "${
          !sanityJson ? 'null' : typeof sanityJson
        }" instead.`,
      );
    }

    // no parts in sanity.json
    if (!('parts' in sanityJson)) {
      throw new Error(`Sanity.json `);
    }

    const parts = (sanityJson as any).parts;

    // parts is not an array
    if (!Array.isArray(parts)) {
      throw new Error(
        `Expected \`parts\` in sanity.json to be an Array but found "${typeof parts}" instead.`,
      );
    }

    // parts doesn't contain `part:@sanity/base/schema`
    const schemaPart = parts.find(
      (part) => part.name === 'part:@sanity/base/schema',
    );
    if (!schemaPart) {
      throw new Error(
        `Could not find schema part "part:@sanity/base/schema" in sanity.json.`,
      );
    }

    return require.resolve(
      path.resolve(path.dirname(sanityJsonPath), schemaPart.path),
    );
  } catch (e) {
    throw new Error(
      'Failed to get schema path from `sanity.json`. ' +
        'Please fix your sanity.json or provide the schemaPath via CLI args or the config. Error: ' +
        e.message,
    );
  }
}
