import { useEffect, useRef, useState } from 'react';
import { Check, Radio } from 'lucide-react';
import { MergioMark, PlatformIcon, PLATFORMS, platformColor, type PlatformId } from '../components/brand';
import { Face } from '../components/Face';
import { GiftArt } from '../components/GiftArt';
import { ChatFeed } from '../components/Overlay';
import { VideoBackdrop } from './Backdrop';
import { CHATS, GIFTS, USERS, avatarGradient, initial, type GiftId } from '../lib/chat';
import { useCycle, useFeed, useInterval } from '../lib/hooks';

/* ---------- 1. Five chats flow into Mergio and out as one overlay ---------- */
const NODE_Y = [44, 98, 152, 206, 260];
export function MergeFlow({ active }: { active: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = svg.current;
    if (!el?.pauseAnimations) return;
    if (active) el.unpauseAnimations(); else el.pauseAnimations();
  }, [active]);
  const lines = useFeed(CHATS, 900, active, 6, 5);
  return (
    <svg ref={svg} viewBox="0 0 640 304" className="w-full h-auto" aria-hidden="true">
      <defs>
        <radialGradient id="mf-glow"><stop offset="0" stopColor="#a77bff" stopOpacity=".55" /><stop offset="1" stopColor="#a77bff" stopOpacity="0" /></radialGradient>
      </defs>
      {PLATFORMS.map((p, i) => {
        const d = `M84 ${NODE_Y[i]} C 190 ${NODE_Y[i]}, 210 152, 282 152`;
        return (
          <g key={p.id}>
            <path d={d} stroke={p.color} strokeOpacity=".35" strokeWidth="2" fill="none" />
            {[0, 1].map(k => (
              <circle key={k} r="4.5" fill={p.color}>
                <animateMotion dur="2.2s" begin={`${i * .37 + k * 1.1}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".45 0 .55 1" />
              </circle>
            ))}
            <circle cx="58" cy={NODE_Y[i]} r="25" fill="#1b1826" stroke="rgba(255,255,255,.12)" />
            <PlatformIcon id={p.id} colored x={46} y={NODE_Y[i] - 12} width={24} height={24} />
          </g>
        );
      })}
      <path d="M378 152 H 452" stroke="#7c4dff" strokeOpacity=".5" strokeWidth="2.5" strokeDasharray="6 6">
        <animate attributeName="stroke-dashoffset" from="24" to="0" dur=".8s" repeatCount="indefinite" />
      </path>
      <circle cx="330" cy="152" r="78" fill="url(#mf-glow)" />
      <circle cx="330" cy="152" r="48" fill="#07060c" />
      <circle cx="330" cy="152" r="48" fill="none" stroke="#7c4dff" strokeWidth="2" opacity=".6">
        <animate attributeName="r" values="48;64" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values=".6;0" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <MergioMark x={302} y={124} width={56} height={56} />
      <rect x="452" y="48" width="176" height="208" rx="14" fill="#07060c" stroke="rgba(255,255,255,.1)" />
      <text x="466" y="72" fill="#ffffff" fillOpacity=".45" fontSize="10.5" fontWeight="600" letterSpacing=".08em">YOUR OVERLAY</text>
      <foreignObject x="458" y="80" width="166" height="170">
        <ChatFeed items={lines} fontSize={9.5} showAvatar={false} className="h-full" style={{ gap: '.3em' }} />
      </foreignObject>
    </svg>
  );
}

/* ---------- 2. Gift pictures with a combo counting up ---------- */
const SHOW: { gift: GiftId; to: number }[] = [{ gift: 'rose', to: 25 }, { gift: 'galaxy', to: 3 }, { gift: 'heart', to: 12 }, { gift: 'doughnut', to: 8 }];
export function GiftShow({ active }: { active: boolean }) {
  const [s, setS] = useState({ i: 0, n: 1, hold: 0 });
  useInterval(() => setS(({ i, n, hold }) => {
    if (n < SHOW[i].to) return { i, n: n + 1, hold };
    if (hold < 14) return { i, n, hold: hold + 1 };
    return { i: (i + 1) % SHOW.length, n: 1, hold: 0 };
  }), active ? 140 : null);
  const cur = SHOW[s.i];
  const g = GIFTS[cur.gift];
  return (
    <div className="relative flex flex-col items-center py-2" aria-hidden="true">
      <div className="absolute top-2 h-32 w-32 rounded-full bg-[#ff2d8f]/30 blur-2xl" />
      <div key={s.i} className="relative h-28 w-28 anim-pop"><GiftArt gift={cur.gift} className="h-full w-full drop-shadow-[0_8px_18px_rgba(0,0,0,.35)]" /></div>
      <div className="relative mt-3 flex items-baseline gap-2 text-white">
        <span className="text-lg font-semibold">{g.name}</span>
        <span key={`${s.i}-${s.n}`} className="text-2xl font-bold tabular-nums text-[#ff7ab8] anim-bump">×{s.n}</span>
      </div>
      <span className="relative text-sm text-white/50 tabular-nums">{(g.diamonds * s.n).toLocaleString('en-US')} diamonds</span>
    </div>
  );
}

/* ---------- 3. Letter avatars turn into real profile pictures ---------- */
const WALL = [...USERS, ...USERS.slice(0, 6).map(u => ({ ...u, name: `${u.name}_` }))].slice(0, 16);
export function AvatarWall({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  useInterval(() => setStep(v => (v + 1) % (WALL.length + 8)), active ? 260 : null);
  return (
    <div className="grid w-full max-w-[232px] grid-cols-4 gap-3" aria-hidden="true">
      {WALL.map((u, i) => {
        const loaded = i < step;
        return (
          <div key={i} className="relative aspect-square">
            <span className={`absolute inset-0 grid place-items-center rounded-full text-sm font-bold text-white transition-opacity duration-300 ${loaded ? 'opacity-0' : 'opacity-100'}`} style={{ background: avatarGradient(u.name) }}>{initial(u.name)}</span>
            {loaded && <Face name={u.name} index={i} className="absolute inset-0 h-full w-full rounded-full anim-pop" />}
            <span className="absolute -bottom-0.5 -right-0.5 grid h-[38%] w-[38%] place-items-center rounded-full bg-[#2B2644]">
              <PlatformIcon id={u.platform} colored className="h-[62%] w-[62%]" />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 4. Auto-connect when you go live ---------- */
const CHANNELS: { id: PlatformId; handle: string }[] = [
  { id: 'youtube', handle: 'youtube.com/@you' },
  { id: 'twitch', handle: 'twitch.tv/you' },
  { id: 'kick', handle: 'kick.com/you' },
  { id: 'tiktok', handle: 'tiktok.com/@you' },
  { id: 'facebook', handle: 'facebook.com/yourpage' },
];
export function AutoDetect({ active }: { active: boolean }) {
  const [t] = useCycle(18, 450, active); // 0-4 waiting, 5 go live, 6.. connect one by one, hold
  const live = t >= 5;
  return (
    <div className="w-full" aria-hidden="true">
      <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-300 ${live ? 'bg-[#ff2d55] text-white' : 'bg-white/10 text-white/60'}`}>
        <Radio className={`h-3.5 w-3.5 ${live ? 'anim-pulse' : ''}`} />{live ? 'You went live' : 'Offline'}
      </div>
      <ul className="space-y-2">
        {CHANNELS.map((c, i) => {
          const on = t >= 6 + i;
          return (
            <li key={c.id} className="flex items-center gap-2.5 rounded-xl bg-white/[.06] px-3 py-2">
              <PlatformIcon id={c.id} colored className="h-4 w-4 shrink-0" />
              <span className="truncate text-[13px] text-white/75">{c.handle}</span>
              <span className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors duration-300 ${on ? 'bg-[#22c55e]/15 text-[#86efac]' : 'bg-[#f59e0b]/15 text-[#fcd34d]'}`}>
                {on ? <><Check className="h-3 w-3" />Connected</> : 'Waiting'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- 5. Where alerts show: in the chat, their own overlay, or both ---------- */
const PLACES = [['chat', 'In the chat'], ['overlay', 'Their own overlay'], ['both', 'Both']] as const;
export function Placement({ active }: { active: boolean }) {
  const [i] = useCycle(3, 3200, active);
  const place = PLACES[i][0];
  const lines: { c: string; w: number; alert?: boolean }[] = [
    { c: platformColor('twitch'), w: 70 }, { c: platformColor('youtube'), w: 55 },
    ...(place !== 'overlay' ? [{ c: '#fe2c55', w: 82, alert: true }] : []),
    { c: platformColor('kick'), w: 64 }, { c: platformColor('facebook'), w: 48 },
  ];
  return (
    <div className="w-full" aria-hidden="true">
      <div className="mb-4 inline-flex max-w-full flex-wrap rounded-full bg-white/[.06] p-1">
        {PLACES.map(([id, label], k) => (
          <span key={id} className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-300 ${k === i ? 'bg-white text-black' : 'text-white/60'}`}>{label}</span>
        ))}
      </div>
      <div className="relative aspect-[16/8] w-full overflow-hidden rounded-xl bg-night">
        <VideoBackdrop clip="night-gamer" active={active} />
        <div className="absolute inset-0 bg-black/25" />
        {place !== 'chat' && (
          <div key={`ov-${i}`} className="absolute left-1/2 top-[10%] w-[24%] -translate-x-1/2">
            <div className="anim-pop flex flex-col items-center text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[radial-gradient(circle,rgba(254,44,85,.45),transparent_68%)]">
                <GiftArt gift="galaxy" className="h-9 w-9 drop-shadow-[0_4px_8px_rgba(0,0,0,.5)]" />
              </span>
              <div className="mt-1.5 h-1 w-2/5 rounded bg-[#ff9ab0]/80" />
              <div className="mt-1.5 h-2 w-4/5 rounded bg-white/85" />
              <div className="mt-1.5 h-1.5 w-1/4 rounded-full bg-[#fe2c55]" />
            </div>
          </div>
        )}
        <div className="absolute bottom-[7%] right-[4%] flex w-[36%] flex-col gap-[5%]">
          {lines.map((l, k) => (
            <div key={`${k}-${l.alert ? i : 'x'}`} className={`flex h-[18px] items-center gap-1.5 rounded-[5px] bg-[#12121a]/90 px-1.5 ${l.alert ? 'anim-pop' : ''}`} style={{ width: `${l.w}%`, background: l.alert ? 'linear-gradient(90deg, rgba(254,44,85,.35), rgba(18,18,26,.85))' : undefined }}>
              <span className="h-2 w-2 rounded-full" style={{ background: l.c }} />
              <span className="h-1.5 flex-1 rounded bg-white/55" />
            </div>
          ))}
        </div>
        <span className="absolute left-3 top-3 rounded bg-[#ff2d55] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">LIVE</span>
      </div>
    </div>
  );
}

/* ---------- 6. Live counters: viewers on every platform, and follower goals filling up ---------- */
const VIEWS: [PlatformId, number][] = [['youtube', 412], ['twitch', 186], ['kick', 74], ['tiktok', 538]];
const GOALS: [PlatformId, number, number][] = [['youtube', 431, 500], ['twitch', 88, 100], ['tiktok', 1183, 1200]];
const fmt = (n: number) => n.toLocaleString('en');
export function Counters({ active }: { active: boolean }) {
  const [t] = useCycle(36, 650, active);
  const views = VIEWS.map(([id, n], i) => [id, n + Math.round(Math.sin((t + i * 4) / 2.6) * (5 + i * 3))] as const);
  const total = views.reduce((s, [, n]) => s + n, 0);
  return (
    <div className="w-full space-y-3" aria-hidden="true">
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 ring-1 ring-white/10">
          <span className="h-2 w-2 rounded-full bg-[#ff2d55] anim-pulse" /><span className="tabular-nums text-[14px]">{fmt(total)}</span><span className="text-white/60">watching</span>
        </span>
        {views.map(([id, n]) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 ring-1 ring-white/10">
            <PlatformIcon id={id} colored className="h-3.5 w-3.5" /><span className="tabular-nums">{fmt(n)}</span>
          </span>
        ))}
      </div>
      <ul className="space-y-2">
        {GOALS.map(([id, base, goal], i) => {
          const n = Math.min(goal, base + Math.floor(t / (2 + i)) * (i === 2 ? 2 : 1));
          const done = n >= goal;
          return (
            <li key={id} className="flex items-center gap-2.5 rounded-xl bg-white/[.06] px-3 py-2">
              <PlatformIcon id={id} colored className="h-4 w-4 shrink-0" />
              <span className="w-24 shrink-0 text-[13px] font-bold tabular-nums text-white">{fmt(n)}<span className="text-white/45"> / {fmt(goal)}</span></span>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: `${(n / goal) * 100}%`, background: platformColor(id) }} />
              </span>
              <span className={`w-14 shrink-0 text-right text-[11px] font-semibold ${done ? 'text-[#86efac]' : 'text-white/50'}`}>{done ? 'Goal! 🎉' : `${fmt(goal - n)} to go`}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
