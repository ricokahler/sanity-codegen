const fs = require('fs');
const fg = require('fast-glob');
const packages = fg.sync('./packages/*', {
  onlyDirectories: true,
  absolute: true,
  cwd: __dirname,
});

if (!process.env.NPM_TOKEN) {
  throw new Error('No NPM_TOKEN in environment.');
}

const npmrc = `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}`;

for (const path of packages) {
  fs.writeFileSync(`${path}/.npmrc`, npmrc);
}

fs.writeFileSync(`${__dirname}/.npmrc`, npmrc);
