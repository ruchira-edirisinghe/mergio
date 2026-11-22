import { useEffect, useState, type ReactNode } from 'react';
import { Check, Download, Plus } from 'lucide-react';
import { MergioMark, PlatformIcon, type PlatformId } from '../components/brand';
import { Reveal } from '../components/Reveal';
import { Eyebrow } from '../components/ui';
import { useInView, useInterval } from '../lib/hooks';
import { DOWNLOADS, guessOs, RELEASES } from '../lib/links';

/** Download buttons for each system, the visitor's own system first. All links go to the GitHub release. */
export function DownloadList() {
  const [first, setFirst] = useState<string>('windows');
  useEffect(() => setFirst(guessOs()), []);
  const list = [...DOWNLOADS].sort((a, b) => Number(b.id === first) - Number(a.id === first));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {list.map((d, k) => (
        <a key={d.id} href={d.href} rel="noopener noreferrer"
          className={`group flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 transition-colors duration-200 ${k === 0 ? 'bg-white text-black hover:bg-white/90' : 'bg-white/[.07] text-white hover:bg-white/[.12]'}`}>
          <Download className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap font-medium">{d.os}</span>
          <span className={`ml-auto min-w-0 truncate text-right text-xs sm:text-sm ${k === 0 ? 'opacity-60' : 'opacity-50'}`}>{d.note}</span>
        </a>
      ))}
      <a href={RELEASES} target="_blank" rel="noopener noreferrer" className="mt-1 py-1 text-sm text-white/55 underline-offset-4 hover:underline">
        All downloads and release notes on GitHub →
      </a>
    </div>
  );
}

const LINKS: [PlatformId, string][] = [['youtube', 'youtube.com/@yourchannel'], ['twitch', 'twitch.tv/yourname'], ['tiktok', 'tiktok.com/@you'], ['kick', 'kick.com/yourname'], ['facebook', 'facebook.com/yourpage']];

/** Typing a link: Mergio spots the platform, then the chat shows up as connected. */
function AddChat({ active }: { active: boolean }) {
  const [s, setS] = useState({ li: 0, n: 0, added: [3, 1] as number[], hold: 0 });
  useInterval(() => setS(prev => {
    const text = LINKS[prev.li][1];
    if (prev.n < text.length) return { ...prev, n: prev.n + 1 };
    if (prev.hold < 6) return { ...prev, hold: prev.hold + 1 };
    const added = [prev.li, ...prev.added].slice(0, 3);
    return { li: (prev.li + 1) % LINKS.length, n: 0, added, hold: 0 };
  }), active ? 85 : null);
  const [pid, text] = LINKS[s.li];
  const typed = text.slice(0, s.n);
  const detected = s.n > 8;
  return (
    <div className="w-full" aria-hidden="true">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.05] px-3 py-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center">{detected ? <PlatformIcon id={pid} colored className="h-5 w-5 anim-pop" /> : <span className="h-2 w-2 rounded-full bg-white/25" />}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-white/85">{typed}<span className="anim-caret">|</span></span>
        <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${s.hold > 3 ? 'bg-[#7c4dff] text-white' : 'bg-white/[.06] text-white/50'}`}><Plus className="h-3.5 w-3.5" />Add</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {s.added.map((li, k) => (
          <li key={`${li}-${k}-${s.added.length}`} className={`flex items-center gap-2.5 rounded-xl bg-white/[.05] px-3 py-2 text-[13px] ${k === 0 ? 'anim-rise' : ''}`}>
            <PlatformIcon id={LINKS[li][0]} colored className="h-4 w-4" />
            <span className="truncate text-white/70">{LINKS[li][1]}</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#22c55e]/15 px-2 py-0.5 text-[11px] font-semibold text-[#86efac]"><Check className="h-3 w-3" />Connected</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The OBS "Browser source" window with the overlay link pasted in. */
function ObsSource({ active }: { active: boolean }) {
  const url = 'http://localhost:8787/overlay';
  const [t, setT] = useState(0);
  useInterval(() => setT(v => (v + 1) % 34), active ? 220 : null);
  const pasted = t >= 4;
  const ok = t >= 14;
  return (
    <div className="w-full" aria-hidden="true">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1d1f26] text-[12.5px] text-white shadow-sm">
        <div className="border-b border-black/40 bg-[#17181d] px-3 py-1.5 text-white/50">Properties for 'Mergio'</div>
        <div className="space-y-2 p-3">
          <div className="flex items-center gap-2"><span className="w-12 text-right text-white/50">URL</span>
            <span className={`flex-1 truncate rounded bg-[#2a2d36] px-2 py-1 font-mono ${pasted ? 'text-white' : 'text-white/30'}`}>{pasted ? url : 'https://'}</span></div>
          <div className="flex items-center gap-2"><span className="w-12 text-right text-white/50">Width</span><span className="w-16 rounded bg-[#2a2d36] px-2 py-1 font-mono">{t >= 7 ? 500 : 800}</span></div>
          <div className="flex items-center gap-2"><span className="w-12 text-right text-white/50">Height</span><span className="w-16 rounded bg-[#2a2d36] px-2 py-1 font-mono">{t >= 9 ? 800 : 600}</span></div>
          <div className="flex justify-end"><span className={`rounded px-3 py-1 font-semibold transition-colors ${t >= 11 && t < 13 ? 'bg-[#5b7cff]' : 'bg-[#3c5bd1]'}`}>OK</span></div>
        </div>
      </div>
      <div className={`mt-3 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] transition-colors duration-500 ${ok ? 'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#86efac]' : 'border-white/10 bg-white/[.04] text-white/50'}`}>
        <span className={`grid h-5 w-5 place-items-center rounded-full ${ok ? 'bg-[#22c55e] text-white' : 'bg-white/10'}`}>{ok && <Check className="h-3 w-3" />}</span>
        {ok ? 'Mergio is showing in OBS' : 'Not in OBS yet'}
      </div>
    </div>
  );
}

/** Step 1 art: the installer downloading, then Mergio running in the tray. */
function Install({ active }: { active: boolean }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setPct(p => (p >= 130 ? 0 : p + 2)), 60);
    return () => window.clearInterval(id);
  }, [active]);
  const done = pct >= 100;
  return (
    <div className="grid gap-3" aria-hidden="true">
      <div className="flex items-center gap-3 rounded-xl bg-white/[.06] p-3 ring-1 ring-white/10">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#13111f] ring-1 ring-white/10"><MergioMark className="h-7 w-7" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate font-medium text-white/90">Mergio-Setup.exe</span>
            <span className="text-white/50 tabular-nums">{done ? 'Done' : `${Math.min(pct, 100)}%`}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-linear-to-r from-violet to-pink transition-[width] duration-100" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      </div>
      <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ring-1 transition-all duration-500 ${done ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30' : 'bg-white/[.03] text-white/40 ring-white/10'}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${done ? 'bg-emerald-400 anim-pulse' : 'bg-white/25'}`} />
        {done ? 'Mergio is running' : 'Installing…'}
      </div>
    </div>
  );
}

function Step({ n, title, text, delay, children }: { n: number; title: string; text: string; delay: number; children: ReactNode }) {
  return (
    <Reveal variant="up" delay={delay}>
      <div className="lift flex h-full flex-col rounded-2xl bg-surface p-6 sm:p-7 ring-1 ring-white/[.07]">
        <span className="mb-6 grid h-10 w-10 place-items-center rounded-full bg-linear-to-br from-violet to-pink text-sm font-semibold text-white">{n}</span>
        <h3 className="mb-2 text-2xl font-medium" style={{ letterSpacing: '-0.02em' }}>{title}</h3>
        <p className="mb-7 text-base text-white/60">{text}</p>
        <div className="mt-auto">{children}</div>
      </div>
    </Reveal>
  );
}

export function Steps() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <section id="setup" className="bg-ink px-4 sm:px-6 py-16 md:py-24 scroll-mt-4">
      <div ref={ref} className="max-w-[88rem] mx-auto">
        <Reveal className="mb-10 md:mb-12 text-center">
          <Eyebrow>Setup</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-medium leading-tight" style={{ letterSpacing: '-0.03em' }}>Live in three steps.</h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Step n={1} delay={0} title="Download" text="Free for Windows, macOS and Linux.">
            <Install active={inView} />
          </Step>
          <Step n={2} delay={120} title="Add your chats" text="Type your username or paste a link.">
            <AddChat active={inView} />
          </Step>
          <Step n={3} delay={240} title="Paste into OBS" text="One browser source. That's it.">
            <ObsSource active={inView} />
          </Step>
        </div>
      </div>
    </section>
  );
}
