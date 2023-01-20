import Editor from '@monaco-editor/react';
import { useDeferredValue, useMemo } from 'react';
import {
  generateQueryTypes,
  generateSchemaTypes,
} from '@sanity-codegen/core/standalone';
import { getNormalizedSchema } from './helpers';
import generate from '@babel/generator';
import { format } from 'prettier';
import typeScriptParser from 'prettier/parser-typescript';

interface Props {
  queryString: string;
  schemaString: string;
}

export default function TypescriptQueryResultInspector({
  queryString,
  schemaString,
}: Props) {
  const typescriptResult = useDeferredValue(
    useMemo(() => {
      const normalizedSchema = getNormalizedSchema(schemaString);

      const schemaTypes = generateSchemaTypes({ normalizedSchema });
      const queryTypes = generateQueryTypes({
        normalizedSchema,
        substitutions: schemaTypes.substitutions,
        extractedQueries: [{ query: queryString, queryKey: 'Query' }],
      });

      const finalCodegen = `
        /// <reference types="@sanity-codegen/types" />

        ${Object.values(schemaTypes.declarations)
          .map((declaration) => generate(declaration).code)
          .sort((a, b) => a.localeCompare(b, 'en'))
          .join('\n')}

        ${Object.values(queryTypes.declarations)
          .map((declaration) => generate(declaration).code)
          .sort((a, b) => a.localeCompare(b, 'en'))
          .join('\n')}
      `;

      return format(finalCodegen, {
        parser: 'typescript',
        plugins: [typeScriptParser],
      });
    }, [queryString, schemaString]),
  );

  return (
    <Editor
      value={typescriptResult}
      defaultLanguage="typescript"
      options={{ readOnly: true, minimap: { enabled: false } }}
    />
  );
}
