import { useDeferredValue } from 'react';
import { evaluate, parse } from 'groq-js';
import { ObjectInspector } from './object-inspector';
import { createPromiseSuspender } from '@ricokahler/promise-suspender';

interface Props {
  queryString: string;
  dataString: string;
}

const usePromise = createPromiseSuspender();

export default function QueryResultsInspector({
  queryString,
  dataString,
}: Props) {
  const result = useDeferredValue(
    usePromise(async () => {
      const value = await evaluate(parse(queryString), {
        dataset: JSON.parse(dataString),
      });
      return value.get();
    }, [queryString, dataString]),
  );

  return <ObjectInspector data={result} />;
}
