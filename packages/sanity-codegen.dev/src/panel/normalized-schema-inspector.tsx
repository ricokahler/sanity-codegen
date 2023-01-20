import { useDeferredValue, useMemo } from 'react';
import { ObjectInspector } from './object-inspector';
import { getNormalizedSchema } from './helpers';

interface Props {
  schemaString: string;
}

export default function NormalizedSchemaInspector({ schemaString }: Props) {
  const schema = useDeferredValue(
    useMemo(() => getNormalizedSchema(schemaString), [schemaString]),
  );

  return <ObjectInspector data={schema} />;
}
