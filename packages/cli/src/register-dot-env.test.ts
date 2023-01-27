import path from 'path';
import { registerDotEnv } from './register-dot-env';

describe('registerDotEnv', () => {
  it('loads multiple env files', () => {
    registerDotEnv(
      'development',
      path.resolve(__dirname, './__example-folders__'),
    );

    registerDotEnv(
      'production',
      path.resolve(__dirname, './__example-folders__'),
    );

    expect(process.env.SANITY_CODEGEN_FROM_ROOT).toBe('true');
    expect(process.env.SANITY_CODEGEN_FROM_LOCAL).toBe('true');
    expect(process.env.SANITY_CODEGEN_FROM_DEVELOPMENT).toBe('true');
    expect(process.env.SANITY_CODEGEN_FROM_PRODUCTION).toBe('true');
  });
});
