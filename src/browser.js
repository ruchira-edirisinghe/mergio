'use strict';
/* A hidden Edge / Chrome / Chromium window that loads a page and returns its HTML. TikTok and Facebook
   block plain web requests, so follower counts for them are read from the real page this way. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { DATA_DIR } = require('./util');

let found;
function findBrowser() {
  if (found !== undefined) return found;
  const local = process.env.LOCALAPPDATA || '';
  const candidates = process.platform === 'win32' ? [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(local, 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  ] : process.platform === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ] : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge', '/snap/bin/chromium'];
  found = candidates.find(c => { try { return fs.statSync(c).isFile(); } catch { return false; } }) || null;
  return found;
}

/** The only pages the hidden browser may open: public TikTok profiles and Facebook Pages. */
const ALLOWED = /^https:\/\/www\.(tiktok|facebook)\.com\/[^\s"]*$/;

// Flags that keep the hidden browser to the one page: no extensions, sync, background downloads or prompts.
const FLAGS = ['--headless=new', '--disable-gpu', '--mute-audio', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-sync', '--disable-background-networking', '--disable-component-update',
  '--disable-default-apps', '--deny-permission-prompts', '--virtual-time-budget=10000'];

// The hidden browser's own profile lives in Mergio's data folder, which only you can open. (The temp folder can be
// shared with other accounts on macOS and Linux, so someone else could have put a profile there first.)
const PROFILE = path.join(DATA_DIR, 'browser-profile');
// Copies before 1.5.1 kept it in the temp folder; on Windows that folder is yours alone, so tidy it away once.
if (process.platform === 'win32') fs.rm(path.join(os.tmpdir(), 'mergio-headless'), { recursive: true, force: true }, () => {});

// One hidden browser at a time (each one is a full browser), whatever asks for pages.
let queue = Promise.resolve();

/** Loads url in a hidden browser and returns the page's HTML after its scripts ran. */
function dumpDom(url, timeout = 60000) {
  if (!ALLOWED.test(String(url))) return Promise.reject(new Error('browser: that page is not allowed'));
  const exe = findBrowser();
  if (!exe) return Promise.reject(new Error('needs Chrome or Edge installed'));
  const run = () => new Promise((resolve, reject) => {
    execFile(exe, [...FLAGS, `--user-data-dir=${PROFILE}`, '--dump-dom', url],
      { timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (err, stdout) => (err && !stdout ? reject(new Error(`browser: ${err.message}`)) : resolve(String(stdout))));
  });
  const job = queue.then(run, run);
  queue = job.catch(() => {});
  return job;
}

module.exports = { findBrowser, dumpDom, ALLOWED, PROFILE };
