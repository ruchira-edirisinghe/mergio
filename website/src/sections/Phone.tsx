import type { ReactNode } from 'react';
import { BellRing, Filter, ImagePlus, Smartphone, Speech, WifiOff, type LucideIcon } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { PillLink, Eyebrow } from '../components/ui';
import { DOWNLOADS, readme } from '../lib/links';

const POINTS: [LucideIcon, string, string][] = [
  [WifiOff, 'No PC needed', 'Mergio runs on the phone itself. Leave the PC off and the chat still comes in.'],
  [Filter, 'The same chat as your overlay', 'YouTube, Twitch, TikTok and Facebook together, with your filters, alerts and viewer counts.'],
  [Speech, 'Hands free', 'Read messages aloud, buzz for gifts and keep the screen on while you stream.'],
  [ImagePlus, 'Add to status', 'When you go live, one tap puts your live picture and every stream link on your WhatsApp status.'],
];

const android = DOWNLOADS.find(d => d.id === 'android')!;

function Point({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[.06] text-white ring-1 ring-white/10"><Icon className="h-5 w-5" /></span>
      <span>
        <span className="block text-lg font-medium text-white">{title}</span>
        <span className="block text-base leading-relaxed text-white/60">{children}</span>
      </span>
    </li>
  );
}

/** The Android app: a real screenshot of its Chat screen in a phone frame. */
function PhoneShot() {
  return (
    <div className="relative mx-auto w-[min(100%,300px)]">
      <div className="pointer-events-none absolute -inset-10 rounded-full bg-[#7c4dff]/25 blur-3xl" />
      <div className="relative anim-float">
        <div className="rounded-[2.6rem] bg-[#1c1a26] p-2.5 shadow-[0_30px_80px_-20px_rgba(124,77,255,.55)] ring-1 ring-white/15">
          <div className="relative overflow-hidden rounded-[2.1rem] bg-ink">
            <span className="absolute left-1/2 top-2 z-10 h-5 w-5 -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10" />
            <img src="/phone-chat.webp" width={780} height={1688} loading="lazy" decoding="async" draggable={false}
              alt="The Mergio Android app showing YouTube, Twitch, TikTok and Facebook chat in one list, with a Super Chat, a TikTok gift and Bits highlighted"
              className="block h-auto w-full pt-6" />
          </div>
        </div>
        <span className="absolute -right-4 top-24 inline-flex items-center gap-2 rounded-2xl bg-surface/90 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 backdrop-blur-md sm:-right-10">
          <BellRing className="h-4 w-4 text-[#ffb02e]" />Buzzes for gifts
        </span>
      </div>
    </div>
  );
}

export function Phone() {
  return (
    <section id="android" className="bg-ink px-4 sm:px-6 pb-16 md:pb-24 scroll-mt-4">
      <div className="mx-auto max-w-[88rem] overflow-hidden rounded-3xl bg-surface p-6 ring-1 ring-white/[.07] sm:p-10 lg:p-14"
        style={{ backgroundImage: 'radial-gradient(at 0% 0%, rgba(124,77,255,.18) 0, transparent 45%), radial-gradient(at 100% 100%, rgba(255,45,143,.14) 0, transparent 50%)' }}>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)] lg:gap-16">
          <Reveal variant="left">
            <Eyebrow><span className="inline-flex items-center gap-2"><Smartphone className="h-4 w-4" />New in 1.8: Add to status</span></Eyebrow>
            <h2 className="mb-5 text-4xl font-medium leading-tight md:text-5xl/none" style={{ letterSpacing: '-0.03em' }}>Your chat,<br /><span className="text-white/55">in your pocket.</span></h2>
            <p className="mb-8 max-w-lg text-lg text-white/70">Mergio for Android shows every live chat on your phone. Read it from the couch, the kitchen or the street.</p>
            <ul className="mb-9 space-y-5">
              {POINTS.map(([icon, title, text]) => <Point key={title} icon={icon} title={title}>{text}</Point>)}
            </ul>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <PillLink href={android.href}>Get the Android app</PillLink>
              <a href={readme('mergio-on-your-phone-android')} target="_blank" rel="noopener noreferrer" className="text-base text-white/55 underline-offset-4 hover:text-white hover:underline">How to install it →</a>
            </div>
            <p className="mt-4 text-sm text-white/40">Free .apk from GitHub. Kick doesn't work on the phone yet.</p>
          </Reveal>
          <Reveal variant="right" delay={120}>
            <PhoneShot />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
