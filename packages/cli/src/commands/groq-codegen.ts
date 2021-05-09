import { Command, flags } from '@oclif/command';
import * as Parser from '@oclif/parser';
import { stripIndents } from 'common-tags';
import path from 'path';
import fs from 'fs';
import { generateGroqTypes } from '@sanity-codegen/groq-codegen';

export default class SchemaCodegen extends Command {
  static description = stripIndents`
    parses source code files for GROQ queries and outputs TypeScript types from them
  `;

  static flags = {
    help: flags.help({ char: 'h' }),
    cwd: flags.string({
      name: 'cwd',
      description: stripIndents`
        Optionally provide a working directory. The working directory is used
        as a root when resolving relative blobs.
      `,
    }),
    outputPath: flags.string({
      name: 'outputPath',
      description: stripIndents`
        Optionally provide a destination path to the resulting sanity groq
        types. The default value is ./queries.d.ts.
      `,
    }),
  };

  static args: Parser.args.IArg[] = [
    {
      name: 'filenames',
      description: stripIndents`
        Provide a glob to match source files you wish to parse for GROQ queries.
      `,
      required: true,
    },
  ];

  async run() {
    const { args, flags } = this.parse(SchemaCodegen);

    const result = await generateGroqTypes({
      filenames: args.filenames,
      cwd: path.resolve(flags.cwd || process.cwd()),
    });

    await fs.promises.writeFile(
      path.resolve(process.cwd(), flags.outputPath || 'queries.d.ts'),
      result,
    );
  }
}
