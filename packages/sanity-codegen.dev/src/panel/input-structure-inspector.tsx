import { useDeferredValue, useMemo } from 'react';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen/standalone';
import { transformSchemaToStructure } from '@sanity-codegen/groq-codegen/standalone';
import { ObjectInspector } from './object-inspector';
import { extractSchemaString } from './helpers';

interface Props {
  schemaString: string;
}

export default function InputStructureInspector({ schemaString }: Props) {
  const schema = useDeferredValue(
    useMemo(
      () =>
        transformSchemaToStructure({
          normalizedSchema: schemaNormalizer(extractSchemaString(schemaString)),
        }),
      [schemaString],
    ),
  );

  return <ObjectInspector data={schema} />;
}
