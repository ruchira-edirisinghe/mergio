// Builds a single self-contained executable with Node's Single Executable Applications (SEA) feature.
//   npm run build         -> dist/OmniChat.exe (Windows) or dist/omnichat (macOS / Linux)
// Steps: bundle with esbuild -> embed public/ as SEA assets -> inject into a copy of the node binary.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, chmodSync, openSync, readSync, writeSync, closeSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const win = process.platform === 'win32', mac = process.platform === 'darwin';
const BUILD = join(root, 'build'), DIST = join(root, 'dist');
const exeName = win ? 'OmniChat.exe' : 'omnichat';
const exe = join(DIST, exeName);
const step = s => console.log(`\n> ${s}`);

rmSync(BUILD, { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true });
mkdirSync(DIST, { recursive: true });

step('Bundling with esbuild');
await build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true, platform: 'node', format: 'cjs', target: 'node20',
  outfile: join(BUILD, 'omnichat.cjs'),
  minify: true, legalComments: 'none', logLevel: 'warning',
  external: ['bufferutil', 'utf-8-validate'], // optional native speedups of `ws`
  define: { 'process.env.OMNICHAT_BUNDLED': '"1"' },
});

step('Collecting web assets');
const assets = {};
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else assets[relative(root, p).split('\\').join('/')] = p;
  }
};
walk(join(root, 'public'));
console.log(`  ${Object.keys(assets).length} files`);

step('Creating the SEA blob');
const seaConfig = join(BUILD, 'sea-config.json');
writeFileSync(seaConfig, JSON.stringify({
  main: join(BUILD, 'omnichat.cjs'),
  output: join(BUILD, 'sea-prep.blob'),
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: true,
  // Keep the memory footprint small: tiny young generation, capped heap, favour size over speed.
  execArgv: ['--max-semi-space-size=1', '--max-old-space-size=128', '--optimize-for-size'],
  assets,
}, null, 2));
execFileSync(process.execPath, ['--experimental-sea-config', seaConfig], { stdio: 'inherit' });

step(`Creating ${exeName}`);
rmSync(exe, { force: true });
copyFileSync(process.execPath, exe);
if (mac) execFileSync('codesign', ['--remove-signature', exe], { stdio: 'inherit' });
// Resources (icon, version) must be edited BEFORE the app is injected, or rcedit can hang / corrupt the blob.
if (win) {
  step('Setting icon and version info');
  const rcedit = join(root, 'node_modules', 'rcedit', 'bin', process.arch === 'x64' ? 'rcedit-x64.exe' : 'rcedit.exe');
  const v = pkg.version;
  execFileSync(rcedit, [exe,
    '--set-icon', join(root, 'assets', 'icon.ico'),
    '--set-file-version', v, '--set-product-version', v,
    '--set-version-string', 'ProductName', 'OmniChat',
    '--set-version-string', 'FileDescription', 'OmniChat - multi-platform chat overlay',
    '--set-version-string', 'CompanyName', 'OmniChat (open source)',
    '--set-version-string', 'LegalCopyright', `MIT License - ${pkg.author}`,
    '--set-version-string', 'OriginalFilename', exeName,
    '--set-version-string', 'InternalName', 'omnichat',
  ], { stdio: 'inherit' });

}

step('Injecting the app into the executable');
const postject = join(dirname(require.resolve('postject')), 'cli.js');
const args = [postject, exe, 'NODE_SEA_BLOB', join(BUILD, 'sea-prep.blob'), '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'];
if (mac) args.push('--macho-segment-name', 'NODE_SEA');
execFileSync(process.execPath, args, { stdio: 'inherit' });

if (win) {
  step('Switching to a windowless (GUI) app');
  // PE header: e_lfanew at 0x3C; Subsystem field is at e_lfanew + 0x5C. 2 = Windows GUI (no console window), 3 = console.
  const fd = openSync(exe, 'r+');
  const b = Buffer.alloc(4);
  readSync(fd, b, 0, 4, 0x3c);
  const sub = b.readUInt32LE(0) + 0x5c;
  writeSync(fd, Buffer.from([2, 0]), 0, 2, sub);
  closeSync(fd);
} else {
  chmodSync(exe, 0o755);
  if (mac) execFileSync('codesign', ['--sign', '-', exe], { stdio: 'inherit' });
}

const mb = (statSync(exe).size / 1048576).toFixed(1);
console.log(`\nDone: ${relative(root, exe)} (${mb} MB)`);
