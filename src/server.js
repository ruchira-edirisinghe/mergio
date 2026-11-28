'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer } = require('ws');
const settings = require('./settings');
const testdata = require('./testdata');
const autostart = require('./autostart');
const avatars = require('./avatars');
const updater = require('./updater');
const stats = require('./stats');
const followers = require('./followers');
const obsdocks = require('./obsdocks');
const tts = require('./tts');
const { checkToken: checkFacebookToken } = require('./connectors/facebook');
const { isSea, fetchJson, log, DATA_DIR } = require('./util');
const pkg = require('../package.json');

const PUBLIC = path.resolve(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

/** Reads a file from public/ (from disk in dev, from the embedded assets in the packaged exe). */
function readAsset(rel) {
  rel = rel.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!rel || rel.includes('..') || rel.includes('\0') || /^[a-z]:/i.test(rel)) return null;
  if (isSea()) {
    try { return Buffer.from(require('node:sea').getAsset(`public/${rel}`)); } catch { return null; }
  }
  // Never read outside public/, whatever the path looks like.
  const file = path.resolve(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + path.sep)) return null;
  try { return fs.readFileSync(file); } catch { return null; }
}

const AVATAR_COLORS = ['#ff6b6b', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#a855f7', '#ec4899', '#84cc16'];
function defaultAvatar(name) {
  let n = '?';
  try { n = decodeURIComponent(name || '?').slice(0, 100); } catch { /* broken %-escape: show "?" */ }
  // the first letter in any script (a whole grapheme, so "राहुल" shows "रा" and emoji stay whole), skipping @ _ and punctuation
  const rest = n.replace(/^[\s@_\p{P}\p{S}]+/u, '') || n;
  let letter = '?';
  try { letter = new Intl.Segmenter().segment(rest)[Symbol.iterator]().next().value?.segment || '?'; } catch { letter = Array.from(rest)[0] || '?'; }
  letter = letter.toUpperCase().replace(/[<>&"']/g, '') || '?';
  let h = 0; for (const ch of n) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const c = AVATAR_COLORS[h % AVATAR_COLORS.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${c}"/><text x="32" y="42" font-family="Segoe UI,Nirmala UI,Arial,sans-serif" font-size="30" font-weight="700" text-anchor="middle" fill="#fff">${letter}</text></svg>`;
}

/* ---------- pronouns (Twitch, via the community pronouns.alejo.io service) ---------- */
let pronounNames = null;
const pronounCache = new Map();
const remember = (key, value) => {
  pronounCache.set(key, value);
  if (pronounCache.size > 5000) pronounCache.delete(pronounCache.keys().next().value); // keep memory bounded
};
async function pronouns(login) {
  if (pronounCache.has(login)) return pronounCache.get(login);
  try {
    pronounNames ||= Object.fromEntries(Object.entries(await fetchJson('https://api.pronouns.alejo.io/v1/pronouns')).map(([k, v]) => [k, v.singular ? v.subject : `${v.subject}/${v.object}`]));
    const r = await fetchJson(`https://api.pronouns.alejo.io/v1/users/${encodeURIComponent(login)}`);
    const out = [pronounNames[r.pronoun_id], r.alt_pronoun_id && pronounNames[r.alt_pronoun_id]?.split('/')[0]].filter(Boolean).join('/');
    remember(login, out);
    return out;
  } catch { remember(login, ''); return ''; }
}

/* ---------- who may talk to the local server ---------- */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const MAX_BODY = 1024 * 1024;

/** The host name of a Host header without its port ("[::1]:8787" -> "[::1]"). */
function hostName(header) {
  const m = /^(\[[^\]]*\]|[^:]*)(?::\d+)?$/.exec(String(header || '').trim().toLowerCase());
  return m ? m[1] : '';
}

/** Only requests addressed to this machine (blocks DNS-rebinding tricks from websites). */
const toThisMachine = req => LOCAL_HOSTS.has(hostName(req.headers.host));

/**
 * True when a request comes from one of Mergio's own pages, or from a tool that isn't a browser (curl, scripts).
 * Browsers always say which site a request comes from, so another website open in the same browser can't use
 * the API to change settings, add chats, read tokens or quit the app.
 */
function fromOwnPage(req) {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' && LOCAL_HOSTS.has(u.hostname) && u.host === String(req.headers.host || '').toLowerCase();
  } catch { return false; }
}

/** Message ids from a request: short strings only, at most 500 of them. */
const messageIds = list => (Array.isArray(list) ? list : []).filter(x => typeof x === 'string' && /^[\x21-\x7e]{1,200}$/.test(x)).slice(0, 500);

/** "application/json; charset=utf-8" -> "application/json" */
const mediaType = req => String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
const hasBody = req => Number(req.headers['content-length']) > 0 || req.headers['transfer-encoding'] !== undefined;

/* ---------- security headers ---------- */
const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};
// Anything that isn't one of Mergio's pages (an SVG opened on its own, JSON) can't run scripts or load anything.
const LOCKED_CSP = "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'";

/**
 * Content Security Policy for Mergio's pages: scripts only from Mergio itself, so even a chat message that
 * somehow got turned into HTML could never run code. Pictures (emotes, badges, profile pictures, gifts) come from
 * the chat platforms over https, fonts from Google Fonts.
 */
function pageHeaders(file, host) {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    `connect-src 'self' ws://${host}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
  ];
  // The control panel can't be shown inside another website (so nobody can trick you into clicking its buttons).
  // The overlays only show chat and numbers, so other tools (and the panel's previews) may still embed them.
  const panel = !/^(overlay|alerts|viewers|followers)\//.test(file);
  if (!panel) return { 'Content-Security-Policy': csp.join('; ') };
  // The OBS docks have buttons (hide, replay): only Mergio's own pages may show them inside a frame.
  if (file.startsWith('dock/')) { csp.push("frame-ancestors 'self'"); return { 'Content-Security-Policy': csp.join('; '), 'X-Frame-Options': 'SAMEORIGIN' }; }
  csp.push("frame-ancestors 'none'");
  return { 'Content-Security-Policy': csp.join('; '), 'X-Frame-Options': 'DENY', 'Cross-Origin-Opener-Policy': 'same-origin' };
}

function createServer(manager, { onQuit }) {
  // what is on stream right now and isn't a setting: the pinned message, and whether alerts are paused
  const live = { pinned: null, alertsPaused: false };
  const pin = m => { live.pinned = m; broadcast({ op: 'pin', msg: m }); };
  const send = (res, code, body, type = 'application/json; charset=utf-8', extra = {}) => {
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...BASE_HEADERS, 'Content-Security-Policy': LOCKED_CSP, ...extra });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };
  const httpError = (status, message) => Object.assign(new Error(message), { status });
  const readBody = req => new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      // Stop keeping the data; the answer closes the connection, so the rest is thrown away.
      if (size > MAX_BODY) { chunks.length = 0; reject(httpError(413, 'Request too large')); } else chunks.push(c);
    });
    req.on('end', () => {
      if (size > MAX_BODY) return;
      const data = Buffer.concat(chunks).toString('utf8');
      try {
        const body = data ? JSON.parse(data) : {};
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
        resolve(body);
      } catch { reject(httpError(400, 'Bad JSON')); }
    });
    req.on('error', reject);
  });

  const state = () => ({
    version: pkg.version,
    settings: settings.panelView(),
    sources: manager.list(),
    dataDir: DATA_DIR,
    overlayUrl: `http://localhost:${settings.get().advanced.port}/overlay`,
    alertsUrl: `http://localhost:${settings.get().advanced.port}/alerts`,
    viewersUrl: `http://localhost:${settings.get().advanced.port}/viewers`,
    followersUrl: `http://localhost:${settings.get().advanced.port}/followers`,
    stats: stats.view(),
    testKinds: testdata.KINDS,
    autostart: { supported: autostart.supported(), enabled: autostart.isEnabled() },
    overlays: overlayStatus(),
    update: updater.view(),
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    if (!toThisMachine(req)) return send(res, 403, { error: 'forbidden' });

    try {
      if (p.startsWith('/api/')) {
        if (!fromOwnPage(req)) {
          log('server', `blocked ${req.method} ${p} from ${req.headers.origin || req.headers['sec-fetch-site']}`);
          return send(res, 403, { error: 'Only the Mergio control panel can do that.' });
        }
        // A body must be JSON: plain forms and text can't be sent here from a web page without the browser asking first.
        if (req.method !== 'GET' && hasBody(req) && mediaType(req) !== 'application/json') return send(res, 415, { error: 'JSON only' });
        if (Number(req.headers['content-length']) > MAX_BODY) return send(res, 413, { error: 'Request too large' }, undefined, { Connection: 'close' });
        const body = req.method === 'GET' ? {} : await readBody(req);
        let m;
        if (p === '/api/state' && req.method === 'GET') return send(res, 200, state());
        if (p === '/api/settings' && req.method === 'PUT') {
          delete body.sources; // chats are only added and removed through /api/sources, which checks them
          delete body.templates; // saved looks only change through /api/templates
          const before = settings.get();
          const next = settings.update(body);
          broadcast({ op: 'settings', settings: settings.publicView(next) });
          if (next.advanced.tiktokSignApiKey !== before.advanced.tiktokSignApiKey) manager.reconnectPlatform('tiktok');
          if (next.advanced.facebookAccessToken !== before.advanced.facebookAccessToken) manager.reconnectPlatform('facebook');
          if (next.advanced.youtubeApiKey !== before.advanced.youtubeApiKey || (next.followers.enabled && !before.followers.enabled)) followers.refresh();
          return send(res, 200, state());
        }
        if (p === '/api/templates' && req.method === 'POST') {
          let next;
          try { next = settings.template(String(body.action), String(body.type), body.slot, body.name); } catch (e) { return send(res, 400, { error: e.message }); }
          broadcast({ op: 'settings', settings: settings.publicView(next) });
          return send(res, 200, state());
        }
        if (p === '/api/settings/reset' && req.method === 'POST') {
          const next = settings.reset(body.section);
          broadcast({ op: 'settings', settings: settings.publicView(next) });
          return send(res, 200, state());
        }
        if (p === '/api/sources' && req.method === 'POST') {
          try { manager.add(body.input); } catch (e) { return send(res, 400, { error: e.message }); }
          return send(res, 200, state());
        }
        if ((m = /^\/api\/sources\/([\w-]+)$/.exec(p)) && req.method === 'DELETE') { manager.remove(m[1]); return send(res, 200, state()); }
        if ((m = /^\/api\/sources\/([\w-]+)\/reconnect$/.exec(p)) && req.method === 'POST') { manager.reconnect(m[1]); return send(res, 200, state()); }
        if ((m = /^\/api\/sources\/([\w-]+)\/enabled$/.exec(p)) && req.method === 'POST') { manager.setEnabled(m[1], !!body.enabled); return send(res, 200, state()); }
        if (p === '/api/test' && req.method === 'POST') {
          const kinds = body.kind === 'burst' ? testdata.KINDS : [body.kind || 'random'];
          kinds.forEach((k, i) => setTimeout(() => manager.inject(testdata.make(k)), i * 350));
          return send(res, 200, { ok: true });
        }
        // Read aloud: the alerts overlay asks by message id only, so the words always come from Mergio's own copy of the alert.
        if (p === '/api/tts/voices' && req.method === 'GET') return send(res, 200, await tts.voices());
        if ((p === '/api/tts' || p === '/api/tts/sample') && req.method === 'GET') {
          const cur = settings.get();
          let text = tts.SAMPLE;
          if (p === '/api/tts') {
            const id = String(url.searchParams.get('id') || '').replace(/~r\d+$/, ''); // a replay from the Gifts dock is the same alert
            const msg = manager.events.findLast(x => x.id === id) || manager.recent.findLast(x => x.id === id);
            if (!msg) return send(res, 404, { error: 'No such alert' });
            text = tts.textFor(msg, cur.alerts, cur.general.blockedWords);
            if (!text) return send(res, 204, '');
          }
          try {
            const wav = await tts.speak(text, { voice: cur.alerts.ttsVoice, rate: cur.alerts.ttsRate });
            return send(res, 200, wav, 'audio/wav');
          } catch (e) {
            log('tts', `could not speak: ${e.message}`);
            // no voice on this computer: the overlay can still try the browser's own voice with these words
            return send(res, 503, { error: e.message, text });
          }
        }
        if (p === '/api/autostart' && req.method === 'POST') {
          try { await autostart.setEnabled(!!body.enabled); } catch (e) { return send(res, 400, { error: e.message }); }
          return send(res, 200, state());
        }
        if (p === '/api/followers/refresh' && req.method === 'POST') { followers.refresh(body.force !== false); return send(res, 200, { ok: true }); }
        if (p === '/api/clear' && req.method === 'POST') {
          // keep: messages that stay on the overlay while everything else is cleared
          const keep = messageIds(body.keep);
          manager.clear(keep);
          broadcast(keep.length ? { op: 'clear', keep } : { op: 'clear' });
          if (live.pinned && !keep.includes(live.pinned.id)) pin(null);
          return send(res, 200, { ok: true });
        }
        if (p === '/api/pin' && req.method === 'POST') {
          // one message stays at the top of the chat overlay until it is unpinned (id: null)
          if (body.id == null) { pin(null); return send(res, 200, { ok: true, pinned: null }); }
          const [id] = messageIds([body.id]);
          const m = id && manager.recent.find(x => x.id === id);
          if (!m) return send(res, 404, { error: 'That message is no longer in the chat list.' });
          pin(m);
          return send(res, 200, { ok: true, pinned: m.id });
        }
        if (p === '/api/alerts/control' && req.method === 'POST') {
          // pause holds new alerts in the queue (nothing is lost); skip ends the one on screen now
          if (!['pause', 'resume', 'skip'].includes(body.action)) return send(res, 400, { error: 'Unknown action.' });
          if (body.action !== 'skip') live.alertsPaused = body.action === 'pause';
          broadcast({ op: 'alerts', paused: live.alertsPaused, ...(body.action === 'skip' ? { skip: true } : {}) });
          return send(res, 200, { ok: true, paused: live.alertsPaused });
        }
        if (p === '/api/replay' && req.method === 'POST') {
          // plays an alert again on the alerts overlay (from the Gifts dock); the chat is left alone
          const m = manager.events.find(x => x.id === body.id);
          if (!m) return send(res, 404, { error: 'That alert is too old to replay.' });
          broadcast({ op: 'replay', msg: m });
          return send(res, 200, { ok: true });
        }
        if (p === '/api/obs/docks' && req.method === 'GET') return send(res, 200, await obsdocks.status(settings.get().advanced.port));
        if (p === '/api/obs/docks' && req.method === 'POST') {
          // OBS open: Mergio waits and adds the docks the moment it closes, then tells the panel
          const port = settings.get().advanced.port;
          const done = (err, st) => broadcast(err ? { op: 'obsdocks', error: err.message } : { op: 'obsdocks', added: true, docks: st });
          try { return send(res, 200, await obsdocks.installWhenClosed(port, done)); } catch (e) { return send(res, 400, { error: e.message }); }
        }
        if (p === '/api/obs/docks' && req.method === 'DELETE') {
          obsdocks.stopWaiting();
          return send(res, 200, await obsdocks.status(settings.get().advanced.port));
        }
        if (p === '/api/hide' && req.method === 'POST') {
          const ids = messageIds(body.ids);
          if (!ids.length) return send(res, 400, { error: 'Pick at least one message.' });
          manager.hide(ids);
          if (live.pinned && ids.includes(live.pinned.id)) pin(null);
          return send(res, 200, { ok: true, hidden: ids.length });
        }
        if (p === '/api/open-data' && req.method === 'POST') {
          const [cmd, args] = process.platform === 'win32' ? ['explorer.exe', [DATA_DIR]] : process.platform === 'darwin' ? ['open', [DATA_DIR]] : ['xdg-open', [DATA_DIR]];
          require('node:child_process').execFile(cmd, args, () => {});
          return send(res, 200, { ok: true });
        }
        if (p === '/api/update' && req.method === 'GET') return send(res, 200, updater.view());
        if (p === '/api/update/check' && req.method === 'POST') return send(res, 200, await updater.check());
        if (p === '/api/facebook/check' && req.method === 'POST') return send(res, 200, await checkFacebookToken(body.token));
        if (p === '/api/update/seen' && req.method === 'POST') return send(res, 200, updater.markSeen());
        if (p === '/api/update/install' && req.method === 'POST') {
          if (!updater.view().canInstall) return send(res, 400, { error: 'This copy of Mergio can’t update itself. Download the new version instead.' });
          // Progress arrives over the live connection; Mergio closes itself once the installer takes over.
          updater.install(onQuit).catch(e => log('update', `update failed: ${e.message}`));
          return send(res, 200, updater.view());
        }
        if (p === '/api/quit' && req.method === 'POST') { send(res, 200, { ok: true }); setTimeout(onQuit, 200); return; }
        if ((m = /^\/api\/pronouns\/(\w{1,40})$/.exec(p))) return send(res, 200, { pronouns: await pronouns(m[1].toLowerCase()) });
        return send(res, 404, { error: 'not found' });
      }

      let m;
      if ((m = /^\/avatar\/(twitch|kick)\/([\w.-]{1,40})$/.exec(p))) {
        // Wait a little for the lookup (the image simply loads a moment later); give up after 10s.
        let u = await Promise.race([avatars.resolve(m[1], m[2].toLowerCase()), new Promise(r => setTimeout(r, 10000, ''))]);
        if (!/^https:\/\/[^\s"<>]+$/.test(u || '')) u = ''; // only ever redirect to a picture on https
        return send(res, 302, '', 'text/plain', u ? { Location: u, 'Cache-Control': 'max-age=3600' } : { Location: `/avatar/default/${m[2]}`, 'Cache-Control': 'no-store' });
      }
      if ((m = /^\/avatar\/default\/(.{1,300})$/.exec(p))) return send(res, 200, defaultAvatar(m[1]), 'image/svg+xml', { 'Cache-Control': 'max-age=86400' });

      if (p === '/' ) return send(res, 302, '', 'text/plain', { Location: '/dashboard' });
      const file = p === '/overlay' || p === '/overlay/' ? 'overlay/index.html'
        : p === '/alerts' || p === '/alerts/' ? 'alerts/index.html'
        : p === '/viewers' || p === '/viewers/' ? 'viewers/index.html'
        : p === '/followers' || p === '/followers/' ? 'followers/index.html'
        : /^\/dock\/(chat|gifts|viewers)\/?$/.test(p) ? 'dock/index.html' // the OBS docks are one page that reads its name from the link
        : p === '/manifest.webmanifest' ? 'dashboard/manifest.webmanifest'
        : p === '/sw.js' ? 'dashboard/sw.js' // served from the root so it can look after /dashboard
        : p === '/favicon.ico' ? 'shared/app-192.png' // browsers (and OBS) ask for it even when a page names its icon
        : p === '/dashboard' || p === '/dashboard/' ? 'dashboard/index.html'
        : p.slice(1);
      const buf = readAsset(file);
      if (!buf) return send(res, 404, 'Not found', 'text/plain');
      const type = TYPES[path.extname(file)] || 'application/octet-stream';
      return send(res, 200, buf, type, { 'Cache-Control': 'no-cache', ...(type.startsWith('text/html') ? pageHeaders(file, req.headers.host) : {}) });
    } catch (e) {
      if (e.status) return send(res, e.status, { error: e.message }, undefined, e.status === 413 ? { Connection: 'close' } : {});
      log('server', e);
      return send(res, 500, { error: 'Something went wrong. See mergio.log in the data folder.' });
    }
  });

  /* ---------- live updates over WebSocket ---------- */
  // Websites can open WebSockets to any address, so the live connection checks who is asking, like the API does:
  // without this, any page open in the browser could read the chat and the settings as they change.
  const wss = new WebSocketServer({
    server, path: '/ws', maxPayload: 64 * 1024,
    verifyClient: ({ req }) => {
      const ok = toThisMachine(req) && fromOwnPage(req);
      if (!ok) log('server', `blocked live connection from ${req.headers.origin || 'unknown'}`);
      return ok;
    },
  });
  // ws re-emits the HTTP server's errors (e.g. port already in use); main.js handles those on the server itself.
  wss.on('error', () => {});
  /** Open overlays (not previews): how many, and whether one of them runs inside OBS. Same for the alerts overlay. */
  function overlayStatus() {
    const open = [...wss.clients].filter(c => c.overlay && c.readyState === 1);
    const of = kind => { const l = open.filter(c => c.overlay.kind === kind); return { count: l.length, obs: l.some(c => c.overlay.obs) }; };
    return { ...of('chat'), alerts: of('alerts'), viewers: of('viewers'), followers: of('followers') };
  }
  const broadcast = obj => {
    const data = JSON.stringify(obj);
    for (const c of wss.clients) if (c.readyState === 1) c.send(data);
  };
  wss.on('connection', (ws, req) => {
    // Overlays identify themselves so the control panel can show "Mergio is in OBS".
    const q = new URL(req.url, 'http://localhost').searchParams;
    const client = q.get('client');
    if (['overlay', 'alerts', 'viewers', 'followers'].includes(client)) {
      // OBS browser sources expose window.obsstudio (sent as obs=1); the user agent is a fallback.
      ws.overlay = { kind: client === 'overlay' ? 'chat' : client, obs: q.get('obs') === '1' || /\bOBS\//.test(req.headers['user-agent'] || '') };
      if (client === 'overlay' && !settings.get().advanced.overlaySeen) settings.update({ advanced: { overlaySeen: true } });
      ws.on('close', () => broadcast({ op: 'overlays', ...overlayStatus() }));
      broadcast({ op: 'overlays', ...overlayStatus() });
      if (client === 'followers') followers.refresh(false);
    }
    const dock = client === 'dock';
    ws.send(JSON.stringify({ op: 'hello', version: pkg.version, settings: settings.publicView(), sources: manager.list(), recent: manager.recent.slice(dock ? -150 : -60), stats: stats.view(), live, ...(dock ? { events: manager.events.slice(-200) } : {}) }));
  });
  manager.on('message', m => broadcast({ op: 'msg', msg: m }));
  manager.on('delete', d => broadcast({ op: 'delete', ...d }));
  manager.on('status', list => broadcast({ op: 'sources', sources: list }));
  updater.onChange(update => broadcast({ op: 'update', update }));
  stats.on('change', view => broadcast({ op: 'stats', stats: view }));
  // follower counts are looked up only while an overlay or the Follower goals page shows them
  followers.start(() => overlayStatus().followers.count > 0);

  return server;
}

module.exports = { createServer };
