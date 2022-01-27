import { Suspense, useState, lazy } from 'react';
import { Select, Flex, Button, Box, Text } from '@sanity/ui';
import {
  SplitVerticalIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@sanity/icons';
import { ErrorBoundary } from 'react-error-boundary';
import { defaultData, defaultQuery, defaultSchema } from './default-values';

export * from './default-values';

const Editor = lazy(() => import('@monaco-editor/react'));
const NormalizedSchemaInspector = lazy(
  () => import('./normalized-schema-inspector'),
);
const InputStructureInspector = lazy(
  () => import('./input-structure-inspector'),
);
const OutputStructureInspector = lazy(
  () => import('./output-structure-inspector'),
);
const QueryResultsInspector = lazy(() => import('./query-results-inspector'));
const TypescriptQueryResultInspector = lazy(
  () => import('./typescript-query-result-inspector'),
);
const TypescriptSchemaResultInspector = lazy(
  () => import('./typescript-schema-result-inspector'),
);
const GroqAstInspector = lazy(() => import('./groq-ast-inspector'));

interface Props {
  className?: string;
  style?: React.CSSProperties;

  defaultOption?: string;

  disableMoveLeft: boolean;
  disableMoveRight: boolean;

  queryString: string;
  onQueryStringChange: (queryString: string) => void;
  schemaString: string;
  onSchemaStringChange: (schemaString: string) => void;
  dataString: string;
  onDataStringChange: (dataString: string) => void;

  onAddPanel: () => void;
  onClosePanel: () => void;
  onMovePanelLeft: () => void;
  onMovePanelRight: () => void;
}

export function Panel({
  className,
  style,
  queryString,
  schemaString,
  dataString,
  disableMoveLeft,
  disableMoveRight,
  defaultOption = 'typescriptQueryResult',
  onMovePanelLeft,
  onMovePanelRight,
  onAddPanel,
  onQueryStringChange,
  onSchemaStringChange,
  onDataStringChange,
  onClosePanel,
}: Props) {
  const [value, setValue] = useState(defaultOption);

  return (
    <Flex className={className} style={style} direction="column">
      <Flex padding={2} gap={2}>
        <Select value={value} onChange={(e) => setValue(e.currentTarget.value)}>
          <optgroup label="Inputs">
            <option value="groq">GROQ</option>
            <option value="schema">Schema</option>
            <option value="data">Data</option>
          </optgroup>

          <optgroup label="Outputs">
            <option value="queryResult">Query Result</option>
            <option value="groqAst">GROQ AST</option>
            <option value="normalizedSchema">Normalized Schema</option>
            <option value="inputStructure">Input Structure</option>
            <option value="outputStructure">Output Structure</option>
            <option value="typescriptQueryResult">Query Codegen</option>
            <option value="typescriptSchemaResult">Schema Codegen</option>
          </optgroup>
        </Select>

        <Button
          title="Move left"
          icon={ChevronLeftIcon}
          mode="bleed"
          disabled={disableMoveLeft}
          onClick={onMovePanelLeft}
        />
        <Button
          title="Move right"
          icon={ChevronRightIcon}
          mode="bleed"
          disabled={disableMoveRight}
          onClick={onMovePanelRight}
        />
        <Button
          title="Add panel"
          icon={SplitVerticalIcon}
          mode="bleed"
          onClick={onAddPanel}
        />
        <Button
          title="Close"
          icon={CloseIcon}
          mode="bleed"
          onClick={onClosePanel}
        />
      </Flex>

      <Box flex={1} overflow="auto">
        <Suspense fallback={<Text>Loading…</Text>}>
          {/* inputs */}
          {value === 'groq' && (
            <Editor
              defaultValue={defaultQuery}
              onChange={(value) => onQueryStringChange(value || '')}
              options={{ minimap: { enabled: false } }}
            />
          )}
          {value === 'schema' && (
            <Editor
              defaultValue={defaultSchema}
              onChange={(value) => onSchemaStringChange(value || '')}
              defaultLanguage="javascript"
              options={{ minimap: { enabled: false } }}
            />
          )}
          {value === 'data' && (
            <Editor
              defaultValue={defaultData}
              onChange={(value) => onDataStringChange(value || '')}
              defaultLanguage="json"
              options={{ minimap: { enabled: false } }}
            />
          )}
          {/* outputs */}
          {value === 'queryResult' && (
            <ErrorBoundary
              resetKeys={[queryString, dataString]}
              fallback={<Text>Failed to query or data.</Text>}
            >
              <QueryResultsInspector
                dataString={dataString}
                queryString={queryString}
              />
            </ErrorBoundary>
          )}
          {value === 'groqAst' && (
            <ErrorBoundary
              resetKeys={[queryString]}
              fallback={<Text>Failed to load query.</Text>}
            >
              <GroqAstInspector query={queryString} />
            </ErrorBoundary>
          )}
          {value === 'normalizedSchema' && (
            <ErrorBoundary
              resetKeys={[schemaString]}
              fallback={<Text>Failed to load schema.</Text>}
            >
              <NormalizedSchemaInspector schemaString={schemaString} />
            </ErrorBoundary>
          )}
          {value === 'inputStructure' && (
            <ErrorBoundary
              resetKeys={[schemaString]}
              fallback={<Text>Failed to load schema.</Text>}
            >
              <InputStructureInspector schemaString={schemaString} />
            </ErrorBoundary>
          )}
          {value === 'outputStructure' && (
            <ErrorBoundary
              resetKeys={[schemaString, queryString]}
              fallback={<Text>Failed to load schema or query.</Text>}
            >
              <OutputStructureInspector
                queryString={queryString}
                schemaString={schemaString}
              />
            </ErrorBoundary>
          )}

          {value === 'typescriptQueryResult' && (
            <ErrorBoundary
              resetKeys={[schemaString, queryString]}
              fallback={<Text>Failed to load schema or query.</Text>}
            >
              <TypescriptQueryResultInspector
                queryString={queryString}
                schemaString={schemaString}
              />
            </ErrorBoundary>
          )}

          {value === 'typescriptSchemaResult' && (
            <ErrorBoundary
              resetKeys={[schemaString, queryString]}
              fallback={<Text>Failed to load schema or query.</Text>}
            >
              <TypescriptSchemaResultInspector schemaString={schemaString} />
            </ErrorBoundary>
          )}
        </Suspense>
      </Box>
    </Flex>
  );
}
