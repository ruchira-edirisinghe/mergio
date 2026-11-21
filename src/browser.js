'use strict';
/* A hidden Edge / Chrome / Chromium window that loads a page and returns its HTML. TikTok and Facebook
   block plain web requests, so follower counts for them are read from the real page this way. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');

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

/** Loads url in a hidden browser and returns the page's HTML after its scripts ran. */
function dumpDom(url, timeout = 60000) {
  const exe = findBrowser();
  if (!exe) return Promise.reject(new Error('needs Chrome or Edge installed'));
  return new Promise((resolve, reject) => {
    execFile(exe, ['--headless=new', `--user-data-dir=${path.join(os.tmpdir(), 'mergio-headless')}`, '--disable-gpu', '--mute-audio', '--no-first-run', '--virtual-time-budget=10000', '--dump-dom', url],
      { timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (err, stdout) => (err && !stdout ? reject(new Error(`browser: ${err.message}`)) : resolve(String(stdout))));
  });
}

module.exports = { findBrowser, dumpDom };
