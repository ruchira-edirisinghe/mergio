import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AppWindow, Bell, Eye, EyeOff, Home, Link2, Lock, MessageSquare, Mic, Monitor, Palette, Settings, Volume2 } from 'lucide-react';
import { PlatformIcon, PLATFORMS, Wordmark } from '../components/brand';
import { Face } from '../components/Face';
import { GiftArt } from '../components/GiftArt';
import { ALERT_LOOKS, AlertShow, ChatFeed, THEMES, type ThemeId } from '../components/Overlay';
import { ALERTS, CHATS, GIFTS, SCRIPT, type ChatItem } from '../lib/chat';
import { useCycle, useFeed, useInterval } from '../lib/hooks';
import { VideoBackdrop } from './Backdrop';

// measures before paint in the browser; the HTML built ahead of time (entry-server.tsx) skips it
const useLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Renders a fixed-width design and scales it down to fit its box (so the mock-ups look the same on phones). */
export function Scaled({ width, children, className = '' }: { width: number; children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>();
  useLayout(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      const s = Math.min(1, o.clientWidth / width);
      setScale(s);
      setHeight(i.offsetHeight * s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o); ro.observe(i);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={outer} className={`relative w-full ${className}`} style={{ height }}>
      <div ref={inner} className="absolute left-0 top-0 origin-top-left" style={{ width, transform: `scale(${scale})` }}>{children}</div>
    </div>
  );
}

/* ---------- Chat overlay: every look ---------- */
export function ThemeStage({ active }: { active: boolean }) {
  const [t] = useCycle(THEMES.length, 3400, active);
  const items = useFeed(SCRIPT, 1300, active, 9, 7);
  return (
    <div className="absolute inset-x-0 bottom-0 top-[52%] md:top-[42%] flex flex-col items-end gap-4 px-6 pb-6 md:px-10 md:pb-10">
      <div className="hidden sm:flex flex-wrap justify-end gap-1.5 rounded-full bg-black/40 p-1 backdrop-blur-md">
        {THEMES.map((th, i) => (
          <span key={th.id} className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-300 ${i === t ? 'bg-white text-black' : 'text-white/60'}`}>{th.name}</span>
        ))}
      </div>
      <ChatFeed items={items} theme={THEMES[t].id} fontSize={16} className="min-h-0 w-full max-w-[420px] flex-1 mask-[linear-gradient(180deg,transparent,#000_25%)]" />
    </div>
  );
}

/* ---------- Alerts overlay: one big alert at a time, in each of the six looks ---------- */
/** Seconds each demo alert stays, so the Alerts tab can show all six looks before it moves on. */
export const ALERT_DEMO_LIFE = 3.2;
export function AlertStage({ active }: { active: boolean }) {
  const life = ALERT_DEMO_LIFE;
  const [i] = useCycle(ALERTS.length * ALERT_LOOKS.length, life * 1000, active);
  const look = i % ALERT_LOOKS.length;
  return (
    <div className="absolute inset-x-0 bottom-0 top-[44%] md:top-[36%] flex flex-col items-center justify-center gap-4 px-6 pb-6">
      <div className="hidden sm:flex flex-wrap justify-center gap-1.5 rounded-full bg-black/40 p-1 backdrop-blur-md">
        {ALERT_LOOKS.map((l, k) => (
          <span key={l.id} className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-300 ${k === look ? 'bg-white text-black' : 'text-white/60'}`}>{l.name}</span>
        ))}
      </div>
      <div className="relative w-full max-w-[460px] pt-6">
        <div className="relative grid min-h-[220px] place-items-center rounded-[3px] outline outline-[1.5px] outline-[#ff4d4d]/75">
          <span className="absolute -top-6 left-0 rounded-t-md bg-[#ff4d4d]/85 px-2 py-0.5 text-[11px] font-semibold text-white">Browser source · Mergio Alerts</span>
          <div className="w-full px-4 py-6"><AlertShow key={i} item={ALERTS[i % ALERTS.length]} look={ALERT_LOOKS[look].id} life={life} size={0.78} /></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- The control panel, redrawn ---------- */
interface PanelState { theme: ThemeId; size: number; avatars: boolean; box: boolean; target: string }
const STEPS: PanelState[] = [
  { theme: 'glass', size: 14, avatars: true, box: true, target: 'glass' },
  { theme: 'neon', size: 14, avatars: true, box: true, target: 'neon' },
  { theme: 'neon', size: 17, avatars: true, box: true, target: 'size' },
  { theme: 'neon', size: 17, avatars: true, box: false, target: 'box' },
  { theme: 'retro', size: 17, avatars: true, box: true, target: 'retro' },
  { theme: 'retro', size: 15, avatars: false, box: true, target: 'avatars' },
  { theme: 'soft', size: 15, avatars: true, box: true, target: 'soft' },
  { theme: 'glass', size: 14, avatars: true, box: true, target: 'glass' },
];
const NAV: [typeof Home, string][] = [[Home, 'Home'], [Link2, 'Chats'], [Monitor, 'Add to OBS'], [Palette, 'Style'], [Bell, 'Alerts'], [MessageSquare, 'Live chat'], [Settings, 'Settings']];

function Toggle({ on, id }: { on: boolean; id: string }) {
  return (
    <span data-target={id} className={`relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${on ? 'bg-[#7c4dff]' : 'bg-white/15'}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 ${on ? 'left-6' : 'left-1'}`} />
    </span>
  );
}

export function PanelMock({ active }: { active: boolean }) {
  const [step] = useCycle(STEPS.length, 1900, active);
  const st = STEPS[step];
  const items = useFeed(SCRIPT, 1500, active, 8, 6);
  const box = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState({ x: 300, y: 200, click: 0 });
  useEffect(() => {
    const root = box.current;
    const el = root?.querySelector<HTMLElement>(`[data-target="${st.target}"]`);
    if (!root || !el) return;
    const r = root.getBoundingClientRect(), e = el.getBoundingClientRect();
    const s = r.width / root.offsetWidth || 1;
    setCursor(c => ({ x: (e.left - r.left + e.width * .6) / s, y: (e.top - r.top + e.height * .55) / s, click: c.click + 1 }));
  }, [step, st.target]);

  return (
    <Scaled width={960}>
      <div ref={box} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b10] text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,.6)]">
        <div className="flex items-center gap-2 border-b border-white/5 bg-[#101018] px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="mx-auto inline-flex items-center gap-1.5 text-xs text-white/45"><AppWindow className="h-3.5 w-3.5" />Mergio</span>
        </div>
        <div className="grid grid-cols-[180px_1fr_300px]">
          <aside className="border-r border-white/5 bg-[#0e0e15] p-4">
            <Wordmark className="mb-5 h-6 w-auto" />
            {NAV.map(([Icon, label]) => (
              <div key={label} className={`mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] ${label === 'Style' ? 'bg-[#7c4dff]/15 text-white ring-1 ring-[#7c4dff]/40' : 'text-white/55'}`}>
                <Icon className="h-4 w-4" />{label}
              </div>
            ))}
          </aside>
          <main className="p-5">
            <div className="text-lg font-semibold">Style</div>
            <div className="mb-4 text-xs text-white/45">How the chat looks and behaves on stream</div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {THEMES.map(th => (
                <div key={th.id} data-target={th.id} className={`rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors duration-300 ${st.theme === th.id ? 'border-[#7c4dff] bg-[#7c4dff]/10 shadow-[0_0_0_3px_rgba(124,77,255,.2)]' : 'border-white/10 bg-white/[.03] text-white/70'}`}>
                  {th.name}
                </div>
              ))}
              <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2.5 text-[13px] font-medium text-white/70">Bold cards</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#13131b] p-4">
              <div className="mb-3 text-sm font-semibold">Quick settings</div>
              <div className="flex items-center justify-between border-b border-white/5 py-2.5 text-[13px]">
                <span>Text size</span>
                <span className="flex items-center gap-3">
                  <span data-target="size" className="relative h-1.5 w-36 rounded-full bg-white/10">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-[#7c4dff] transition-all duration-500" style={{ width: `${((st.size - 12) / 12) * 100}%` }} />
                    <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-500" style={{ left: `${((st.size - 12) / 12) * 100}%` }} />
                  </span>
                  <span className="w-9 text-right tabular-nums text-white/50">{st.size + 6}px</span>
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 py-2.5 text-[13px]"><span>Profile pictures</span><Toggle on={st.avatars} id="avatars" /></div>
              <div className="flex items-center justify-between border-b border-white/5 py-2.5 text-[13px]"><span>Box behind each message</span><Toggle on={st.box} id="box" /></div>
              <div className="flex items-center justify-between py-2.5 text-[13px]"><span>Messages disappear after a while</span><Toggle on={false} id="fade" /></div>
            </div>
          </main>
          <aside className="border-l border-white/5 bg-[#0e0e15] p-4">
            <div className="mb-3 flex items-center justify-between text-sm font-semibold">Live preview<span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">Game</span></div>
            <div className="relative h-[372px] overflow-hidden rounded-xl" style={{ background: 'linear-gradient(160deg, #3a2b40, #19324a)' }}>
              <ChatFeed items={items} theme={st.theme} fontSize={st.size} showAvatar={st.avatars} box={st.box} className="absolute inset-0 p-3" />
            </div>
          </aside>
        </div>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute z-20 h-6 w-6 drop-shadow-[0_2px_4px_rgba(0,0,0,.6)] transition-all duration-700 ease-[cubic-bezier(.65,0,.35,1)]" style={{ left: cursor.x, top: cursor.y }}>
          <path d="M3 2 L20 11 L12.5 12.5 L9 20Z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <span key={cursor.click} className="pointer-events-none absolute z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70 anim-ring" style={{ left: cursor.x + 2, top: cursor.y + 2, animationIterationCount: 1, animationDelay: '.7s' }} />
      </div>
    </Scaled>
  );
}

/* ---------- OBS with Mergio's three docks: chat, gifts and viewers ---------- */
// one message the streamer took off the overlay, to show the Hide button at work
const HIDDEN_TEXT = 'pls pls pls';
function DockRow({ item }: { item: Extract<ChatItem, { kind: 'chat' }> }) {
  const hidden = item.text === HIDDEN_TEXT;
  return (
    <div className={`flex gap-2.5 border-b border-white/5 px-3 py-1.5 anim-rise ${hidden ? 'opacity-45' : ''}`}>
      <Face name={item.user.name} className="mt-0.5 h-6 w-6 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 text-[12px] leading-snug">
        <div className="flex items-center gap-1.5">
          <PlatformIcon id={item.user.platform} colored className="h-3 w-3" />
          <b style={{ color: item.user.color }}>{item.user.name}</b>
          {hidden && <span className="ml-auto inline-flex items-center gap-1 rounded bg-white/10 px-1.5 text-[10px] font-semibold text-white/70"><EyeOff className="h-2.5 w-2.5" />Hidden</span>}
        </div>
        <div className="text-white/80">{item.text}</div>
      </div>
    </div>
  );
}

const ON_STREAM = SCRIPT.filter(i => !(i.kind === 'chat' && i.text === HIDDEN_TEXT));
const DOCK_GIFTS = SCRIPT.filter((i): i is Extract<ChatItem, { kind: 'gift' | 'kicks' | 'superchat' }> => i.kind === 'gift' || i.kind === 'kicks' || i.kind === 'superchat');
function GiftRow({ item }: { item: (typeof DOCK_GIFTS)[number] }) {
  const what = item.kind === 'gift' ? `${GIFTS[item.gift].name} ×${item.count}` : item.kind === 'kicks' ? `${item.amount} Kicks` : `Super Chat ${item.amount}`;
  return (
    <div className="flex items-center gap-2 px-3 py-1 text-[11.5px] anim-rise">
      <span className="grid h-6 w-6 shrink-0 place-items-center">
        {item.kind === 'gift' ? <GiftArt gift={item.gift} className="h-6 w-6" /> : <PlatformIcon id={item.user.platform} colored className="h-4 w-4" />}
      </span>
      <b className="truncate" style={{ color: item.user.color }}>{item.user.name}</b>
      <span className="ml-auto shrink-0 text-white/70">{what}</span>
    </div>
  );
}

function DockHead({ title }: { title: string }) {
  return <div className="flex items-center justify-between border-b border-white/5 bg-[#17181d] px-3 py-1.5 text-[12px] font-semibold">{title}<span className="text-[10px] font-normal text-white/40">Dock</span></div>;
}

export function ObsDock({ active }: { active: boolean }) {
  const feed = useFeed(CHATS as Extract<ChatItem, { kind: 'chat' }>[], 1500, active, 9, 6);
  const overlay = useFeed(ON_STREAM, 1500, active, 7, 5);
  const [levels, setLevels] = useState([.6, .4]);
  useInterval(() => setLevels([.35 + Math.random() * .5, .2 + Math.random() * .5]), active ? 180 : null);
  const gifts = useFeed(DOCK_GIFTS, 2600, active, 4, 3);
  const [t] = useCycle(40, 1300, active);
  const counts = [214, 160, 88, 192, 41].map((n, i) => n + Math.round(Math.sin((t + i * 3) / 2.4) * (3 + i * 2)));
  return (
    <Scaled width={980}>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1d1f26] text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,.6)]">
        <div className="flex items-center gap-2 border-b border-black/40 bg-[#17181d] px-4 py-2 text-xs text-white/50">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="mx-auto">OBS Studio · Scene: Gameplay</span>
        </div>
        <div className="grid grid-cols-[1fr_290px]">
          <div className="p-3">
            <div className="relative aspect-video overflow-hidden rounded-md bg-black">
              <VideoBackdrop clip="live-streamer" active={active} />
              <div className="absolute bottom-[6%] right-[3%] top-[30%] w-[34%] outline outline-[1.5px] outline-[#ff4d4d]/80">
                <ChatFeed items={overlay} fontSize={10.5} className="absolute inset-0 p-1.5 mask-[linear-gradient(180deg,transparent,#000_25%)]" />
              </div>
              <span className="absolute left-2 top-2 rounded bg-[#ff2d55] px-1.5 py-0.5 text-[10px] font-bold tracking-wider">LIVE</span>
              <span className="absolute left-14 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold"><Eye className="h-3 w-3" />{counts.reduce((s, n) => s + n, 0).toLocaleString('en')} watching</span>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_1.3fr_1.2fr] gap-3 text-[12px]">
              <div className="rounded-md bg-[#272a33] p-2">
                <div className="mb-1.5 text-white/45">Scenes</div>
                {['Gameplay', 'Just Chatting', 'Be right back'].map((s, i) => <div key={s} className={`rounded px-2 py-1 ${i === 0 ? 'bg-[#3c5bd1]/60' : 'text-white/70'}`}>{s}</div>)}
              </div>
              <div className="rounded-md bg-[#272a33] p-2">
                <div className="mb-1.5 text-white/45">Sources</div>
                {[['Mergio', true], ['Mergio Alerts', false], ['Mergio Viewers', false], ['Game capture', false]].map(([s, sel]) => (
                  <div key={String(s)} className={`flex items-center gap-2 rounded px-2 py-1 ${sel ? 'bg-[#3c5bd1]/60' : 'text-white/70'}`}>
                    <Eye className="h-3 w-3 opacity-60" />{s}<Lock className="ml-auto h-3 w-3 opacity-30" />
                  </div>
                ))}
              </div>
              <div className="rounded-md bg-[#272a33] p-2">
                <div className="mb-1.5 text-white/45">Audio mixer</div>
                {[['Desktop', Volume2], ['Mic', Mic]].map(([label, Icon], i) => {
                  const I = Icon as typeof Mic;
                  return (
                    <div key={String(label)} className="mb-2">
                      <div className="mb-1 flex items-center gap-1.5 text-white/70"><I className="h-3 w-3" />{String(label)}</div>
                      <div className="h-2 overflow-hidden rounded bg-black/40">
                        <div className="h-full rounded bg-linear-to-r from-[#22c55e] via-[#eab308] to-[#ef4444] transition-[width] duration-150" style={{ width: `${levels[i] * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-2 rounded bg-[#c62f3a] py-1 text-center font-semibold">Stop streaming</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-px border-l border-black/40 bg-black/40">
            <div className="flex min-h-0 flex-1 flex-col bg-[#0e0e15]">
              <DockHead title="Mergio · Chat" />
              <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden" style={{ height: 250 }}>
                {feed.map(e => <DockRow key={e.key} item={e.item} />)}
              </div>
            </div>
            <div className="flex flex-col bg-[#0e0e15]">
              <DockHead title="Mergio · Gifts" />
              <div className="flex flex-col-reverse justify-end overflow-hidden py-1" style={{ height: 138 }}>
                {gifts.map(e => <GiftRow key={e.key} item={e.item} />)}
              </div>
            </div>
            <div className="flex flex-col bg-[#0e0e15]">
              <DockHead title="Mergio · Viewers" />
              <div className="px-3 py-2">
                <div className="mb-1.5 flex items-baseline gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ff2d55] anim-pulse" /><b className="text-[20px] tabular-nums">{counts.reduce((s, n) => s + n, 0).toLocaleString('en')}</b><span className="text-[11px] text-white/50">watching now</span><span className="ml-auto text-[11px] text-white/45">Peak <b className="tabular-nums text-white/80">742</b></span></div>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.map((p, i) => (
                    <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-white/[.06] px-2 py-0.5 text-[11px] tabular-nums text-white/75"><PlatformIcon id={p.id} colored className="h-3 w-3" />{counts[i]}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Scaled>
  );
}
