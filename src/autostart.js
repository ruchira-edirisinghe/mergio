'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { isSea, log } = require('./util');

/** "Start with Windows": a shortcut in the user's Startup folder that starts the app quietly at sign-in. */
const supported = () => process.platform === 'win32' && isSea();
const shortcutPath = () => path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'Mergio.lnk');
const isEnabled = () => supported() && fs.existsSync(shortcutPath());

function setEnabled(on) {
  return new Promise((resolve, reject) => {
    if (!supported()) return reject(new Error('Start with Windows is only available in the Windows app (Mergio.exe).'));
    const lnk = shortcutPath();
    try { fs.rmSync(path.join(path.dirname(lnk), 'OmniChat.lnk'), { force: true }); } catch { /* shortcut from the old name */ }
    if (!on) { try { fs.rmSync(lnk, { force: true }); } catch (e) { return reject(e); } return resolve(false); }
    const q = s => s.replace(/'/g, "''");
    const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${q(lnk)}');$s.TargetPath='${q(process.execPath)}';$s.Arguments='--autostart';$s.WorkingDirectory='${q(path.dirname(process.execPath))}';$s.Description='Mergio chat overlay';$s.Save()`;
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true }, err => {
      if (err) { log('autostart', err.message); return reject(new Error('Could not create the startup shortcut.')); }
      resolve(true);
    });
  });
}

module.exports = { supported, isEnabled, setEnabled };
