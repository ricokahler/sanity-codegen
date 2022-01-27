import { Box } from '@sanity/ui';
import {
  ObjectInspector as ReactObjectInspector,
  ObjectInspectorProps,
  ObjectLabel,
  ObjectRootLabel,
} from 'react-inspector';

function isRecord(value: unknown): value is Record<string, unknown> {
  var type = typeof value;
  // eslint-disable-next-line eqeqeq
  return value != null && (type == 'object' || type == 'function');
}

export function ObjectInspector(props: ObjectInspectorProps) {
  return (
    <Box paddingX={4}>
      <ReactObjectInspector
        expandLevel={10}
        nodeRenderer={(props) => {
          if (isRecord(props.data) && 'type' in props?.data) {
            return <>{props.data.type}</>;
          }

          if (props.depth === 0) {
            return <ObjectRootLabel {...props} />;
          }

          return <ObjectLabel {...props} />;
        }}
        {...props}
      />
    </Box>
  );
}
