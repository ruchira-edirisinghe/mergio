import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './index.css';
import './overlay.css';
import './alerts.css';
import App from './App';
import { Legal } from './pages/Legal';
import { SITE } from './lib/links';

/** /privacy and /terms are their own pages; everything else is the main page. */
const path = location.pathname.replace(/\/+$/, '').toLowerCase();
const page = path === '/privacy' ? <Legal doc="privacy" /> : path === '/terms' ? <Legal doc="terms" /> : <App />;

// the legal pages are their own address for search engines and link previews
if (path === '/privacy' || path === '/terms') {
  const url = `${SITE}${path}`;
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {page}
  </StrictMode>,
);
