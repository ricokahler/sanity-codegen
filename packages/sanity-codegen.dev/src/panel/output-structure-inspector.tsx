import { useDeferredValue, useMemo } from 'react';
import { transformGroqToStructure } from '@sanity-codegen/core/standalone';
import { getNormalizedSchema } from './helpers';
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
        node: parse(queryString),
        normalizedSchema: getNormalizedSchema(schemaString),
        scopes: [],
      });
    }, [queryString, schemaString]),
  );

  return <ObjectInspector data={outputStructure} />;
}
