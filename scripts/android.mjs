// Builds Mergio for Android: the phone runs Mergio itself (Node.js for Android, from nodejs-mobile) and shows
// the phone screens (public/phone) in the app.
//   npm run android            -> dist/release/Mergio-android-arm64.apk and Mergio-android-armv7.apk
//   npm run android -- --debug --abis=x86_64   (a debug build for the emulator)
// Needs JDK 17 and the Android SDK (ANDROID_HOME) with NDK 27.3 and CMake 3.22.1.
// Release signing: android/keystore.properties or the MERGIO_KEYSTORE* environment variables (see android/app/build.gradle).
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const ANDROID = join(root, 'android'), APP = join(ANDROID, 'app');
const PROJECT = join(APP, 'src/main/assets/nodejs-project');
const LIBNODE = join(APP, 'libnode');
const win = process.platform === 'win32';
const args = process.argv.slice(2);
const debug = args.includes('--debug');
// only the ABIs nodejs-mobile ships; anything else on the command line is ignored
const ABIS = ['arm64-v8a', 'armeabi-v7a', 'x86_64'];
const asked = (args.find(a => a.startsWith('--abis='))?.slice(7) || 'arm64-v8a,armeabi-v7a').split(',');
const abis = ABIS.filter(a => asked.includes(a)).join(',') || 'arm64-v8a,armeabi-v7a';
const step = s => console.log(`\n> ${s}`);

// Node.js for Android: a pinned release, checked against its SHA-256 before it is used
const NODE_MOBILE = {
  version: '18.20.4',
  url: 'https://github.com/nodejs-mobile/nodejs-mobile/releases/download/v18.20.4/nodejs-mobile-v18.20.4-android.zip',
  sha256: 'bd7321eaa1a7602fbe0bb87302df2d79d87835cf4363fbdd17c350dbb485c2af',
};

async function nodeMobile() {
  const stamp = join(LIBNODE, 'version.txt');
  let have = '';
  try { have = readFileSync(stamp, 'utf8').trim(); } catch { /* not downloaded yet */ }
  if (have === NODE_MOBILE.version) return console.log(`  nodejs-mobile ${NODE_MOBILE.version} is there`);
  step(`Downloading Node.js for Android (nodejs-mobile ${NODE_MOBILE.version})`);
  const res = await fetch(NODE_MOBILE.url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const zip = Buffer.from(await res.arrayBuffer());
  const sum = createHash('sha256').update(zip).digest('hex');
  if (sum !== NODE_MOBILE.sha256) throw new Error(`nodejs-mobile checksum mismatch: ${sum}`);
  rmSync(LIBNODE, { recursive: true, force: true });
  mkdirSync(LIBNODE, { recursive: true });
  const file = join(LIBNODE, 'nodejs-mobile.zip');
  writeFileSync(file, zip);
  // Windows 10+ tar reads zip files; Linux and macOS have unzip
  if (win) execFileSync(join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tar.exe'), ['-xf', file, '-C', LIBNODE], { stdio: 'inherit' });
  else execFileSync('unzip', ['-q', file, '-d', LIBNODE], { stdio: 'inherit' });
  rmSync(file);
  // the zip has one top folder: move bin/ and include/ up
  const top = readdirSync(LIBNODE).find(n => existsSync(join(LIBNODE, n, 'bin')));
  if (top) { for (const n of ['bin', 'include']) cpSync(join(LIBNODE, top, n), join(LIBNODE, n), { recursive: true }); rmSync(join(LIBNODE, top), { recursive: true, force: true }); }
  if (!existsSync(join(LIBNODE, 'bin/arm64-v8a/libnode.so'))) throw new Error('libnode.so not found in the nodejs-mobile download');
  writeFileSync(stamp, NODE_MOBILE.version);
}

// Some dependencies use the RegExp v flag (Node 20+). Node 18 on the phone gets the u flag instead.
const REGEXP_V = "(()=>{try{new RegExp('','v')}catch{const R=RegExp,fix=f=>typeof f==='string'?f.replace('v','u'):f;globalThis.RegExp=new Proxy(R,{construct:(t,[p,f])=>new t(p,fix(f)),apply:(t,s,[p,f])=>t(p,fix(f))})}})();";

// Node.js for Android has no full Unicode data (ICU), so regexes like /[\p{L}]/u don't compile there. Mergio's
// own regexes use \p{...} only inside [...] classes: spell those out as code point ranges, made here by a Node that
// has the Unicode data.
const ranges = new Map();
function spellOut(name) {
  if (ranges.has(name)) return ranges.get(name);
  const re = new RegExp(`\\p{${name}}`, 'u');
  const hex = n => `\\u{${n.toString(16)}}`;
  let out = '', start = -1;
  for (let c = 0; c <= 0x110000; c++) {
    const hit = c < 0x110000 && !(c >= 0xd800 && c <= 0xdfff) && re.test(String.fromCodePoint(c));
    if (hit && start < 0) start = c;
    else if (!hit && start >= 0) { out += start === c - 1 ? hex(start) : `${hex(start)}-${hex(c - 1)}`; start = -1; }
  }
  ranges.set(name, out);
  return out;
}
const unicodeClasses = {
  name: 'unicode-classes',
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/].*\.js$/ }, async ({ path }) => {
      const text = readFileSync(path, 'utf8');
      if (!text.includes('\\p{')) return null;
      return { contents: text.replace(/\\p\{(\w+)\}/g, (_, n) => spellOut(n)), loader: 'js' };
    });
  },
};

// Node.js for Android is built without Intl. Some dependencies (got, used for TikTok) make an Intl.ListFormat
// when they load: give them a small English stand-in. Mergio's own code already copes without Intl.
const NO_INTL = "(()=>{if(typeof Intl!=='undefined')return;const s=String;class ListFormat{constructor(l,o){this.o=o||{}}format(a){a=[...a];const w=this.o.type==='disjunction'?' or ':' and ';return a.length<2?a.join(''):a.slice(0,-1).join(', ')+w+a[a.length-1]}}class NumberFormat{format(n){return s(n)}formatToParts(n){return[{type:'integer',value:s(n)}]}resolvedOptions(){return{locale:'en'}}}class DateTimeFormat{format(d){return new Date(d??Date.now()).toISOString()}resolvedOptions(){return{locale:'en',timeZone:'UTC'}}}class Collator{compare(a,b){return a<b?-1:a>b?1:0}}class PluralRules{select(n){return n===1?'one':'other'}}globalThis.Intl={ListFormat,NumberFormat,DateTimeFormat,Collator,PluralRules,getCanonicalLocales:l=>[].concat(l||[])}})();";

async function bundle() {
  step('Bundling Mergio for the phone');
  rmSync(PROJECT, { recursive: true, force: true });
  await build({
    entryPoints: [join(root, 'src/phone.js')],
    bundle: true, platform: 'node', format: 'cjs', target: 'node18',
    outfile: join(PROJECT, 'app/main.cjs'),
    minify: true, legalComments: 'none', logLevel: 'warning',
    external: ['bufferutil', 'utf-8-validate'],
    banner: { js: NO_INTL + REGEXP_V },
    plugins: [unicodeClasses],
    define: { 'process.env.MERGIO_BUNDLED': '"1"' },
  });
  // only the pages the phone shows
  for (const dir of ['phone', 'shared']) cpSync(join(root, 'public', dir), join(PROJECT, 'public', dir), { recursive: true });
  writeFileSync(join(PROJECT, 'package.json'), JSON.stringify({ name: 'mergio-phone', version: pkg.version, private: true }));
}

function gradle() {
  step(`Building the ${debug ? 'debug' : 'release'} app (${abis})`);
  const gradlew = join(ANDROID, win ? 'gradlew.bat' : 'gradlew');
  const task = [debug ? 'assembleDebug' : 'assembleRelease', `-Pabis=${abis}`, '--console=plain'];
  // a .bat file needs cmd on Windows
  if (win) execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/c', gradlew, ...task], { cwd: ANDROID, stdio: 'inherit' });
  else execFileSync(gradlew, task, { cwd: ANDROID, stdio: 'inherit' });
  const type = debug ? 'debug' : 'release';
  const outDir = join(APP, 'build/outputs/apk', type);
  const dist = join(root, 'dist/release');
  mkdirSync(dist, { recursive: true });
  const NAMES = { 'arm64-v8a': 'arm64', 'armeabi-v7a': 'armv7', x86_64: 'x86_64' };
  for (const f of readdirSync(outDir).filter(n => n.endsWith('.apk'))) {
    const abi = Object.keys(NAMES).find(a => f.includes(`-${a}-`));
    const name = `Mergio-android-${NAMES[abi] || 'universal'}${debug ? '-debug' : ''}.apk`;
    copyFileSync(join(outDir, f), join(dist, name));
    console.log(`  dist/release/${name}`);
  }
}

await nodeMobile();
await bundle();
gradle();
