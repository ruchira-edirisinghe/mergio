import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './index.css';
import './overlay.css';
import './alerts.css';
import { pageFor } from './routes';

const root = document.getElementById('root')!;
const tree = <StrictMode>{pageFor(location.pathname)}</StrictMode>;

// The built pages come already rendered (scripts/prerender.mjs), so React takes over that HTML;
// the dev server sends an empty page, so React draws it.
if (root.hasChildNodes()) hydrateRoot(root, tree);
else createRoot(root).render(tree);
