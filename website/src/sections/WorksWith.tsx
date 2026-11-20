import type { CSSProperties } from 'react';

const APPS: [string, CSSProperties][] = [
  ['OBS Studio', { fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '-0.02em', fontSize: 17 }],
  ['STREAMLABS', { fontFamily: '"Arial Black", Arial, sans-serif', fontWeight: 900, letterSpacing: '0.08em', fontSize: 15 }],
  ['Meld Studio', { fontFamily: '"Trebuchet MS", sans-serif', fontWeight: 600, letterSpacing: '0.01em', fontSize: 17, fontStyle: 'italic' }],
  ['vMix', { fontFamily: 'Impact, "Arial Narrow", sans-serif', fontWeight: 400, letterSpacing: '0.05em', fontSize: 19 }],
  ['XSPLIT', { fontFamily: '"Courier New", monospace', fontWeight: 700, letterSpacing: '0.18em', fontSize: 15 }],
  ['TikTok LIVE Studio', { fontFamily: 'Verdana, sans-serif', fontWeight: 700, letterSpacing: '-0.03em', fontSize: 15 }],
  ['Windows', { fontFamily: 'Palatino, "Book Antiqua", serif', fontWeight: 500, letterSpacing: '0.03em', fontSize: 17 }],
  ['macOS', { fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 700, letterSpacing: '-0.01em', fontSize: 17 }],
  ['LINUX', { fontFamily: '"Times New Roman", serif', fontWeight: 400, letterSpacing: '0.12em', fontSize: 16 }],
];

export function WorksWith() {
  return (
    <section className="bg-[#F5F5F5] px-4 sm:px-6">
      <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
        <p className="text-black/70 text-base leading-relaxed">
          Works with the streaming apps<br className="hidden md:block" /> you already use, on any computer.
        </p>
        <div className="md:col-span-3 overflow-hidden marquee-mask" aria-label={APPS.map(a => a[0]).join(', ')}>
          <div className="backers-track">
            {[0, 1].map(copy => (
              <div key={copy} className="flex shrink-0 items-center" aria-hidden="true">
                {APPS.map(([name, style]) => <span key={name} className="mx-10 shrink-0 text-black/50 whitespace-nowrap" style={style}>{name}</span>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
