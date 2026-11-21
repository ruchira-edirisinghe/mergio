/* Mergio control panel service worker (served as /sw.js). It makes the panel installable as an app and shows
   a friendly "Mergio isn't running" page instead of a browser error when the app window opens before Mergio. */
const CACHE = 'mergio-v2';
const OFFLINE = '/dashboard/offline.html';
const ASSETS = [OFFLINE, '/dashboard/offline.js', '/shared/app-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.mode === 'navigate' && url.pathname.startsWith('/dashboard')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
  } else if (ASSETS.includes(url.pathname)) {
    e.respondWith(fetch(e.request).catch(() => caches.match(url.pathname)));
  }
  // Everything else (the API, the overlays) goes straight to Mergio.
});
