import fs from 'fs';
import path from 'path';
import { parse } from 'dotenv';
import { expand } from 'dotenv-expand';

// adapted from vite env loading
// https://github.com/vitejs/vite/blob/8972868ca2a49c837aa3f3be847e5268533b9569/packages/vite/src/node/env.ts#L7
export function registerDotEnv(
  mode: 'production' | 'development',
  root: string,
) {
  const envFiles = [
    /** default file */ `.env`,
    /** local file */ `.env.local`,
    /** mode file */ `.env.${mode}`,
    /** mode local file */ `.env.${mode}.local`,
  ];

  const parsed = Object.fromEntries(
    envFiles.flatMap((envFile) => {
      const filename = path.resolve(root, envFile);
      if (!fs.existsSync(filename)) return [];
      return Object.entries(parse(fs.readFileSync(filename)));
    }),
  );

  // test NODE_ENV override before expand as otherwise process.env.NODE_ENV would override this
  if (parsed.NODE_ENV && process.env.VITE_USER_NODE_ENV === undefined) {
    process.env.VITE_USER_NODE_ENV = parsed.NODE_ENV;
  }
  // support BROWSER and BROWSER_ARGS env variables
  if (parsed.BROWSER && process.env.BROWSER === undefined) {
    process.env.BROWSER = parsed.BROWSER;
  }
  if (parsed.BROWSER_ARGS && process.env.BROWSER_ARGS === undefined) {
    process.env.BROWSER_ARGS = parsed.BROWSER_ARGS;
  }

  try {
    // let environment variables use each other
    expand({ parsed });
  } catch (e) {
    // custom error handling until https://github.com/motdotla/dotenv-expand/issues/65 is fixed upstream
    // check for message "TypeError: Cannot read properties of undefined (reading 'split')"
    if (e instanceof Error && e.message.includes('split')) {
      throw new Error(
        'dotenv-expand failed to expand env vars. Maybe you need to escape `$`?',
      );
    }
    throw e;
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
