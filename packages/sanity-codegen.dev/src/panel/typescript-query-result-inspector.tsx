import Editor from '@monaco-editor/react';
import { useDeferredValue, useMemo } from 'react';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen/standalone';
import {
  transformGroqToStructure,
  transformStructureToTs,
} from '@sanity-codegen/groq-codegen/standalone';
import { extractSchemaString } from './helpers';
import { parse } from 'groq-js';
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
      const { query, references } = transformStructureToTs({
        structure: transformGroqToStructure({
          // @ts-expect-error TODO update these types
          node: parse(queryString),
          normalizedSchema: schemaNormalizer(extractSchemaString(schemaString)),
          scopes: [],
        }),
      });

      const finalCodegen = `
      /// <reference types="@sanity-codegen/types" />
  
      declare namespace Sanity {
        namespace Queries {
            type Query = ${generate(query).code}
  
            ${Object.entries(references)
              .sort(([referenceKeyA], [referenceKeyB]) =>
                referenceKeyA.localeCompare(referenceKeyB, 'en'),
              )
              .map(
                ([referenceKey, referenceTsType]) =>
                  `type ${referenceKey} = ${generate(referenceTsType).code}`,
              )
              .join('\n')}
  
          /**
           * A keyed type of all the codegen'ed queries. This type is used for
           * TypeScript meta programming purposes only.
           */
          type QueryMap = {
            Query: Query;
          };
        }
      }
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
