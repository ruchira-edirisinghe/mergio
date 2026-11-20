'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/* ---------- data directory ----------
 * Portable by default: data/ next to the app, so a copied folder keeps its setup.
 * Falls back to the user's settings folder when the app folder is read-only
 * (Program Files, /opt, /usr) and always inside a macOS .app bundle. */
function userConfigHome() {
  const os = require('node:os');
  if (process.platform === 'win32') return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support');
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
}

function writable(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const probe = path.join(dir, `.write-test-${process.pid}`);
  fs.writeFileSync(probe, '');
  fs.rmSync(probe, { force: true });
}

function resolveDataDir() {
  const candidates = [];
  if (process.env.MERGIO_DATA) candidates.push(process.env.MERGIO_DATA);
  const exeDir = isSea() ? path.dirname(process.execPath) : path.resolve(__dirname, '..');
  if (!/\.app[\\/]Contents[\\/]/.test(exeDir)) candidates.push(path.join(exeDir, 'data'));
  const home = userConfigHome();
  candidates.push(path.join(home, 'Mergio'));
  for (const dir of candidates) {
    try {
      writable(dir);
      migrateLegacy(dir, [path.join(home, 'OmniChat'), path.join(require('node:os').homedir(), '.config', 'OmniChat')]);
      return dir;
    } catch { /* try next */ }
  }
  return process.cwd();
}

/** Settings from versions released under the old name (OmniChat) are carried over once. */
function migrateLegacy(dir, legacyDirs) {
  const to = path.join(dir, 'config.json');
  if (fs.existsSync(to)) return;
  for (const legacy of legacyDirs) {
    const from = path.join(legacy, 'config.json');
    if (legacy === dir || !fs.existsSync(from)) continue;
    try { fs.copyFileSync(from, to); return; } catch { /* start fresh */ }
  }
}

function isSea() {
  try { return require('node:sea').isSea(); } catch { return false; }
}

const DATA_DIR = resolveDataDir();
const LOG_FILE = path.join(DATA_DIR, 'mergio.log');

/* ---------- tiny logger (file + console, file is trimmed at 1 MB) ---------- */
function log(scope, ...args) {
  const line = `${new Date().toISOString()} [${scope}] ${args.map(a => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`;
  try { process.stdout.write(line + '\n'); } catch { /* no console */ }
  try {
    const st = fs.statSync(LOG_FILE, { throwIfNoEntry: false });
    if (st && st.size > 1_000_000) fs.writeFileSync(LOG_FILE, '');
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch { /* ignore */ }
}

/* ---------- HTTP helpers ---------- */
async function fetchText(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', ...(opts.headers || {}) },
    signal: AbortSignal.timeout(opts.timeout || 15000),
  });
  const text = await res.text();
  if (!res.ok) { const e = new Error(`HTTP ${res.status} for ${url}`); e.status = res.status; e.body = text; throw e; }
  return text;
}

async function fetchJson(url, opts = {}) {
  return JSON.parse(await fetchText(url, { ...opts, headers: { Accept: 'application/json', ...(opts.headers || {}) } }));
}

/** Some sites (Kick) block Node's TLS fingerprint; the system curl gets through. */
function curlJson(url, body) {
  return new Promise((resolve, reject) => {
    const bin = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const args = ['-s', '-m', '15', '-A', UA, '-H', 'Accept: application/json'];
    if (body !== undefined) args.push('-H', 'Content-Type: application/json', '-X', 'POST', '--data-binary', JSON.stringify(body));
    args.push(url);
    execFile(bin, args, { maxBuffer: 8 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
      if (err) return reject(new Error(`curl failed: ${err.message}`));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error(`Unexpected response from ${new URL(url).host}`)); }
    });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Exponential backoff helper: 2s, 4s, 8s ... capped. */
function backoff(attempt, base = 2000, cap = 60000) {
  return Math.min(cap, base * 2 ** Math.min(attempt, 8)) + Math.floor(Math.random() * 500);
}

let idCounter = 0;
const uid = (p = 'm') => `${p}${Date.now().toString(36)}${(idCounter++).toString(36)}`;

module.exports = { UA, DATA_DIR, LOG_FILE, isSea, log, fetchText, fetchJson, curlJson, sleep, backoff, uid };
