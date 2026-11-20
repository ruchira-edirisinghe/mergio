'use strict';
const { execFile } = require('node:child_process');
const settings = require('./settings');
const { Manager } = require('./manager');
const { createServer } = require('./server');
const { log, DATA_DIR } = require('./util');
const pkg = require('../package.json');

function openBrowser(url) {
  const [cmd, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  execFile(cmd, args, { windowsHide: true }, () => {});
}

const argv = new Set(process.argv.slice(2));
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
    if (!argv.has('--no-open') && !argv.has('--autostart')) openBrowser(dashboard);
    setTimeout(() => process.exit(0), 500);
  } else { log('app', e); process.exit(1); }
});

server.listen(port, '127.0.0.1', () => {
  log('app', `Mergio ${pkg.version} running. Dashboard: ${dashboard}  Overlay: http://localhost:${port}/overlay  Data: ${DATA_DIR}`);
  manager.startAll();
  if (shouldOpen) openBrowser(dashboard);
});

process.on('uncaughtException', e => log('app', 'uncaught', e.stack || e));
process.on('unhandledRejection', e => log('app', 'unhandled', e?.stack || e));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { manager.stopAll(); process.exit(0); });
