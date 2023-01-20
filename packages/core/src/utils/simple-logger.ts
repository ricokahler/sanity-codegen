import chalk from 'chalk';

export const simpleLogger: Sanity.Codegen.Logger = {
  debug: console.debug.bind(console),
  error: (message) => console.error(`${chalk.red('✗')} ${message}`),
  info: (message) => console.info(`${chalk.cyan('ⓘ')} ${message}`),
  log: console.log.bind(console),
  success: (message) => console.log(`${chalk.green('✓')} ${message}`),
  verbose: (message) => {
    if (process.env.CI !== 'true') {
      console.log(message);
    }
  },
  warn: (message) => console.warn(`${chalk.yellow('⚠️')} ${message}`),
};
