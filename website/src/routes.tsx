import App from './App';
import { Legal } from './pages/Legal';

/** /privacy and /terms are their own pages (also as privacy.html and terms.html); everything else is the main page. */
export function pageFor(pathname: string) {
  const path = pathname.replace(/\.html$/i, '').replace(/\/+$/, '').toLowerCase();
  return path === '/privacy' ? <Legal doc="privacy" /> : path === '/terms' ? <Legal doc="terms" /> : <App />;
}
