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
      // Only Mergio's own folders get locked down, never a folder picked with MERGIO_DATA (it could be Documents).
      dataDirIsOwn = dir !== process.env.MERGIO_DATA;
      return dir;
    } catch { /* try next */ }
  }
  return process.cwd();
}
let dataDirIsOwn = false;

/**
 * The data folder holds the Facebook token and the TikTok key, so only the signed-in user (plus SYSTEM and
 * administrators on Windows) may open it. Other accounts on the same PC can't read the tokens.
 */
function protectDataDir(dir = DATA_DIR, done = () => {}) {
  if (dir === DATA_DIR && !dataDirIsOwn) return done(false);
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(dir, 0o700);
      // files owner-only; folders (the hidden browser's profile) owner-only too, but still openable by you
      for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); fs.chmodSync(p, fs.statSync(p).isDirectory() ? 0o700 : 0o600); }
      return done(true);
    } catch (e) { log('app', `could not protect the data folder: ${e.message}`); return done(false); }
  }
  const user = process.env.USERNAME;
  if (!user) return done(false);
  const who = process.env.USERDOMAIN ? `${process.env.USERDOMAIN}\\${user}` : user;
  const icacls = args => new Promise(res => execFile('icacls.exe', [dir, ...args, '/Q'], { windowsHide: true }, err => res(err)));
  // Grant first and only then drop the inherited permissions, so a failed grant can never lock the user out.
  (async () => {
    const err = await icacls(['/grant:r', `${who}:(OI)(CI)F`, '/grant:r', '*S-1-5-18:(OI)(CI)F', '/grant:r', '*S-1-5-32-544:(OI)(CI)F'])
      || await icacls(['/inheritance:r']);
    if (err) log('app', `could not protect the data folder: ${err.message.split('\n')[0]}`);
    done(!err);
  })();
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

/* ---------- keeping tokens out of logs and error messages ---------- */
const SECRET_PARAM = /([?&](?:access_token|input_token|client_secret|api_key|apikey|key|token|sign_?api_?key)=)[^&#\s"']+/gi;
const SECRET_VALUE = /\bEA[A-Za-z0-9]{30,}\b/g; // Facebook tokens
/** Hides tokens in URLs and text: "...?access_token=EAAB..." -> "...?access_token=[hidden]". */
const redact = text => String(text).replace(SECRET_PARAM, '$1[hidden]').replace(SECRET_VALUE, '[hidden]');

/* ---------- tiny logger (file + console, file is trimmed at 1 MB) ---------- */
function log(scope, ...args) {
  const line = redact(`${new Date().toISOString()} [${scope}] ${args.map(a => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`);
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
  if (!res.ok) { const e = new Error(`HTTP ${res.status} for ${redact(url)}`); e.status = res.status; e.body = text; throw e; }
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
      // curl is missing or can't be started here (Android, some Linux installs): try Node's own fetch instead.
      // (A curl that ran and failed has a number as its code; one that couldn't start has ENOENT, EACCES…)
      if (typeof err?.code === 'string') return resolve(fetchJson(url, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
      if (err) return reject(new Error(`curl failed: ${redact(err.message)}`));
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

module.exports = { UA, DATA_DIR, LOG_FILE, isSea, log, redact, protectDataDir, fetchText, fetchJson, curlJson, sleep, backoff, uid };
