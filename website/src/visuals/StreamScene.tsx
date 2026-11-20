import { useId, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { PlatformIcon, PLATFORMS } from '../components/brand';
import { useInterval } from '../lib/hooks';

/** Seeded random so the stars land in the same place on every render. */
function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const PALETTES = {
  sunset: { sky: 'linear-gradient(180deg, #07051a 0%, #170a36 34%, #4a1366 56%, #c2307f 68%, #ff7a7a 73%)', sun: ['#ffe46b', '#ff5fa2'], hill1: '#2a0f4f', hill2: '#180a33', floor: '#0d0620' },
  night: { sky: 'linear-gradient(180deg, #030814 0%, #071a3a 40%, #0d3a6e 60%, #1fb5c9 71%, #7cf2e4 74%)', sun: ['#c9fff6', '#3fd0ff'], hill1: '#0a2447', hill2: '#061630', floor: '#030c1c' },
};

/** A synthwave "game" scene drawn in code: stars, a striped sun, hills, a scrolling grid floor and a little ship. */
export function StreamScene({ variant = 'sunset', hud = 'left', ship = true, active = true }: { variant?: keyof typeof PALETTES; hud?: 'left' | 'right' | false; ship?: boolean; active?: boolean }) {
  const p = PALETTES[variant];
  const shipId = `ship-${useId().replace(/:/g, '')}`;
  const stars = useMemo(() => {
    const r = rand(variant === 'sunset' ? 7 : 11);
    return Array.from({ length: 46 }, () => ({ x: r() * 100, y: r() * 55, s: r() * 1.8 + .6, d: r() * 3 }));
  }, [variant]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true" style={{ background: p.sky }}>
      {stars.map((s, i) => (
        <span key={i} className="absolute rounded-full bg-white anim-twinkle" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s`, animationPlayState: active ? 'running' : 'paused' }} />
      ))}

      {/* sun with horizontal cut-outs */}
      <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{
        top: '30%', width: '36%', maxWidth: 460, aspectRatio: '1',
        background: `linear-gradient(180deg, ${p.sun[0]}, ${p.sun[1]})`,
        boxShadow: `0 0 120px 20px ${p.sun[1]}55`,
        maskImage: 'linear-gradient(180deg, #000 52%, transparent 52%, transparent 55%, #000 55%, #000 61%, transparent 61%, transparent 65%, #000 65%, #000 70%, transparent 70%, transparent 75%, #000 75%, #000 79%, transparent 79%, transparent 85%, #000 85%)',
        WebkitMaskImage: 'linear-gradient(180deg, #000 52%, transparent 52%, transparent 55%, #000 55%, #000 61%, transparent 61%, transparent 65%, #000 65%, #000 70%, transparent 70%, transparent 75%, #000 75%, #000 79%, transparent 79%, transparent 85%, #000 85%)',
      }} />

      {/* hills */}
      <svg className="absolute inset-x-0 w-full" style={{ top: '52%', height: '22%' }} viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path d="M0 200 L0 120 L90 70 L170 120 L260 40 L360 130 L450 90 L520 140 L640 60 L760 150 L860 80 L960 130 L1060 50 L1200 120 L1200 200Z" fill={p.hill1} />
        <path d="M0 200 L0 160 L120 110 L230 170 L330 120 L470 180 L600 130 L720 175 L840 120 L980 170 L1100 125 L1200 160 L1200 200Z" fill={p.hill2} />
      </svg>

      {/* grid floor in perspective */}
      <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ top: '72%', background: p.floor, perspective: '260px' }}>
        <div className="absolute grid-floor" style={{ left: '-50%', width: '200%', top: 0, height: '220%', transform: 'rotateX(64deg)', transformOrigin: 'top', animationPlayState: active ? 'running' : 'paused',
          backgroundImage: variant === 'night' ? 'linear-gradient(rgba(70,220,255,.5) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(70,220,255,.5) 1.5px, transparent 1.5px)' : undefined }} />
        <div className="absolute inset-x-0 top-0 h-1/3" style={{ background: `linear-gradient(180deg, ${p.floor}, transparent)` }} />
      </div>

      {ship && (
        <div className="absolute left-1/2 anim-float" style={{ bottom: '9%', width: '11%', maxWidth: 150, translate: '-50% 0', animationPlayState: active ? 'running' : 'paused' }}>
          <svg viewBox="0 0 160 80" className="w-full drop-shadow-[0_0_18px_rgba(255,80,200,.6)]">
            <defs>
              <linearGradient id={shipId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4f0ff" /><stop offset="1" stopColor="#8f7cff" /></linearGradient>
            </defs>
            <path d="M80 6 L150 62 L112 56 L80 70 L48 56 L10 62Z" fill={`url(#${shipId})`} />
            <path d="M80 16 L96 46 L80 52 L64 46Z" fill="#2b1f6b" />
            <path d="M80 20 L90 42 L80 46 L70 42Z" fill="#6bf3ff" opacity=".85" />
            <path d="M58 64 L68 78 L74 64Z M86 64 L92 78 L102 64Z" fill="#ff5fa2" />
          </svg>
        </div>
      )}

      {hud && <LiveHud active={active} side={hud} />}
    </div>
  );
}

function LiveHud({ active, side }: { active: boolean; side: 'left' | 'right' }) {
  const [viewers, setViewers] = useState(1284);
  useInterval(() => setViewers(v => Math.max(900, v + Math.round((Math.random() - .42) * 18))), active ? 1600 : null);
  const split = [0.31, 0.22, 0.12, 0.27, 0.08];
  return (
    <div className={`absolute bottom-4 sm:bottom-6 flex flex-wrap items-center gap-2 text-white text-xs font-semibold z-20 ${side === 'left' ? 'left-4 sm:left-6' : 'right-4 sm:right-6 justify-end'}`}>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#ff2d55] px-2 py-1 tracking-wider">
        <span className="h-1.5 w-1.5 rounded-full bg-white anim-pulse" />LIVE
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-black/45 px-2 py-1 backdrop-blur-sm tabular-nums">
        <Eye className="h-3.5 w-3.5" />{viewers.toLocaleString('en-US')}
      </span>
      <span className="hidden sm:inline-flex items-center gap-2.5 rounded-md bg-black/45 px-2.5 py-1 backdrop-blur-sm tabular-nums">
        {PLATFORMS.map((pl, i) => (
          <span key={pl.id} className="inline-flex items-center gap-1"><PlatformIcon id={pl.id} colored className="h-3.5 w-3.5" />{Math.round(viewers * split[i])}</span>
        ))}
      </span>
    </div>
  );
}
