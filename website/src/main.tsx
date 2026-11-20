import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './index.css';
import './overlay.css';
import App from './App';
import { Legal } from './pages/Legal';

/** /privacy and /terms are their own pages; everything else is the main page. */
const path = location.pathname.replace(/\/+$/, '').toLowerCase();
const page = path === '/privacy' ? <Legal doc="privacy" /> : path === '/terms' ? <Legal doc="terms" /> : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {page}
  </StrictMode>,
);
