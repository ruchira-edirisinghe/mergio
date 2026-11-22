// Runs after `vite build` and the server build of src/entry-server.tsx.
// Writes every page as finished HTML (dist/index.html, privacy.html, terms.html) with its own title,
// description, canonical link and structured data, plus sitemap.xml and a 404 page.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = 'https://mergio-stream-overlay-gamma.vercel.app';
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const ssrDir = fileURLToPath(new URL('../dist-ssr/', import.meta.url));
const { render, PAGES, jsonLd } = await import(pathToFileURL(`${ssrDir}entry-server.js`).href);

const template = readFileSync(`${dist}index.html`, 'utf8');
if (!template.includes('<div id="root"></div>')) throw new Error('index.html has no empty #root to fill');

const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
/** Swaps the content of one tag in the head, and fails the build if the tag is missing. */
function swap(html, re, value) {
  if (!re.test(html)) throw new Error(`missing in index.html: ${re}`);
  return html.replace(re, (_, a, b) => `${a}${value}${b}`);
}

for (const page of PAGES) {
  const url = page.path === '/' ? `${SITE}/` : `${SITE}${page.path}`;
  let html = template.replace('<div id="root"></div>', `<div id="root">${render(page.path)}</div>`);
  html = swap(html, /(<title>)[^<]*(<\/title>)/, attr(page.title));
  html = swap(html, /(<meta name="description" content=")[^"]*(")/, attr(page.description));
  html = swap(html, /(<meta property="og:title" content=")[^"]*(")/, attr(page.title));
  html = swap(html, /(<meta property="og:description" content=")[^"]*(")/, attr(page.description));
  html = swap(html, /(<meta property="og:url" content=")[^"]*(")/, url);
  html = swap(html, /(<meta name="twitter:title" content=")[^"]*(")/, attr(page.title));
  html = swap(html, /(<meta name="twitter:description" content=")[^"]*(")/, attr(page.description));
  html = swap(html, /(<link rel="canonical" href=")[^"]*(")/, url);
  // "<" is escaped so the JSON can never close the script tag early
  const ld = JSON.stringify(jsonLd(page)).replace(/</g, '\\u003c');
  html = html.replace('</head>', `  <script type="application/ld+json">${ld}</script>\n  </head>`);
  writeFileSync(`${dist}${page.file}`, html);
  console.log(`prerendered ${page.path} -> ${page.file} (${Math.round(html.length / 1024)} kB)`);
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(`${dist}sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(p => `  <url><loc>${p.path === '/' ? `${SITE}/` : `${SITE}${p.path}`}</loc><lastmod>${today}</lastmod><priority>${p.path === '/' ? '1.0' : '0.3'}</priority></url>`).join('\n')}
</urlset>
`);

// A plain 404 page: no app script (it would draw the main page), kept out of search results.
let notFound = template
  .replace(/\s*<script type="module"[^>]*><\/script>/, '')
  .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
  .replace('<meta name="robots" content="index, follow, max-image-preview:large" />', '<meta name="robots" content="noindex" />')
  .replace(/\s*<link rel="canonical"[^>]*>/, '');
notFound = swap(notFound, /(<title>)[^<]*(<\/title>)/, 'Page not found · Mergio');
notFound = notFound.replace('<div id="root"></div>', `<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#07060c;color:#fff;text-align:center;font-family:'Inter Variable',system-ui,sans-serif">
      <div>
        <img src="/brand/mergio-icon.svg" alt="Mergio" width="72" height="72" />
        <h1 style="margin:24px 0 8px;font-size:40px;font-weight:500;letter-spacing:-.03em">Page not found</h1>
        <p style="margin:0 0 28px;color:rgba(255,255,255,.6)">This page doesn't exist. Every live chat is still one click away.</p>
        <a href="/" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#fff;color:#000;font-weight:600;text-decoration:none">Go to Mergio</a>
      </div>
    </main>`);
writeFileSync(`${dist}404.html`, notFound);

rmSync(ssrDir, { recursive: true, force: true });
console.log('wrote sitemap.xml and 404.html');
