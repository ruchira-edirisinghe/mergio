'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/* ---------- data directory (portable: next to the app when writable) ---------- */
function resolveDataDir() {
  const candidates = [];
  if (process.env.ZUNOCHAT_DATA) candidates.push(process.env.ZUNOCHAT_DATA);
  const exeDir = isSea() ? path.dirname(process.execPath) : path.resolve(__dirname, '..');
  candidates.push(path.join(exeDir, 'data'));
  const home = process.env.APPDATA || process.env.XDG_CONFIG_HOME || path.join(require('node:os').homedir(), '.config');
  candidates.push(path.join(home, 'ZUNO-CHAT'));
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      migrateLegacy(dir, path.join(home, 'OmniChat'));
      return dir;
    } catch { /* try next */ }
  }
  return process.cwd();
}

/** Settings from versions released under the old name (OmniChat) are carried over once. */
function migrateLegacy(dir, legacyDir) {
  const from = path.join(legacyDir, 'config.json'), to = path.join(dir, 'config.json');
  if (dir === legacyDir || fs.existsSync(to) || !fs.existsSync(from)) return;
  try { fs.copyFileSync(from, to); } catch { /* start fresh */ }
}

function isSea() {
  try { return require('node:sea').isSea(); } catch { return false; }
}

const DATA_DIR = resolveDataDir();
const LOG_FILE = path.join(DATA_DIR, 'zuno-chat.log');

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
