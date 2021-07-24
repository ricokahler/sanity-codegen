import { Command, flags } from '@oclif/command';
import * as Parser from '@oclif/parser';
import { stripIndents } from 'common-tags';

import path from 'path';
import fs from 'fs';
import {
  schemaExtractor,
  generateSchemaTypes,
} from '@sanity-codegen/schema-codegen';
import { getConfig } from '../get-config';
import { getSchemaPath } from '../get-schema-path';

export default class SchemaCodegen extends Command {
  static description = stripIndents`
    loads a sanity schema and generates TypeScript types from it
  `;

  static flags = {
    help: flags.help({ char: 'h' }),
    configPath: flags.string({
      name: 'configPath',
      description: stripIndents`
        Optionally provide an exact path for the CLI to look for a
        sanity-codegen configuration file. If not provided, the CLI will walk up
        the file system checking for \`sanity-codegen.config.js\` or
        \`sanity-codegen.config.ts\`.

        Any CLI flags passed with override the config options.
      `,
    }),
    babelrcPath: flags.string({
      name: 'babelrcPath',
      description: stripIndents`
        Optionally provide a path to a .babelrc file. This will be passed into
        the babel options of the schema executor.

        \`babelOptions\` takes precedence over \`babelrcPath\`
      `,
    }),
    babelOptions: flags.string({
      name: 'babelOptions',
      description: stripIndents`
        Optionally provide babel options inline in a JSON blob. This will be
        passed into the babel options of the schema executor.

        \`babelOptions\` takes precedence over \`babelrcPath\`
      `,
    }),
    root: flags.string({
      name: 'root',
      description: stripIndents`
        Determines from where files are relative to. Defaults to where your
        sanity-codegen config was found (if any) or the current working
        directory.
      `,
    }),
    schemaTypesOutputPath: flags.string({
      name: 'schemaTypesOutputPath',
      description: stripIndents`
        Optionally provide a destination path to the resulting sanity schema
        types. The default value is ./schema-types.d.ts.
      `,
    }),
    schemaJsonOutputPath: flags.string({
      name: 'schemaJsonOutputPath',
      description: stripIndents`
        Optionally provide a destination path to the resulting sanity schema
        JSON. The default value is ./schema-def.json.
      `,
    }),
  };

  static args: Parser.args.IArg[] = [
    {
      name: 'schemaPath',
      description: stripIndents`
        Optionally provide the path to your sanity schema entry point. If not
        provided, the CLI will try to get this value from your sanity.json file.
      `,
    },
  ];

  async run() {
    const { args, flags } = this.parse(SchemaCodegen);
    const { babelOptions, config, babelrcPath, root } = await getConfig({
      flags,
      log: this.log.bind(this),
    });

    const normalizedSchema = config?.normalizedSchema
      ? config.normalizedSchema
      : await schemaExtractor({
          schemaPath: await getSchemaPath({
            config,
            args,
            root,
            log: this.log.bind(this),
          }),
          babelrcPath: babelrcPath || undefined,
          babelOptions,
          cwd: root,
        });

    const result = await generateSchemaTypes({
      normalizedSchema,
      generateTypeName: config?.generateTypeName,
      prettierResolveConfigOptions: config?.prettierResolveConfigOptions,
      prettierResolveConfigPath: config?.prettierResolveConfigPath,
    });

    const schemaTypesOutputPath = path.resolve(
      root,
      flags.schemaTypesOutputPath ||
        config?.schemaTypesOutputPath ||
        'schema-types.d.ts',
    );
    await fs.promises.writeFile(schemaTypesOutputPath, result);
    this.log(
      `\x1b[32m✓\x1b[0m Wrote schema types output to: ${schemaTypesOutputPath}`,
    );

    const schemaJsonOutputPath = path.resolve(
      root,
      flags.schemaJsonOutputPath ||
        config?.schemaJsonOutputPath ||
        'schema-def.json',
    );
    await fs.promises.writeFile(
      schemaJsonOutputPath,
      JSON.stringify(normalizedSchema, null, 2),
    );
    this.log(
      `\x1b[32m✓\x1b[0m Wrote schema JSON output to: ${schemaJsonOutputPath}`,
    );
  }
}
