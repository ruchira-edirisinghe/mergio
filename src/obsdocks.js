'use strict';
/* Adds Mergio's three OBS docks (chat, gifts, viewers) to OBS Studio as Custom Browser Docks.
   OBS keeps them in its settings file (user.ini since OBS 31, global.ini before) under [BasicWindow]
   ExtraBrowserDocks=[{"title","url","uuid"}]. OBS writes that file again when it closes, so Mergio only
   changes it while OBS is closed, and keeps a backup of the file the first time. When OBS is open, Mergio
   waits and adds the docks the moment OBS closes (installWhenClosed). */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { log } = require('./util');

const DOCKS = [
  { id: 'chat', title: 'Mergio Chat' },
  { id: 'gifts', title: 'Mergio Gifts' },
  { id: 'viewers', title: 'Mergio Viewers' },
];

function configDir() {
  if (process.platform === 'win32') return process.env.APPDATA ? path.join(process.env.APPDATA, 'obs-studio') : null;
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'obs-studio');
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'obs-studio');
}

/** The settings file that holds the docks: user.ini when it has a [BasicWindow] section, else global.ini. */
function settingsFile() {
  const dir = configDir();
  if (!dir) return null;
  for (const name of ['user.ini', 'global.ini']) {
    const f = path.join(dir, name);
    try { if (/^\[BasicWindow\]\s*$/m.test(fs.readFileSync(f, 'utf8'))) return f; } catch { /* not there */ }
  }
  const user = path.join(dir, 'user.ini');
  return fs.existsSync(user) ? user : fs.existsSync(path.join(dir, 'global.ini')) ? path.join(dir, 'global.ini') : null;
}

/** True while OBS Studio is open. When the check itself fails (tasklist timed out on a busy PC, for example)
    it also says true: writing the file while OBS is open would be undone when OBS closes. */
function obsRunning() {
  return new Promise(resolve => {
    if (process.platform === 'win32') {
      execFile('tasklist', ['/FI', 'IMAGENAME eq obs*', '/FO', 'CSV', '/NH'], { windowsHide: true, timeout: 15000 }, (err, out) => {
        if (err) return resolve(true);
        resolve(/^"obs(64|32)?\.exe"/im.test(out));
      });
    } else {
      // pgrep: exit 1 = no such process, anything else is an error
      execFile('pgrep', ['-x', process.platform === 'darwin' ? 'OBS' : 'obs'], { timeout: 15000 }, err => resolve(!err || err.code !== 1));
    }
  });
}

/** [lines, index of the ExtraBrowserDocks line or -1, index of the [BasicWindow] header or -1] */
function locate(text) {
  const lines = text.split(/\r?\n/);
  let section = '', header = -1, at = -1;
  lines.forEach((line, i) => {
    const m = /^\[(.+)\]\s*$/.exec(line);
    if (m) { section = m[1]; if (section === 'BasicWindow') header = i; return; }
    if (section === 'BasicWindow' && line.startsWith('ExtraBrowserDocks=')) at = i;
  });
  return [lines, at, header];
}

function readDocks(text) {
  const [lines, at] = locate(text);
  if (at < 0) return [];
  try { const list = JSON.parse(lines[at].slice('ExtraBrowserDocks='.length)); return Array.isArray(list) ? list : []; } catch { return []; }
}

const ours = (d, port) => typeof d?.url === 'string' && /^http:\/\/(localhost|127\.0\.0\.1):\d+\/dock\/(chat|gifts|viewers)\b/.test(d.url) && (!port || d.url.includes(`:${port}/`));

/** What OBS has right now. */
async function status(port) {
  const file = settingsFile();
  const base = { supported: !!configDir(), found: !!file, running: await obsRunning(), installed: [], waiting: !!waiter };
  if (!file) return base;
  try {
    const list = readDocks(fs.readFileSync(file, 'utf8'));
    base.installed = DOCKS.filter(d => list.some(x => ours(x, port) && x.url.includes(`/dock/${d.id}`))).map(d => d.id);
    base.otherPort = list.some(x => ours(x) && !ours(x, port));
  } catch { /* unreadable */ }
  return base;
}

/** Adds (or updates) the docks. ids: which of chat, gifts, viewers. */
async function install(port, ids = DOCKS.map(d => d.id)) {
  const file = settingsFile();
  if (!file) throw new Error('OBS Studio’s settings were not found on this computer. Start OBS once, close it, then try again.');
  if (await obsRunning()) throw Object.assign(new Error('Close OBS first: it saves its own settings when it closes and would undo this. Then press Install again.'), { running: true });
  const raw = fs.readFileSync(file);
  const bom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  const out = withDocks(raw.toString('utf8').replace(/^\uFEFF/, ''), port, ids);
  const backup = `${file}.mergio-backup`;
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  const tmp = `${file}.mergio-tmp`;
  fs.writeFileSync(tmp, (bom ? '\uFEFF' : '') + out);
  fs.renameSync(tmp, file);
  log('obs', `added the Mergio docks to ${file}`);
  return status(port);
}

/* ---------- waiting for OBS to close ---------- */
let waiter = null; // { timer, port, done }
const WAIT_EVERY = 3000, WAIT_MAX = 6 * 60 * 60 * 1000;

/** Adds the docks now when OBS is closed (returns the new status), else waits and adds them as soon as it
    closes (checked every few seconds, for up to 6 hours; returns the status with waiting: true). done(err,
    status) runs only for a wait, once the docks are added or it failed. */
async function installWhenClosed(port, done = () => {}) {
  if (!(await obsRunning())) {
    try { stopWaiting(); return await install(port); } catch (e) { if (!e.running) throw e; }
  }
  stopWaiting();
  const started = Date.now();
  const w = waiter = { port, done, timer: null };
  const tick = async () => {
    if (waiter !== w) return;
    if (Date.now() - started > WAIT_MAX) { waiter = null; return done(new Error('Stopped waiting for OBS to close. Press Install again when you are ready.')); }
    if (await obsRunning()) { w.timer = setTimeout(tick, WAIT_EVERY); return; }
    // OBS saves its settings while it shuts down: give it a moment after the process is gone, and check again
    await new Promise(r => setTimeout(r, 2000));
    if (waiter !== w) return;
    if (await obsRunning()) { w.timer = setTimeout(tick, WAIT_EVERY); return; }
    waiter = null;
    try { done(null, await install(port)); } catch (e) { if (e.running) { waiter = w; w.timer = setTimeout(tick, WAIT_EVERY); } else done(e); }
  };
  w.timer = setTimeout(tick, WAIT_EVERY);
  log('obs', 'OBS is open: the Mergio docks are added as soon as it closes');
  return status(port);
}

/** Stops waiting for OBS to close (Cancel). */
function stopWaiting() {
  if (waiter) clearTimeout(waiter.timer);
  waiter = null;
}

/** The settings text with Mergio's docks added: old Mergio docks are replaced, everything else stays as it was. */
function withDocks(text, port, ids = DOCKS.map(d => d.id)) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const keep = readDocks(text).filter(d => !ours(d));
  const add = DOCKS.filter(d => ids.includes(d.id)).map(d => ({ title: d.title, url: `http://localhost:${port}/dock/${d.id}`, uuid: crypto.randomUUID() }));
  const line = `ExtraBrowserDocks=${JSON.stringify([...keep, ...add])}`;
  const [lines, at, header] = locate(text);
  if (at >= 0) lines[at] = line;
  else if (header >= 0) lines.splice(header + 1, 0, line);
  else lines.push('', '[BasicWindow]', line);
  return lines.join(eol);
}

module.exports = { DOCKS, status, install, installWhenClosed, stopWaiting, withDocks, readDocks };
