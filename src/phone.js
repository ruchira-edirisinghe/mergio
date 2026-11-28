'use strict';
/* Mergio for Android. The phone app runs this file in its built-in Node.js (nodejs-mobile), so the phone
   connects to the chats itself, with the same connectors as the desktop app, and no PC is needed.
   The app's window shows /phone from this server on 127.0.0.1. Desktop-only parts (OBS docks, the
   Windows updater, start with Windows, the tray) are never started here.
   Arguments from the app: --data=<folder for settings and logs> --port=<port> */
const args = {};
for (const a of process.argv.slice(2)) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(a);
  if (m) args[m[1]] = m[2] ?? true;
}
// before anything reads them: where the settings live, and that this is the phone
if (args.data) process.env.MERGIO_DATA = args.data;
process.env.MERGIO_PHONE = '1';
if (!process.env.HOME && args.data) process.env.HOME = args.data;

const settings = require('./settings');
const { Manager } = require('./manager');
const { createServer } = require('./server');
const updater = require('./updater');
const { log, DATA_DIR } = require('./util');
const pkg = require('../package.json');

const port = Number(args.port) || 8787;
const manager = new Manager();
const server = createServer(manager, { onQuit: () => {} });

server.on('error', e => { log('app', e); process.exit(1); });
server.listen(port, '127.0.0.1', () => {
  log('app', `Mergio ${pkg.version} for Android running on port ${port}. Data: ${DATA_DIR}`);
  manager.startAll();
  // only to tell the phone when a new version is out (the app itself can't install it)
  updater.start({ isNewUser: !settings.get().advanced.welcomeSeen });
});

process.on('uncaughtException', e => log('app', 'uncaught', e.stack || e));
process.on('unhandledRejection', e => log('app', 'unhandled', e?.stack || e));
