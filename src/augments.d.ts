declare module '@babel/register' {
  import { TransformOptions } from '@babel/core';

  // not perfect types but works enough
  const register: (
    options: TransformOptions & { extensions: string[] }
  ) => void;
  export default register;
}
