import { useDeferredValue, useMemo } from 'react';
import { transformSchemaToStructure } from '@sanity-codegen/core/standalone';
import { ObjectInspector } from './object-inspector';
import { getNormalizedSchema } from './helpers';

interface Props {
  schemaString: string;
}

export default function InputStructureInspector({ schemaString }: Props) {
  const schema = useDeferredValue(
    useMemo(
      () =>
        transformSchemaToStructure({
          normalizedSchema: getNormalizedSchema(schemaString),
        }),
      [schemaString],
    ),
  );

  return <ObjectInspector data={schema} />;
}
