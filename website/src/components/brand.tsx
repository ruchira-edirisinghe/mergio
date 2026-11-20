import { useId, type SVGProps } from 'react';

export type PlatformId = 'youtube' | 'twitch' | 'kick' | 'tiktok' | 'facebook';

/* Platform marks from Simple Icons (CC0 1.0), the same ones the Mergio app uses. */
const PATHS: Record<PlatformId, string> = {
  twitch: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z',
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  kick: 'M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z',
  tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  facebook: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
};

export const PLATFORMS: { id: PlatformId; name: string; color: string }[] = [
  { id: 'youtube', name: 'YouTube', color: '#ff0033' },
  { id: 'twitch', name: 'Twitch', color: '#9146ff' },
  { id: 'kick', name: 'Kick', color: '#53fc18' },
  { id: 'tiktok', name: 'TikTok', color: '#fe2c55' },
  { id: 'facebook', name: 'Facebook', color: '#0866ff' },
];
export const platformColor = (id: PlatformId) => PLATFORMS.find(p => p.id === id)!.color;
export const platformName = (id: PlatformId) => PLATFORMS.find(p => p.id === id)!.name;

/** A platform logo. `colored` paints it in the platform's own colour, otherwise it uses currentColor. */
export function PlatformIcon({ id, colored, ...props }: { id: PlatformId; colored?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d={PATHS[id]} fill={colored ? platformColor(id) : 'currentColor'} />
    </svg>
  );
}

/** The Mergio "M" mark (folded ribbon with a play button), drawn inline so it stays crisp at any size. */
export function MergioMark(props: SVGProps<SVGSVGElement>) {
  const u = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${u}`;
  return (
    <svg viewBox="0 0 528 528" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id={id('l')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7b3dff" /><stop offset=".55" stopColor="#5a32f0" /><stop offset="1" stopColor="#e03cf2" /></linearGradient>
        <linearGradient id={id('r')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e23cf6" /><stop offset=".5" stopColor="#ff2aa8" /><stop offset="1" stopColor="#ff1f5a" /></linearGradient>
        <linearGradient id={id('fl')} gradientUnits="userSpaceOnUse" x1="150" y1="60" x2="262" y2="250"><stop offset="0" stopColor="#6a36ff" /><stop offset=".5" stopColor="#2c1580" /><stop offset="1" stopColor="#0f0828" /></linearGradient>
        <linearGradient id={id('fr')} gradientUnits="userSpaceOnUse" x1="374" y1="60" x2="262" y2="250"><stop offset="0" stopColor="#d63cff" /><stop offset=".55" stopColor="#9a3cff" /><stop offset="1" stopColor="#5b1fb0" /></linearGradient>
        <linearGradient id={id('p')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#cfc8ef" /></linearGradient>
        <mask id={id('m')} maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="440">
          <rect width="520" height="440" fill="#fff" />
          <path d="M18 436L176 318L260 318L260 440L0 440Z" fill="#000" />
          <path d="M392 436L540 326L540 440L300 440Z" fill="#000" />
        </mask>
      </defs>
      <g transform="translate(4 44)">
        <g mask={`url(#${id('m')})`}>
          <path d="M150 82L262 222" stroke={`url(#${id('fl')})`} strokeWidth="108" fill="none" strokeLinejoin="round" />
          <path d="M262 222L374 82" stroke={`url(#${id('fr')})`} strokeWidth="108" fill="none" strokeLinejoin="round" />
          <path d="M66 470L150 82L188.1 129.6" stroke={`url(#${id('l')})`} strokeWidth="108" fill="none" strokeLinejoin="round" />
          <path d="M335.9 129.6L374 82L458 470" stroke={`url(#${id('r')})`} strokeWidth="108" fill="none" strokeLinejoin="round" />
        </g>
        <path d="M228 216L228 302L298 259Z" fill={`url(#${id('p')})`} stroke={`url(#${id('p')})`} strokeWidth="22" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** The full Mergio logo. `dark` = dark lettering for light backgrounds. */
export function Wordmark({ dark, className }: { dark?: boolean; className?: string }) {
  return <img src={dark ? '/brand/mergio-logo-dark-text.svg' : '/brand/mergio-logo.svg'} alt="Mergio" className={className} draggable={false} />;
}

export function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
