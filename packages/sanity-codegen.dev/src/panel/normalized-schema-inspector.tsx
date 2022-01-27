import { useDeferredValue, useMemo } from 'react';
import { schemaNormalizer } from '@sanity-codegen/schema-codegen/standalone';
import { ObjectInspector } from './object-inspector';
import { extractSchemaString } from './helpers';

interface Props {
  schemaString: string;
}

export default function NormalizedSchemaInspector({ schemaString }: Props) {
  const schema = useDeferredValue(
    useMemo(
      () => schemaNormalizer(extractSchemaString(schemaString)),
      [schemaString],
    ),
  );

  return <ObjectInspector data={schema} />;
}
