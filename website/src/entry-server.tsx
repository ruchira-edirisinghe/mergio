/* Build-time only: renders each page to HTML so search engines and link previews get the full page
   without running JavaScript. Used by scripts/prerender.mjs. */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { pageFor } from './routes';

export { PAGES, jsonLd } from './seo';

export function render(path: string) {
  return renderToString(<StrictMode>{pageFor(path)}</StrictMode>);
}
