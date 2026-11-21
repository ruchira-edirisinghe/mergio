'use strict';
/* Checks GitHub for a newer Mergio when the app starts (and every few hours), and on Windows can
   download the new installer and run it silently: Mergio closes, updates itself and opens again. */
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { isSea, fetchJson, log, DATA_DIR } = require('./util');
const pkg = require('../package.json');

const REPO = 'ruchira-edirisinghe/mergio';
const API = `https://api.github.com/repos/${REPO}/releases?per_page=15`;
const WIN_ASSET = 'Mergio-Setup-windows-x64.exe';
const CHECK_EVERY = 6 * 60 * 60 * 1000;

const current = process.env.MERGIO_FAKE_VERSION || pkg.version; // the fake version is only for testing the popup
let info = { current, latest: null, available: false, notes: [], url: `https://github.com/${REPO}/releases/latest`, checkedAt: 0 };
let job = { state: 'idle', progress: 0, error: '' };
// "What's new" after an update: the last version whose notes the user has seen, kept next to the settings.
const SEEN_FILE = path.join(DATA_DIR, 'version.json');
let seen = null;
let installed = { version: current, notes: [], url: `https://github.com/${REPO}/releases/tag/v${current}`, publishedAt: null };
let listeners = [];

/** Release links shown in the control panel only ever point at Mergio's GitHub page. */
const RELEASES = `https://github.com/${REPO}/releases`;
const releaseLink = u => (typeof u === 'string' && u.startsWith(`${RELEASES}/`) && !/[\s"<>]/.test(u) ? u : `${RELEASES}/latest`);

/** 1.10.0 > 1.9.2; ignores a leading "v" and any "-beta" part. */
function newer(a, b) {
  const n = v => String(v || '').replace(/^v/i, '').split('-')[0].split('.').map(x => parseInt(x, 10) || 0);
  const [x, y] = [n(a), n(b)];
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}

/** Turns the "What's new" bullets of the release notes into [{ title, text }] with the markdown removed. */
function parseNotes(body) {
  const clean = s => s.replace(/\*\*|__|`/g, '').replace(/\*([^*]+)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
  const out = [];
  let text = String(body || '');
  const start = text.search(/^#+\s*What.s new/im);
  if (start >= 0) { text = text.slice(start).replace(/^.*\r?\n/, ''); const end = text.search(/^#+\s/m); if (end >= 0) text = text.slice(0, end); }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (!m) continue;
    const raw = m[1];
    const bold = raw.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    if (bold) out.push({ title: clean(bold[1]).replace(/[.:]$/, ''), text: clean(bold[2]) });
    else out.push({ title: '', text: clean(raw) });
    if (out.length >= 8) break;
  }
  return out;
}

/** Only the installed Windows app can update itself (the installer leaves unins000.exe next to it). */
function installDir() {
  if (process.platform !== 'win32' || !isSea()) return null;
  const dir = path.dirname(process.execPath);
  return fs.existsSync(path.join(dir, 'unins000.exe')) ? dir : null;
}

function view() {
  const whatsNew = { ...installed, show: !!seen && seen !== current };
  return { ...info, canInstall: !!(info.available && info.asset && installDir()), job, whatsNew };
}

/** Reads which version's notes were last shown. A brand-new user gets the tour instead, so they start "seen". */
function loadSeen(isNewUser) {
  try { seen = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')).seen || null; } catch { seen = null; }
  // Versions before this one never wrote the file: an existing user is coming from one of them.
  if (!seen) seen = isNewUser ? current : 'unknown';
  if (seen === current) saveSeen();
  else log('update', `updated to ${current} (last notes seen: ${seen})`);
}
function saveSeen() {
  seen = current;
  try { fs.writeFileSync(SEEN_FILE, JSON.stringify({ seen: current }, null, 2)); } catch (e) { log('update', `could not save ${SEEN_FILE}: ${e.message}`); }
}
/** The user closed the "What's new" popup. */
function markSeen() { saveSeen(); emit(); return view(); }

function emit() { for (const fn of listeners) { try { fn(view()); } catch { /* ignore */ } } }

async function check() {
  try {
    const list = (await fetchJson(API, { headers: { Accept: 'application/vnd.github+json' } }))
      .filter(r => !r.draft && !r.prerelease && r.tag_name)
      .sort((a, b) => (newer(a.tag_name, b.tag_name) ? -1 : newer(b.tag_name, a.tag_name) ? 1 : 0));
    const rel = list[0];
    if (!rel) throw new Error('no releases found');
    // Notes of the version that is running now, for the "What's new" popup after an update.
    const mine = list.find(r => !newer(r.tag_name, current) && !newer(current, r.tag_name));
    if (mine) installed = { version: current, notes: parseNotes(mine.body).slice(0, 8), url: releaseLink(mine.html_url), publishedAt: mine.published_at };
    const latest = String(rel.tag_name).replace(/^v/i, '');
    // The version ends up in a file name and the update script, so it has to be a plain version number.
    if (!/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(latest)) throw new Error(`unexpected release tag "${String(rel.tag_name).slice(0, 40)}"`);
    const asset = (rel.assets || []).find(a => a.name === WIN_ASSET);
    // GitHub publishes a SHA-256 for every release file; the download has to match it before it may run.
    const sha256 = /^sha256:([a-f0-9]{64})$/i.exec(asset?.digest || '')?.[1]?.toLowerCase() || null;
    // Someone a few versions behind sees what's new in all of them, newest first.
    const missed = list.filter(r => newer(r.tag_name, current));
    const notes = (missed.length ? missed : [rel]).flatMap(r => parseNotes(r.body)).slice(0, 8);
    info = {
      current, latest, available: newer(latest, current), behind: missed.length,
      notes, url: releaseLink(rel.html_url), publishedAt: rel.published_at, checkedAt: Date.now(),
      asset: asset && sha256 ? { url: asset.browser_download_url, size: asset.size, sha256 } : null,
    };
    if (info.available) log('update', `Mergio ${latest} is available (this is ${current})`);
    emit();
  } catch (e) { log('update', `could not check for updates: ${e.message}`); }
  return view();
}

/** Where release downloads may come from (GitHub sends the file from its own download servers). */
const TRUSTED_HOST = /^(github\.com|objects\.githubusercontent\.com|release-assets\.githubusercontent\.com)$/;

/**
 * Downloads url to target while hashing it, and only keeps the file when its size and SHA-256 match.
 * onProgress(0..1) is called as it goes.
 */
async function downloadVerified(url, target, { sha256, size = 0, onProgress = () => {}, trusted = TRUSTED_HOST } = {}) {
  if (!/^[a-f0-9]{64}$/.test(sha256 || '')) throw new Error('This update has no checksum, so it can’t be checked. Download it from GitHub instead.');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': `Mergio/${current}` } });
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
  const final = new URL(res.url || url);
  if (final.protocol !== 'https:' && trusted === TRUSTED_HOST) throw new Error('Unexpected download address');
  if (!trusted.test(final.hostname)) throw new Error(`Unexpected download address (${final.hostname})`);
  const total = Number(res.headers.get('content-length')) || size || 0;
  const hash = crypto.createHash('sha256');
  const file = fs.createWriteStream(target);
  let got = 0, last = 0;
  try {
    for await (const chunk of res.body) {
      got += chunk.length;
      hash.update(chunk);
      if (!file.write(chunk)) await new Promise(r => file.once('drain', r));
      if (total && Date.now() - last > 200) { last = Date.now(); onProgress(Math.min(0.99, got / total)); }
    }
    await new Promise((resolve, reject) => file.end(err => (err ? reject(err) : resolve())));
    if (size && got !== size) throw new Error('The download was incomplete. Please try again.');
    if (hash.digest('hex') !== sha256) throw new Error('The download didn’t match the published checksum, so Mergio didn’t install it. Please try again or download it from GitHub.');
  } catch (e) {
    file.destroy();
    try { fs.rmSync(target, { force: true }); } catch { /* ignore */ }
    throw e;
  }
  return target;
}

/** Downloads the installer with progress, then hands over to it and quits. */
async function install(onQuit) {
  const dir = installDir();
  if (!dir || !info.asset) throw new Error('This copy of Mergio can’t update itself. Download the new version from GitHub.');
  if (job.state === 'downloading' || job.state === 'installing') return view();
  const url = info.asset.url;
  if (!/^https:\/\/github\.com\/ruchira-edirisinghe\/mergio\/releases\/download\//.test(url)) throw new Error('Unexpected download address');
  job = { state: 'downloading', progress: 0, error: '' }; emit();
  // A new folder with a random name for every update, so nothing can be planted there beforehand.
  const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mergio-update-')), `Mergio-Setup-${info.latest}.exe`);
  try {
    await downloadVerified(url, target, { sha256: info.asset.sha256, size: info.asset.size, onProgress: p => { job.progress = p; emit(); } });
    log('update', `downloaded ${path.basename(target)}, SHA-256 matches the release`);
  } catch (e) {
    job = { state: 'error', progress: 0, error: e.message }; emit();
    throw e;
  }
  job = { state: 'installing', progress: 1, error: '' }; emit();
  log('update', `installing ${info.latest} from ${target}`);
  // A tiny helper waits for Mergio to close, runs the installer silently into the same folder
  // (it keeps the earlier choices like the desktop icon), then opens the new Mergio.
  const perUser = !/\\Program Files( \(x86\))?\\/i.test(dir);
  const q = s => `'${String(s).replace(/'/g, "''")}'`;
  const work = path.dirname(target);
  const setupArgs = `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART ${perUser ? '/CURRENTUSER' : '/ALLUSERS'} /DIR="${dir}" /LOG="${path.join(work, 'install.log')}"`;
  const helper = path.join(work, 'update.ps1');
  fs.writeFileSync(helper, [
    `$log = ${q(path.join(work, 'update.log'))}`,
    `"started $(Get-Date -Format o)" | Out-File $log -Encoding utf8`,
    `Wait-Process -Id ${process.pid} -Timeout 30 -ErrorAction SilentlyContinue`,
    'Start-Sleep -Milliseconds 500',
    'try {',
    `  $p = Start-Process -FilePath ${q(target)} -ArgumentList ${q(setupArgs)} -Wait -PassThru`,
    '  "installer finished with $($p.ExitCode)" | Out-File $log -Append -Encoding utf8',
    '} catch { "installer failed: $_" | Out-File $log -Append -Encoding utf8 }',
    `Start-Process -FilePath ${q(path.join(dir, path.basename(process.execPath)))} -ArgumentList '--no-open'`,
    '"reopened Mergio" | Out-File $log -Append -Encoding utf8',
  ].join('\r\n'), 'utf8');
  // "start" runs the helper outside Mergio's process tree, so it keeps going after Mergio closes
  // (a plain detached PowerShell never starts, and a normal child is closed together with Mergio).
  const child = spawn('cmd.exe', ['/d', '/c', `start "" /min powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "${helper}"`],
    { detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true });
  child.on('error', e => log('update', `could not start the installer: ${e.message}`));
  child.unref();
  setTimeout(onQuit, 1200);
  return view();
}

function start({ isNewUser = false } = {}) {
  loadSeen(isNewUser);
  // Fetch the notes straight away when the "What's new" popup is waiting for them.
  setTimeout(check, seen !== current ? 300 : 4000);
  setInterval(check, CHECK_EVERY).unref();
}

module.exports = { start, check, install, view, markSeen, newer, parseNotes, downloadVerified, onChange: fn => listeners.push(fn) };
