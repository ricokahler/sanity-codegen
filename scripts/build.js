const exec = require('@ricokahler/exec');
const fs = require('fs');
const path = require('path');

const omit = (obj, keys) =>
  Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key))
  );

async function build() {
  console.log('Cleaning…');
  await exec('rm -rf dist');

  console.log('Installing…');
  await exec('npm i');

  console.log('Compiling types…');
  await exec('npx tsc');

  console.log('Compiling Non-Client JS…');
  await exec(
    'npx babel -x .ts,.js --ignore /**/*.test.ts,/**/*.d.ts ./src --out-dir ./dist'
  );

  console.log('Compiling Client JS…');
  await exec('npx rollup -c');

  // add node hash-bang to cli entry point
  const cliIndexPath = path.resolve(__dirname, '../dist/cli.js');
  const cliIndex = (await fs.promises.readFile(cliIndexPath)).toString();
  await fs.promises.writeFile(cliIndexPath, `#!/usr/bin/env node\n${cliIndex}`);

  console.log('Writing package.json…');
  const packageJson = require('../package.json');
  await fs.promises.writeFile(
    path.resolve(__dirname, '../dist/package.json'),
    JSON.stringify(
      {
        ...omit(packageJson, [
          // removes these
          'private',
          'scripts',
          'devDependencies',
          'main',
        ]),
        main: 'index.js',
        module: 'index.esm.js',
        bin: {
          'sanity-codegen': './cli.js',
        },
      },
      null,
      2
    )
  );

  console.log('Copying README…');
  const readme = await fs.promises.readFile(
    path.resolve(__dirname, '../README.md')
  );
  await fs.promises.writeFile(
    path.resolve(__dirname, '../dist/README.md'),
    readme
  );

  // console.log('Rolling frontend build…');
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
