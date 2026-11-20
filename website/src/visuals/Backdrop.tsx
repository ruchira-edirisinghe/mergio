import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { PlatformIcon, PLATFORMS } from '../components/brand';
import { useInterval, useMediaQuery, useReducedMotion } from '../lib/hooks';

/** Real stream footage (royalty-free, see website/README.md). Each has a .mp4 and a .jpg poster in /public/video. */
export type ClipName = 'live-streamer' | 'live-streamer-tall' | 'night-gamer' | 'celebrate' | 'neon-gamer' | 'rgb-desk';

/**
 * A looping, muted background video. It only downloads and plays while `active` (on screen), shows its poster
 * otherwise, and stays still for people who prefer reduced motion. `tall` is used on portrait phones.
 */
export function VideoBackdrop({ clip, tall, active, className = '' }: { clip: ClipName; tall?: ClipName; active: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const portrait = useMediaQuery('(max-width: 767px) and (orientation: portrait)');
  const name = tall && portrait ? tall : clip;
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active && !reduced) {
      setStarted(true);
      v.play().catch(() => { /* autoplay blocked: the poster stays */ });
    } else v.pause();
  }, [active, reduced, name]);

  return (
    <video
      key={name}
      ref={ref}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      src={`/video/${name}.mp4`}
      poster={`/video/${name}.jpg`}
      preload={started ? 'auto' : 'none'}
      muted
      loop
      playsInline
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

/** "LIVE" badge with a viewer count that drifts, split across the five platforms. */
export function LiveHud({ active, className = '' }: { active: boolean; className?: string }) {
  const [viewers, setViewers] = useState(1284);
  useInterval(() => setViewers(v => Math.max(900, v + Math.round((Math.random() - .42) * 18))), active ? 1600 : null);
  const split = [0.31, 0.22, 0.12, 0.27, 0.08];
  return (
    <div className={`flex flex-wrap items-center gap-2 text-white text-xs font-semibold ${className}`} aria-hidden="true">
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#ff2d55] px-2 py-1 tracking-wider">
        <span className="h-1.5 w-1.5 rounded-full bg-white anim-pulse" />LIVE
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 backdrop-blur-sm tabular-nums">
        <Eye className="h-3.5 w-3.5" />{viewers.toLocaleString('en-US')}
      </span>
      <span className="hidden sm:inline-flex items-center gap-2.5 rounded-md bg-black/55 px-2.5 py-1 backdrop-blur-sm tabular-nums">
        {PLATFORMS.map((pl, i) => (
          <span key={pl.id} className="inline-flex items-center gap-1"><PlatformIcon id={pl.id} colored className="h-3.5 w-3.5" />{Math.round(viewers * split[i])}</span>
        ))}
      </span>
    </div>
  );
}
