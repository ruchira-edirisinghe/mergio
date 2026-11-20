import { useEffect, useState, type ReactNode } from 'react';
import { Check, Download, Plus } from 'lucide-react';
import { PlatformIcon, type PlatformId } from '../components/brand';
import { Eyebrow } from '../components/ui';
import { useInView, useInterval } from '../lib/hooks';
import { DOWNLOADS, guessOs, RELEASES } from '../lib/links';

/** Download buttons for each system, the visitor's own system first. All links go to the GitHub release. */
export function DownloadList({ dark }: { dark?: boolean }) {
  const [first, setFirst] = useState<string>('windows');
  useEffect(() => setFirst(guessOs()), []);
  const list = [...DOWNLOADS].sort((a, b) => Number(b.id === first) - Number(a.id === first));
  return (
    <div className="grid gap-2">
      {list.map((d, k) => (
        <a key={d.id} href={d.href} rel="noopener noreferrer"
          className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors duration-200 ${k === 0
            ? (dark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-gray-800')
            : (dark ? 'bg-white/[.07] text-white hover:bg-white/[.12]' : 'bg-black/[.04] text-black hover:bg-black/[.08]')}`}>
          <Download className="h-4 w-4 shrink-0" />
          <span className="font-medium">{d.os}</span>
          <span className={`ml-auto text-sm ${k === 0 ? 'opacity-60' : 'opacity-50'}`}>{d.note}</span>
        </a>
      ))}
      <a href={RELEASES} target="_blank" rel="noopener noreferrer" className={`mt-1 text-sm underline-offset-4 hover:underline ${dark ? 'text-white/55' : 'text-black/50'}`}>
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
      <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5 shadow-sm">
        <span className="grid h-6 w-6 shrink-0 place-items-center">{detected ? <PlatformIcon id={pid} colored className="h-5 w-5 anim-pop" /> : <span className="h-2 w-2 rounded-full bg-black/20" />}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-black/80">{typed}<span className="anim-caret">|</span></span>
        <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${s.hold > 3 ? 'bg-[#7c4dff] text-white' : 'bg-black/5 text-black/50'}`}><Plus className="h-3.5 w-3.5" />Add</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {s.added.map((li, k) => (
          <li key={`${li}-${k}-${s.added.length}`} className={`flex items-center gap-2.5 rounded-xl bg-black/[.04] px-3 py-2 text-[13px] ${k === 0 ? 'anim-rise' : ''}`}>
            <PlatformIcon id={LINKS[li][0]} colored className="h-4 w-4" />
            <span className="truncate text-black/70">{LINKS[li][1]}</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#22c55e]/15 px-2 py-0.5 text-[11px] font-semibold text-[#15803d]"><Check className="h-3 w-3" />Connected</span>
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
      <div className="overflow-hidden rounded-xl border border-black/10 bg-[#1d1f26] text-[12.5px] text-white shadow-sm">
        <div className="border-b border-black/40 bg-[#17181d] px-3 py-1.5 text-white/50">Properties for 'Mergio'</div>
        <div className="space-y-2 p-3">
          <div className="flex items-center gap-2"><span className="w-12 text-right text-white/50">URL</span>
            <span className={`flex-1 truncate rounded bg-[#2a2d36] px-2 py-1 font-mono ${pasted ? 'text-white' : 'text-white/30'}`}>{pasted ? url : 'https://'}</span></div>
          <div className="flex items-center gap-2"><span className="w-12 text-right text-white/50">Width</span><span className="w-16 rounded bg-[#2a2d36] px-2 py-1 font-mono">{t >= 7 ? 500 : 800}</span></div>
          <div className="flex items-center gap-2"><span className="w-12 text-right text-white/50">Height</span><span className="w-16 rounded bg-[#2a2d36] px-2 py-1 font-mono">{t >= 9 ? 800 : 600}</span></div>
          <div className="flex justify-end"><span className={`rounded px-3 py-1 font-semibold transition-colors ${t >= 11 && t < 13 ? 'bg-[#5b7cff]' : 'bg-[#3c5bd1]'}`}>OK</span></div>
        </div>
      </div>
      <div className={`mt-3 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] transition-colors duration-500 ${ok ? 'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#15803d]' : 'border-black/10 bg-white text-black/50'}`}>
        <span className={`grid h-5 w-5 place-items-center rounded-full ${ok ? 'bg-[#22c55e] text-white' : 'bg-black/10'}`}>{ok && <Check className="h-3 w-3" />}</span>
        {ok ? 'Mergio is showing in OBS' : 'Not in OBS yet'}
      </div>
    </div>
  );
}

function Step({ n, title, text, children }: { n: number; title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-7">
      <span className="mb-6 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet to-pink text-sm font-semibold text-white">{n}</span>
      <h3 className="mb-2 text-2xl font-medium" style={{ letterSpacing: '-0.02em' }}>{title}</h3>
      <p className="mb-7 text-base text-black/60">{text}</p>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

export function Steps() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <section id="setup" className="bg-[#F5F5F5] px-4 sm:px-6 py-24 scroll-mt-4">
      <div ref={ref} className="max-w-[88rem] mx-auto">
        <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          <div>
            <Eyebrow>Setup</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-medium leading-tight" style={{ letterSpacing: '-0.03em' }}>Live in three steps.</h2>
          </div>
          <p className="text-black/60 text-base md:text-lg leading-relaxed max-w-lg md:justify-self-end">
            No developer accounts, no API keys, no cloud service between you and your chat. Paste a link, press Enter, done.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Step n={1} title="Download Mergio" text="Free for Windows, macOS and Linux. It runs quietly in the background and uses about 50 to 80 MB of memory.">
            <DownloadList />
          </Step>
          <Step n={2} title="Add your chats" text="Pick a platform and type your username, or paste any stream or channel link. Add one for every platform you stream on.">
            <AddChat active={inView} />
          </Step>
          <Step n={3} title="Paste one link into OBS" text="Add a Browser source with your overlay link. The link never changes, and style changes reach OBS instantly.">
            <ObsSource active={inView} />
          </Step>
        </div>
      </div>
    </section>
  );
}
