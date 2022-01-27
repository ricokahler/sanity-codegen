import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import classNames from 'classnames';
import { Panel, defaultQuery, defaultSchema, defaultData } from './panel';
import styles from './app.module.css';

const randomId = () =>
  `panel-${Math.floor(Math.random() * 1000000).toString(16)}`;

const initialWidth = 500;

interface PanelState {
  panelId: string;
  width: number;
  position: number;
}

export function App() {
  const [queryString, setQueryString] = useState(defaultQuery);
  const [schemaString, setSchemaString] = useState(defaultSchema);
  const [dataString, setDataString] = useState(defaultData);

  const [panels, setPanels] = useState<Map<string, PanelState>>(new Map());
  const sortedPanels = useMemo(() => {
    return Array.from(panels.values()).sort((a, b) => a.position - b.position);
  }, [panels]);

  useEffect(() => {
    if (!panels.size) {
      const map = new Map<string, PanelState>();
      const panelId = randomId();
      map.set(panelId, { panelId, width: initialWidth, position: 0 });
      setPanels(map);
    }
  }, [panels]);

  const [resizingPanelId, setResizingPanelId] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resizingPanelId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = ref.current;
      if (!container) return;

      const containerBox = container.getBoundingClientRect();
      if (!containerBox) return;

      const panelEl = container.querySelector(`.${resizingPanelId}`);
      if (!panelEl) return;

      const panelBox = panelEl.getBoundingClientRect();
      if (!panelBox) return;

      const offset = e.clientX - (panelBox.left + panelBox.width);
      const width = panelBox.width + offset;

      setPanels((prev) => {
        const prevPanel = prev.get(resizingPanelId);
        if (!prevPanel) return prev;

        const next = new Map(prev);
        const nextPanel: PanelState = { ...prevPanel, width };

        next.set(resizingPanelId, nextPanel);

        return next;
      });
    };

    const handleMouseUp = () => {
      setResizingPanelId('');
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [resizingPanelId]);

  return (
    <div className={styles.app} ref={ref}>
      {sortedPanels.map((currentPanel, panelIndex) => {
        const handleAddPanel = () => {
          setPanels((prev) => {
            const next = new Map(prev);
            const siblingPanel: PanelState | undefined =
              sortedPanels[panelIndex + 1];
            const range =
              (siblingPanel?.position ?? currentPanel.position + 1) -
              currentPanel.position;

            const newPanelId = randomId();
            next.set(newPanelId, {
              panelId: newPanelId,
              position: range / 2 + currentPanel.position,
              width: initialWidth,
            });
            return next;
          });
        };

        const movePanel = (direction: 'left' | 'right') => {
          setPanels((prev) => {
            const next = new Map(prev);
            const siblingPanel: PanelState | undefined =
              sortedPanels[panelIndex + (direction === 'left' ? -1 : 1)];

            if (!siblingPanel) return prev;

            next.set(currentPanel.panelId, {
              ...currentPanel,
              position: siblingPanel.position,
            });
            next.set(siblingPanel.panelId, {
              ...siblingPanel,
              position: currentPanel.position,
            });

            return next;
          });
        };

        const handleClosePanel = () => {
          setPanels((prev) => {
            const next = new Map(prev);
            next.delete(currentPanel.panelId);
            return next;
          });
        };

        return (
          <Fragment key={currentPanel.panelId}>
            <Panel
              className={classNames(styles.panel, currentPanel.panelId)}
              style={{ width: currentPanel.width }}
              queryString={queryString}
              onQueryStringChange={setQueryString}
              dataString={dataString}
              onDataStringChange={setDataString}
              schemaString={schemaString}
              onSchemaStringChange={setSchemaString}
              disableMoveLeft={panelIndex === 0}
              onMovePanelLeft={() => movePanel('left')}
              disableMoveRight={panelIndex === panels.size - 1}
              onMovePanelRight={() => movePanel('right')}
              onAddPanel={handleAddPanel}
              onClosePanel={handleClosePanel}
            />
            <div
              className={styles.divider}
              onMouseDown={() => setResizingPanelId(currentPanel.panelId)}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
