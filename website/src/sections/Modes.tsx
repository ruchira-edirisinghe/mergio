import { useEffect, useState } from 'react';
import { ArrowRight, Bell, MessageSquare, Palette, PanelRight, type LucideIcon } from 'lucide-react';
import { Eyebrow } from '../components/ui';
import { useInView } from '../lib/hooks';
import { readme } from '../lib/links';
import { StreamScene } from '../visuals/StreamScene';
import { AlertStage, ObsDock, PanelMock, ThemeStage } from '../visuals/ModeVisuals';

interface Mode { id: string; icon: LucideIcon; tab: string; blurb: string; title: string; text: string; link: string; scene: 'sunset' | 'night'; dim?: boolean }
const MODES: Mode[] = [
  { id: 'chat', icon: MessageSquare, tab: 'Chat overlay', blurb: 'Every chat in one browser source', title: 'Chat overlay', scene: 'night', link: readme('step-5--make-it-yours'),
    text: 'One browser source for every platform. Pick from Glass, Neon, Minimal, Soft light, Retro pixel or Bold cards, or tune any font, colour and animation yourself.' },
  { id: 'alerts', icon: Bell, tab: 'Alerts overlay', blurb: 'Big alerts, anywhere on your scene', title: 'Alerts overlay', scene: 'sunset', link: readme('step-6--choose-your-alerts'),
    text: 'Subs, gifts, Super Chats, raids and follows pop up one at a time on their own browser source. It stays see-through until an alert comes in.' },
  { id: 'panel', icon: Palette, tab: 'Control panel', blurb: 'Change anything, see it instantly', title: 'Control panel', scene: 'night', dim: true, link: readme('step-3--open-mergio'),
    text: 'A friendly control panel with a live preview. Every change reaches OBS the moment you make it, so you never copy the link again. Install it as an app with its own window.' },
  { id: 'dock', icon: PanelRight, tab: 'Live chat dock', blurb: 'Read every chat inside OBS', title: 'Live chat dock', scene: 'sunset', dim: true, link: readme('step-8--optional-control-mergio-from-inside-obs'),
    text: 'Read every chat in one list while you stream, right inside OBS as a custom dock. Deleted messages and bans on Twitch, YouTube and Kick disappear from your overlay too.' },
];
const AUTO_MS = 9000;

export function Modes() {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0); // restarts the progress bar
  const [ref, inView] = useInView<HTMLDivElement>();
  // Moves on to the next part after a while; picking one restarts the wait.
  useEffect(() => {
    if (!inView) return;
    const id = window.setTimeout(() => { setI(v => (v + 1) % MODES.length); setTick(t => t + 1); }, AUTO_MS);
    return () => window.clearTimeout(id);
  }, [i, tick, inView]);
  const m = MODES[i];
  const choose = (k: number) => { setI(k); setTick(t => t + 1); };

  return (
    <section id="modes" className="bg-[#F5F5F5] px-4 sm:px-6 py-24 scroll-mt-4">
      <div ref={ref} className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="md:pr-12 md:pt-2 md:sticky md:top-8">
          <Eyebrow>Mergio in practice</Eyebrow>
          <h2 className="text-5xl md:text-6xl font-medium leading-none mb-6" style={{ letterSpacing: '-0.04em' }}>Built for<br />your stream</h2>
          <p className="text-black/60 text-base leading-relaxed max-w-sm mb-10">
            Two overlays for OBS, a control panel to style them and a dock to read every chat. Pick one to see it running.
          </p>
          <div className="space-y-2 max-w-md" role="tablist" aria-label="Parts of Mergio">
            {MODES.map((mode, k) => {
              const on = k === i;
              const Icon = mode.icon;
              return (
                <button key={mode.id} type="button" role="tab" aria-selected={on} onClick={() => choose(k)}
                  className={`relative w-full overflow-hidden rounded-2xl px-5 py-4 text-left transition-colors duration-200 ${on ? 'bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,.18)]' : 'hover:bg-white/60'}`}>
                  <span className="flex items-center gap-4">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors duration-200 ${on ? 'bg-black text-white' : 'bg-black/5 text-black/60'}`}><Icon className="h-5 w-5" /></span>
                    <span>
                      <span className="block text-base font-medium text-black">{mode.tab}</span>
                      <span className="block text-sm text-black/55">{mode.blurb}</span>
                    </span>
                  </span>
                  {on && inView && <span key={tick} className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-gradient-to-r from-violet to-pink" style={{ animation: `fill-x ${AUTO_MS}ms linear both` }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative rounded-3xl overflow-hidden min-h-[820px] md:min-h-[760px] bg-night" role="tabpanel" aria-label={m.title}>
          <StreamScene variant={m.scene} hud={false} ship={!m.dim} active={inView} />
          <div className={`absolute inset-0 ${m.dim ? 'bg-[#0a0716]/55' : ''}`} />
          <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-[#0a0716]/90 via-[#0a0716]/55 to-transparent" />
          <div key={`text-${m.id}`} className="relative z-10 p-8 md:p-12 anim-rise">
            <h3 className="text-white text-4xl md:text-5xl font-medium leading-tight mb-5" style={{ letterSpacing: '-0.03em' }}>{m.title}</h3>
            <p className="text-white/70 text-base max-w-md mb-8">{m.text}</p>
            <a href={m.link} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-3 text-white font-medium">
              <span className="w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center group-hover:bg-white transition-colors"><ArrowRight className="w-4 h-4 text-black" /></span>
              Know more
            </a>
          </div>
          {m.id === 'chat' && <ThemeStage active={inView} />}
          {m.id === 'alerts' && <AlertStage active={inView} />}
          {(m.id === 'panel' || m.id === 'dock') && (
            <div key={`mock-${m.id}`} className="absolute inset-x-0 bottom-0 px-4 pb-6 md:px-8 md:pb-10 anim-rise">
              {m.id === 'panel' ? <PanelMock active={inView} /> : <ObsDock active={inView} />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
