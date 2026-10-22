import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import './styles/theme.css';

import App from './App';
import { DemoStoreProvider } from './store/DemoStore';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <DemoStoreProvider>
        <App />
      </DemoStoreProvider>
    </HashRouter>
  </StrictMode>,
);
