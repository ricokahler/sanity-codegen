import Editor from '@monaco-editor/react';
import {
  schemaNormalizer,
  generateSchemaTypes,
} from '@sanity-codegen/schema-codegen/standalone';
import { extractSchemaString } from './helpers';
import { createPromiseSuspender } from '@ricokahler/promise-suspender';

const usePromise = createPromiseSuspender();

interface Props {
  schemaString: string;
}

export default function TypescriptSchemaResultInspector({
  schemaString,
}: Props) {
  const schemaTypescript = usePromise(() => {
    return generateSchemaTypes({
      normalizedSchema: schemaNormalizer(extractSchemaString(schemaString)),
    });
  }, [schemaString]);

  return (
    <Editor
      value={schemaTypescript}
      defaultLanguage="typescript"
      options={{ readOnly: true, minimap: { enabled: false } }}
    />
  );
}
