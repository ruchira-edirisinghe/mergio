export const REPO = 'https://github.com/ruchira-edirisinghe/mergio';
/** The live website (the same address is in index.html for link previews). */
export const SITE = 'https://mergio-stream-overlay-gamma.vercel.app';
export const RELEASES = `${REPO}/releases/latest`;
export const readme = (anchor: string) => `${REPO}#${anchor}`;
const asset = (file: string) => `${REPO}/releases/latest/download/${file}`;

export type OsId = 'windows' | 'portable' | 'mac' | 'linux' | 'android';

export const DOWNLOADS: { id: OsId; os: string; note: string; href: string }[] = [
  { id: 'windows', os: 'Windows', note: 'Installer', href: asset('Mergio-Setup-windows-x64.exe') },
  { id: 'portable', os: 'Windows portable', note: '.zip', href: asset('Mergio-windows-x64-portable.zip') },
  { id: 'mac', os: 'macOS', note: 'Apple silicon', href: asset('Mergio-macos-arm64.dmg') },
  { id: 'linux', os: 'Linux', note: '.deb', href: asset('Mergio-linux-x64.deb') },
  { id: 'android', os: 'Android', note: 'Phone app, .apk', href: asset('Mergio-android-arm64.apk') },
];

/** Best guess of the visitor's OS, used to put their download first. */
export function guessOs(): OsId {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/Mac|iPhone|iPad/i.test(ua)) return 'mac';
  if (/Linux|X11/i.test(ua) && !/Android/i.test(ua)) return 'linux';
  return 'windows';
}
