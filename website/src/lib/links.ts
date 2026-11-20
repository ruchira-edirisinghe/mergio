export const REPO = 'https://github.com/ruchira-edirisinghe/mergio';
export const RELEASES = `${REPO}/releases/latest`;
export const readme = (anchor: string) => `${REPO}#${anchor}`;
const asset = (file: string) => `${REPO}/releases/latest/download/${file}`;

export type OsId = 'windows' | 'portable' | 'mac' | 'linux';

export const DOWNLOADS: { id: OsId; os: string; note: string; href: string }[] = [
  { id: 'windows', os: 'Windows', note: 'Installer · 64-bit', href: asset('Mergio-Setup-windows-x64.exe') },
  { id: 'portable', os: 'Windows portable', note: 'No install needed', href: asset('Mergio-windows-x64-portable.zip') },
  { id: 'mac', os: 'macOS', note: 'Apple silicon · .dmg', href: asset('Mergio-macos-arm64.dmg') },
  { id: 'linux', os: 'Linux', note: '.deb (or .tar.gz on GitHub)', href: asset('Mergio-linux-x64.deb') },
];

/** Best guess of the visitor's OS, used to put their download first. */
export function guessOs(): OsId {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = navigator.userAgent;
  if (/Mac|iPhone|iPad/i.test(ua)) return 'mac';
  if (/Linux|X11/i.test(ua) && !/Android/i.test(ua)) return 'linux';
  return 'windows';
}
