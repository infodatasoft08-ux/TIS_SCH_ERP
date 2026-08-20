import { Temporal } from 'temporal-polyfill';
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import "remixicon/fonts/remixicon.css";
import App from './App.jsx'
import { SpacemanThemeProvider } from '@space-man/react-theme-animation'

import ErrorBoundary from './components/ErrorBoundary.jsx';

// Make Temporal globally available for Schedule-X
globalThis.Temporal = Temporal;

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <SpacemanThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SpacemanThemeProvider>
  </ErrorBoundary>
)
