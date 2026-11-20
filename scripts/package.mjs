// Builds the installers for the current operating system (run `npm run build` first).
//   Windows -> dist/release/Mergio-Setup-windows-x64.exe  (installer)
//              dist/release/Mergio-windows-x64-portable.zip
//   macOS   -> dist/release/Mergio-macos-<arch>.dmg
//   Linux   -> dist/release/Mergio-linux-<arch>.deb and .tar.gz
// Windows needs Inno Setup 6 (https://jrsoftware.org/isinfo.php). Set ISCC to its ISCC.exe if it isn't found.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const out = join(root, 'dist', 'release');
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

if (process.platform === 'win32') {
  const exe = join(root, 'dist', 'Mergio.exe');
  if (!existsSync(exe)) throw new Error('dist/Mergio.exe not found. Run `npm run build` first.');
  const iscc = [process.env.ISCC, 'D:\\Softwares\\InnoSetup\\ISCC.exe',
    join(process.env['ProgramFiles(x86)'] || '', 'Inno Setup 6', 'ISCC.exe'),
    join(process.env.ProgramFiles || '', 'Inno Setup 6', 'ISCC.exe'),
    join(process.env.LOCALAPPDATA || '', 'Programs', 'Inno Setup 6', 'ISCC.exe')].find(p => p && existsSync(p));
  if (!iscc) throw new Error('Inno Setup (ISCC.exe) not found. Install Inno Setup 6 or set the ISCC environment variable.');
  run(iscc, ['/Q', `/DAppVersion=${version}`, `/DSourceExe=${exe}`, `/DOutputDir=${out}`, join(root, 'packaging', 'windows', 'mergio.iss')]);

  // Portable zip: the exe plus docs; settings are kept in a data folder next to it.
  const stage = join(root, 'build', 'portable');
  rmSync(stage, { recursive: true, force: true }); mkdirSync(stage, { recursive: true });
  copyFileSync(exe, join(stage, 'Mergio.exe'));
  copyFileSync(join(root, 'README.md'), join(stage, 'README.md'));
  copyFileSync(join(root, 'LICENSE'), join(stage, 'LICENSE.txt'));
  run('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${stage}\\*' -DestinationPath '${join(out, 'Mergio-windows-x64-portable.zip')}' -Force`]);
} else {
  const bin = join(root, 'dist', 'mergio');
  if (!existsSync(bin)) throw new Error('dist/mergio not found. Run `npm run build` first.');
  const script = process.platform === 'darwin' ? join(root, 'packaging', 'macos', 'make-dmg.sh') : join(root, 'packaging', 'linux', 'make-packages.sh');
  run('sh', [script, version, bin, out]);
}
console.log(`\nInstallers are in ${out}`);
