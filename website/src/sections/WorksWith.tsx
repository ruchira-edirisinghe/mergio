import { Clapperboard, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { APP_LOGOS } from '../components/logos';
import { Reveal } from '../components/Reveal';

function Logo({ id }: { id: string }) {
  return <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="currentColor" aria-hidden="true"><path d={APP_LOGOS[id]} /></svg>;
}

const APPS: [ReactNode, string][] = [
  [<Logo id="obsstudio" />, 'OBS Studio'],
  [<Logo id="streamlabs" />, 'Streamlabs'],
  [<Logo id="tiktok" />, 'TikTok LIVE Studio'],
  [<Logo id="xsplit" />, 'XSplit'],
  [<Video className="h-6 w-6 shrink-0" />, 'Meld Studio'],
  [<Clapperboard className="h-6 w-6 shrink-0" />, 'vMix'],
  [<Logo id="windows" />, 'Windows'],
  [<Logo id="apple" />, 'macOS'],
  [<Logo id="linux" />, 'Linux'],
  [<Logo id="android" />, 'Android'],
];

export function WorksWith() {
  return (
    <section className="bg-ink px-4 sm:px-6">
      <Reveal className="max-w-[88rem] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-center">
        <p className="text-white/70 text-base leading-relaxed">
          Works with the apps<br className="hidden lg:block" /> you already stream with.
        </p>
        <div className="lg:col-span-3 overflow-hidden marquee-mask" aria-label={APPS.map(a => a[1]).join(', ')}>
          <div className="backers-track">
            {[0, 1].map(copy => (
              <div key={copy} className="flex shrink-0 items-center" aria-hidden="true">
                {APPS.map(([icon, name]) => (
                  <span key={name} className="mx-6 sm:mx-8 inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[17px] font-semibold text-white/50">
                    {icon}{name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
