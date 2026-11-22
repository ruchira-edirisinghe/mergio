import type { CSSProperties, ReactNode } from 'react';
import { CloudOff, Cpu, FileText, Gauge, HardDrive, KeyRound, MemoryStick, MessageSquare, Monitor, ShieldCheck, type LucideIcon } from 'lucide-react';
import { PlatformIcon, PLATFORMS } from '../components/brand';
import { Reveal } from '../components/Reveal';
import { Eyebrow } from '../components/ui';
import { useInView } from '../lib/hooks';

const POINTS: [LucideIcon, string, string][] = [
  [HardDrive, 'Everything is saved on your PC', 'Your channels, looks, saved slots and keys live in one settings file on your computer. Delete it and it is all gone.'],
  [CloudOff, 'Not hosted anywhere', 'There are no Mergio servers and no account. The app talks straight from your PC to YouTube, Twitch, Kick, TikTok and Facebook.'],
  [Gauge, 'Light on your PC', 'Under 100 MB of memory and almost no CPU while it waits, so your game and your stream keep the power.'],
  [ShieldCheck, 'Nothing comes back to us', 'No analytics, no telemetry, no ads. Chat and alerts are shown live and never saved.'],
];

const STATS: [string, string][] = [['0', 'servers'], ['0', 'accounts'], ['26 MB', 'download'], ['<100 MB', 'memory']];

function FileRow({ icon: Icon, name, note, mono }: { icon: LucideIcon; name: string; note: string; mono?: boolean }) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl bg-white/[.05] px-3 py-2 ring-1 ring-white/[.06]">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet/40 to-pink/30"><Icon className="h-3.5 w-3.5" /></span>
      <span className="min-w-0">
        <span className={`block truncate text-[12.5px] font-medium text-white ${mono ? 'font-mono' : ''}`}>{name}</span>
        <span className="block text-[11.5px] leading-snug text-white/50">{note}</span>
      </span>
    </li>
  );
}

/** Your PC in the middle, talking straight to each platform; the Mergio cloud is not there at all. */
function LocalMap({ active }: { active: boolean }) {
  const run: CSSProperties = { animationPlayState: active ? 'running' : 'paused' };
  return (
    <div className="relative" aria-hidden="true">
      <div className="mb-5 flex items-center justify-center">
        <span className="relative inline-flex items-center gap-2 rounded-full border border-dashed border-white/20 px-4 py-2 text-sm text-white/45">
          <CloudOff className="h-4 w-4" />Mergio cloud servers
          <span className="ml-1 rounded-full bg-[#ff2d55]/15 px-2 py-0.5 text-xs font-semibold text-[#ff8fa3] ring-1 ring-[#ff2d55]/30">none</span>
          <span className="absolute left-3 right-[4.6rem] top-1/2 h-px origin-left bg-white/40" style={{ animation: 'fill-x 1s .4s cubic-bezier(.22,1,.36,1) both', ...run }} />
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:gap-5">
        <div className="relative rounded-2xl bg-[#0d0b16] p-4 ring-1 ring-white/10 shadow-[0_0_60px_-20px_rgba(124,77,255,.6)]">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Monitor className="h-4 w-4 text-[#c9b8ff]" />Your PC
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-[#86efac]"><span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] anim-pulse" />Mergio running</span>
          </div>
          <ul className="space-y-2">
            <FileRow icon={FileText} name="config.json" mono note="Channels, looks and saved slots" />
            <FileRow icon={KeyRound} name="Your keys" note="Kept in that file, only on this PC" />
            <FileRow icon={MessageSquare} name="Chat and alerts" note="Shown live, never saved" />
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
            <div className="rounded-xl bg-white/[.04] px-3 py-2 ring-1 ring-white/[.06]">
              <div className="flex items-center gap-1.5 text-white/55"><MemoryStick className="h-3.5 w-3.5" />Memory</div>
              <div className="mt-1 whitespace-nowrap font-semibold text-white">under 100 MB</div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[6%] rounded-full bg-[#22c55e]" /></div>
            </div>
            <div className="rounded-xl bg-white/[.04] px-3 py-2 ring-1 ring-white/[.06]">
              <div className="flex items-center gap-1.5 text-white/55"><Cpu className="h-3.5 w-3.5" />CPU</div>
              <div className="mt-1 font-semibold text-white">almost 0%</div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[2%] rounded-full bg-[#22c55e]" /></div>
            </div>
          </div>
        </div>
        <ul className="flex flex-col gap-2.5">
          {PLATFORMS.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="relative h-0.5 w-8 overflow-hidden rounded-full sm:w-16" style={{ background: `${p.color}66` }}>
                <span className="absolute inset-0" style={{ animation: `drift 1.8s ${i * 0.3}s linear infinite`, ...run }}>
                  <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                </span>
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.06] ring-1 ring-white/10"><PlatformIcon id={p.id} colored className="h-[18px] w-[18px]" /></span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-center text-xs text-white/40">Straight from your PC to each platform. Nothing in between.</p>
    </div>
  );
}

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

export function Local() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <section id="local" className="bg-ink px-4 sm:px-6 py-16 md:py-24 scroll-mt-4">
      <div ref={ref} className="mx-auto max-w-[88rem] overflow-hidden rounded-3xl bg-surface p-6 ring-1 ring-white/[.07] sm:p-10 lg:p-14"
        style={{ backgroundImage: 'radial-gradient(at 100% 0%, rgba(34,197,94,.12) 0, transparent 45%), radial-gradient(at 0% 100%, rgba(124,77,255,.18) 0, transparent 50%)' }}>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal variant="left">
            <Eyebrow><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />100% local</span></Eyebrow>
            <h2 className="mb-5 text-4xl font-medium leading-tight md:text-5xl" style={{ letterSpacing: '-0.03em' }}>Runs on your PC.<br /><span className="text-white/55">Nothing in the cloud.</span></h2>
            <p className="mb-8 max-w-lg text-lg text-white/70">Mergio isn't a website or an online service. It's a small app on your own computer, and everything it does stays there.</p>
            <ul className="space-y-5">
              {POINTS.map(([icon, title, text]) => <Point key={title} icon={icon} title={title}>{text}</Point>)}
            </ul>
          </Reveal>
          <Reveal variant="right" delay={120}>
            <LocalMap active={inView} />
            <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATS.map(([n, label]) => (
                <div key={label} className="flex flex-col rounded-2xl bg-white/[.05] px-4 py-3 text-center ring-1 ring-white/[.07]">
                  <dt className="order-2 text-sm text-white/50">{label}</dt>
                  <dd className="order-1 text-2xl font-semibold tracking-tight text-white">{n}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-white/35">Memory and CPU measured with Mergio on Windows with four channels added, waiting between streams. The download is the Windows installer. A follower goal for TikTok or Facebook also runs a hidden browser window while that overlay is open.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
