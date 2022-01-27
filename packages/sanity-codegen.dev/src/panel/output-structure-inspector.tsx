import { useDeferredValue, useMemo } from 'react';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen/standalone';
import { transformGroqToStructure } from '@sanity-codegen/groq-codegen/standalone';
import { extractSchemaString } from './helpers';
import { ObjectInspector } from './object-inspector';
import { parse } from 'groq-js';

interface Props {
  schemaString: string;
  queryString: string;
}

export default function OutputStructureInspector({
  schemaString,
  queryString,
}: Props) {
  const outputStructure = useDeferredValue(
    useMemo(() => {
      return transformGroqToStructure({
        // @ts-expect-error TODO update these types
        node: parse(queryString),
        normalizedSchema: schemaNormalizer(extractSchemaString(schemaString)),
        scopes: [],
      });
    }, [queryString, schemaString]),
  );

  return <ObjectInspector data={outputStructure} />;
}
