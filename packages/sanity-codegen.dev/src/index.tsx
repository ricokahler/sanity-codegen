import React from 'react';
import { createRoot } from 'react-dom';
import { App } from './app';
import { ThemeProvider, studioTheme } from '@sanity/ui';

import 'modern-css-reset';
import './global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Could not find root element.');
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={studioTheme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
