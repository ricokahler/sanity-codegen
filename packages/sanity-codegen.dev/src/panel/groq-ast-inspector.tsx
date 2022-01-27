import { useDeferredValue, useMemo } from 'react';
import { parse } from 'groq-js';
import { ObjectInspector } from './object-inspector';

interface Props {
  query: string;
}

export default function GroqAstInspector({ query }: Props) {
  const groqAst = useDeferredValue(useMemo(() => parse(query), [query]));

  return <ObjectInspector data={groqAst} expandLevel={10} />;
}
