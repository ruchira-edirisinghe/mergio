'use strict';
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const settings = require('./settings');
const { Manager } = require('./manager');
const { createServer } = require('./server');
const updater = require('./updater');
const { log, DATA_DIR, protectDataDir } = require('./util');
const pkg = require('../package.json');

function openBrowser(url) {
  const [cmd, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  execFile(cmd, args, { windowsHide: true }, () => {});
}

/** Chrome, Brave and other Chromium browsers put installed web apps in "<Browser> Apps" Start menu folders. */
function installedAppShortcut() {
  if (process.platform !== 'win32' || !process.env.APPDATA) return null;
  const programs = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  try {
    for (const d of fs.readdirSync(programs, { withFileTypes: true })) {
      if (!d.isDirectory() || !/ Apps$/i.test(d.name)) continue;
      const lnk = path.join(programs, d.name, 'Mergio.lnk');
      if (fs.existsSync(lnk)) return lnk;
    }
  } catch { /* no Start menu */ }
  return null;
}

/** Shows the control panel: in its own app window when it's installed as an app, otherwise in the browser. */
function openDashboard(url) {
  const app = installedAppShortcut();
  if (app) execFile('explorer.exe', [app], { windowsHide: true }, () => {});
  else openBrowser(url);
}

const argv = new Set(process.argv.slice(2));
// Started from the "Start Mergio" button of the app window (mergio://start): that window reconnects by itself.
if (process.argv.slice(2).some(a => /^mergio:/i.test(a))) argv.add('--no-open');
const port = Number(process.env.MERGIO_PORT) || settings.get().advanced.port;
const dashboard = `http://localhost:${port}/dashboard`;
// Launched by hand (shortcut, double-click): always show the control panel.
// Launched at sign-in (--autostart): only when the user asked for it. --no-open never opens it.
const shouldOpen = !argv.has('--no-open') && (!argv.has('--autostart') || settings.get().advanced.openDashboardOnStart);

const manager = new Manager();
const server = createServer(manager, {
  onQuit: () => { log('app', 'quit requested from dashboard'); manager.stopAll(); server.close(); process.exit(0); },
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    // Already running (or the port is taken): just show the dashboard of the running copy.
    log('app', `port ${port} is in use; opening the running instance`);
    if (!argv.has('--no-open') && !argv.has('--autostart')) openDashboard(dashboard);
    setTimeout(() => process.exit(0), 500);
  } else { log('app', e); process.exit(1); }
});

server.listen(port, '127.0.0.1', () => {
  log('app', `Mergio ${pkg.version} running. Dashboard: ${dashboard}  Overlay: http://localhost:${port}/overlay  Data: ${DATA_DIR}`);
  manager.startAll();
  protectDataDir();
  updater.start({ isNewUser: !settings.get().advanced.welcomeSeen });
  if (shouldOpen) openDashboard(dashboard);
});

process.on('uncaughtException', e => log('app', 'uncaught', e.stack || e));
process.on('unhandledRejection', e => log('app', 'unhandled', e?.stack || e));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { manager.stopAll(); process.exit(0); });
