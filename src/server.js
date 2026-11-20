'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer } = require('ws');
const settings = require('./settings');
const testdata = require('./testdata');
const autostart = require('./autostart');
const avatars = require('./avatars');
const { isSea, fetchJson, log, DATA_DIR } = require('./util');
const pkg = require('../package.json');

const PUBLIC = path.resolve(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2' };

/** Reads a file from public/ (from disk in dev, from the embedded assets in the packaged exe). */
function readAsset(rel) {
  rel = rel.replace(/\\/g, '/').replace(/^\/+/, '');
  if (rel.includes('..')) return null;
  if (isSea()) {
    try { return Buffer.from(require('node:sea').getAsset(`public/${rel}`)); } catch { return null; }
  }
  try { return fs.readFileSync(path.join(PUBLIC, rel)); } catch { return null; }
}

const AVATAR_COLORS = ['#ff6b6b', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#a855f7', '#ec4899', '#84cc16'];
function defaultAvatar(name) {
  const n = decodeURIComponent(name || '?');
  const letter = (Array.from(n.replace(/^[@_\W]+/, ''))[0] || '?').toUpperCase().replace(/[<>&"]/g, '');
  let h = 0; for (const ch of n) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const c = AVATAR_COLORS[h % AVATAR_COLORS.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${c}"/><text x="32" y="42" font-family="Segoe UI,Arial,sans-serif" font-size="30" font-weight="700" text-anchor="middle" fill="#fff">${letter}</text></svg>`;
}

/* ---------- pronouns (Twitch, via the community pronouns.alejo.io service) ---------- */
let pronounNames = null;
const pronounCache = new Map();
async function pronouns(login) {
  if (pronounCache.has(login)) return pronounCache.get(login);
  try {
    pronounNames ||= Object.fromEntries(Object.entries(await fetchJson('https://api.pronouns.alejo.io/v1/pronouns')).map(([k, v]) => [k, v.singular ? v.subject : `${v.subject}/${v.object}`]));
    const r = await fetchJson(`https://api.pronouns.alejo.io/v1/users/${encodeURIComponent(login)}`);
    const out = [pronounNames[r.pronoun_id], r.alt_pronoun_id && pronounNames[r.alt_pronoun_id]?.split('/')[0]].filter(Boolean).join('/');
    pronounCache.set(login, out);
    return out;
  } catch { pronounCache.set(login, ''); return ''; }
}

function createServer(manager, { onQuit }) {
  const send = (res, code, body, type = 'application/json; charset=utf-8', extra = {}) => {
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };
  const readBody = req => new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Bad JSON')); } });
  });

  const state = () => ({
    version: pkg.version,
    settings: settings.get(),
    sources: manager.list(),
    dataDir: DATA_DIR,
    overlayUrl: `http://localhost:${settings.get().advanced.port}/overlay`,
    testKinds: testdata.KINDS,
    autostart: { supported: autostart.supported(), enabled: autostart.isEnabled() },
    overlays: overlayStatus(),
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    // Only answer requests addressed to this machine (blocks DNS-rebinding tricks from websites).
    const host = (req.headers.host || '').split(':')[0];
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return send(res, 403, { error: 'forbidden' });

    try {
      if (p.startsWith('/api/')) {
        if (req.method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) return send(res, 415, { error: 'JSON only' });
        const body = req.method === 'GET' ? {} : await readBody(req);
        let m;
        if (p === '/api/state' && req.method === 'GET') return send(res, 200, state());
        if (p === '/api/settings' && req.method === 'PUT') {
          const before = settings.get();
          const next = settings.update(body);
          broadcast({ op: 'settings', settings: settings.publicView(next) });
          if (body.advanced?.tiktokSignApiKey !== undefined && body.advanced.tiktokSignApiKey !== before.advanced.tiktokSignApiKey) manager.reconnectPlatform('tiktok');
          if (body.advanced?.facebookAccessToken !== undefined && body.advanced.facebookAccessToken !== before.advanced.facebookAccessToken) manager.reconnectPlatform('facebook');
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
        if (p === '/api/autostart' && req.method === 'POST') {
          try { await autostart.setEnabled(!!body.enabled); } catch (e) { return send(res, 400, { error: e.message }); }
          return send(res, 200, state());
        }
        if (p === '/api/clear' && req.method === 'POST') { manager.recent = []; broadcast({ op: 'clear' }); return send(res, 200, { ok: true }); }
        if (p === '/api/open-data' && req.method === 'POST') {
          const [cmd, args] = process.platform === 'win32' ? ['explorer.exe', [DATA_DIR]] : process.platform === 'darwin' ? ['open', [DATA_DIR]] : ['xdg-open', [DATA_DIR]];
          require('node:child_process').execFile(cmd, args, () => {});
          return send(res, 200, { ok: true });
        }
        if (p === '/api/quit' && req.method === 'POST') { send(res, 200, { ok: true }); setTimeout(onQuit, 200); return; }
        if ((m = /^\/api\/pronouns\/([\w]+)$/.exec(p))) return send(res, 200, { pronouns: await pronouns(m[1].toLowerCase()) });
        return send(res, 404, { error: 'not found' });
      }

      let m;
      if ((m = /^\/avatar\/(twitch|kick)\/([\w.-]+)$/.exec(p))) {
        // Wait a little for the lookup (the image simply loads a moment later); give up after 10s.
        const u = await Promise.race([avatars.resolve(m[1], m[2].toLowerCase()), new Promise(r => setTimeout(r, 10000, ''))]);
        return send(res, 302, '', 'text/plain', u ? { Location: u, 'Cache-Control': 'max-age=3600' } : { Location: `/avatar/default/${m[2]}`, 'Cache-Control': 'no-store' });
      }
      if ((m = /^\/avatar\/default\/(.+)$/.exec(p))) return send(res, 200, defaultAvatar(m[1]), 'image/svg+xml', { 'Cache-Control': 'max-age=86400' });

      if (p === '/' ) return send(res, 302, '', 'text/plain', { Location: '/dashboard' });
      const file = p === '/overlay' || p === '/overlay/' ? 'overlay/index.html'
        : p === '/dashboard' || p === '/dashboard/' ? 'dashboard/index.html'
        : p.slice(1);
      const buf = readAsset(file);
      if (!buf) return send(res, 404, 'Not found', 'text/plain');
      return send(res, 200, buf, TYPES[path.extname(file)] || 'application/octet-stream', { 'Cache-Control': 'no-cache' });
    } catch (e) {
      log('server', e);
      return send(res, 500, { error: e.message });
    }
  });

  /* ---------- live updates over WebSocket ---------- */
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
  // ws re-emits the HTTP server's errors (e.g. port already in use); main.js handles those on the server itself.
  wss.on('error', () => {});
  /** Open overlays (not previews): how many, and whether one of them runs inside OBS. */
  function overlayStatus() {
    const list = [...wss.clients].filter(c => c.overlay && c.readyState === 1);
    return { count: list.length, obs: list.some(c => c.overlay.obs) };
  }
  const broadcast = obj => {
    const data = JSON.stringify(obj);
    for (const c of wss.clients) if (c.readyState === 1) c.send(data);
  };
  wss.on('connection', (ws, req) => {
    const host = (req.headers.host || '').split(':')[0];
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return ws.close();
    // Overlays identify themselves so the control panel can show "Mergio is in OBS".
    const q = new URL(req.url, 'http://localhost').searchParams;
    if (q.get('client') === 'overlay') {
      // OBS browser sources expose window.obsstudio (sent as obs=1); the user agent is a fallback.
      ws.overlay = { obs: q.get('obs') === '1' || /\bOBS\//.test(req.headers['user-agent'] || '') };
      if (!settings.get().advanced.overlaySeen) settings.update({ advanced: { overlaySeen: true } });
      ws.on('close', () => broadcast({ op: 'overlays', ...overlayStatus() }));
      broadcast({ op: 'overlays', ...overlayStatus() });
    }
    ws.send(JSON.stringify({ op: 'hello', version: pkg.version, settings: settings.publicView(), sources: manager.list(), recent: manager.recent.slice(-60) }));
  });
  manager.on('message', m => broadcast({ op: 'msg', msg: m }));
  manager.on('delete', d => broadcast({ op: 'delete', ...d }));
  manager.on('status', list => broadcast({ op: 'sources', sources: list }));

  return server;
}

module.exports = { createServer };
