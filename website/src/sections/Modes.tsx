import { useEffect, useState } from 'react';
import { ArrowRight, Bell, MessageSquare, Palette, PanelRight, type LucideIcon } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { Eyebrow } from '../components/ui';
import { useInView } from '../lib/hooks';
import { readme } from '../lib/links';
import { VideoBackdrop, type ClipName } from '../visuals/Backdrop';
import { ALERT_DEMO_LIFE, AlertStage, ObsDock, PanelMock, ThemeStage } from '../visuals/ModeVisuals';
import { ALERT_LOOKS } from '../components/Overlay';

interface Mode { id: string; icon: LucideIcon; tab: string; blurb: string; title: string; text: string; link: string; clip: ClipName; dim?: boolean }
const MODES: Mode[] = [
  { id: 'chat', icon: MessageSquare, tab: 'Chat overlay', blurb: 'Every chat in one browser source', title: 'Chat overlay', clip: 'night-gamer', link: readme('step-3--pick-a-look'),
    text: 'Every platform in one browser source. Pick a look in one click, or pin a message to the top.' },
  { id: 'alerts', icon: Bell, tab: 'Alerts overlay', blurb: 'Fifteen game-style alert themes', title: 'Alerts overlay', clip: 'celebrate', link: readme('step-4--choose-your-alerts'),
    text: 'Level ups, loot drops, gacha pulls, a bounty poster and more. Rarer gifts get their own sound, and a voice can read messages aloud.' },
  { id: 'panel', icon: Palette, tab: 'Control panel', blurb: 'Change anything, save your looks', title: 'Control panel', clip: 'neon-gamer', dim: true, link: readme('complete-guide'),
    text: 'Every overlay is yours to customize. Save three looks for each one, or match them all with one of ten packs. Changes show in OBS instantly.' },
  { id: 'dock', icon: PanelRight, tab: 'OBS docks', blurb: 'Chat, gifts and viewers inside OBS', title: 'OBS docks', clip: 'rgb-desk', dim: true, link: readme('step-7--read-every-chat-while-youre-live'),
    text: 'Your chat, gifts and top supporters, and viewers with the peak, in three OBS docks. One button installs them.' },
];
const AUTO_MS = 9000;
// The alerts tab stays until it has shown every alert look once.
const msFor = (id: string) => (id === 'alerts' ? ALERT_LOOKS.length * ALERT_DEMO_LIFE * 1000 : AUTO_MS);

export function Modes() {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0); // restarts the progress bar
  const [ref, inView] = useInView<HTMLDivElement>();
  // Moves on to the next part after a while; picking one restarts the wait.
  useEffect(() => {
    if (!inView) return;
    const id = window.setTimeout(() => { setI(v => (v + 1) % MODES.length); setTick(t => t + 1); }, msFor(MODES[i].id));
    return () => window.clearTimeout(id);
  }, [i, tick, inView]);
  const m = MODES[i];
  const choose = (k: number) => { setI(k); setTick(t => t + 1); };

  return (
    <section id="modes" className="bg-ink px-4 sm:px-6 py-16 md:py-24 scroll-mt-4">
      <div ref={ref} className="max-w-[88rem] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Reveal variant="left" className="lg:pr-12 lg:pt-2 lg:sticky lg:top-8">
          <Eyebrow>Mergio in practice</Eyebrow>
          <h2 className="text-5xl md:text-6xl font-medium leading-none mb-6" style={{ letterSpacing: '-0.04em' }}>Built for<br />your stream</h2>
          <p className="text-white/60 text-base leading-relaxed max-w-sm mb-8 lg:mb-10">
            Pick one to see it running.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 lg:max-w-md" role="tablist" aria-label="Parts of Mergio">
            {MODES.map((mode, k) => {
              const on = k === i;
              const Icon = mode.icon;
              return (
                <button key={mode.id} type="button" role="tab" aria-selected={on} onClick={() => choose(k)}
                  className={`relative w-full overflow-hidden rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 text-left transition-colors duration-200 ${on ? 'bg-white/[.07] ring-1 ring-white/10' : 'hover:bg-white/[.04]'}`}>
                  <span className="flex items-center gap-4">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors duration-200 ${on ? 'bg-white text-black' : 'bg-white/[.06] text-white/60'}`}><Icon className="h-5 w-5" /></span>
                    <span>
                      <span className="block text-base font-medium text-white">{mode.tab}</span>
                      <span className="block text-sm text-white/55">{mode.blurb}</span>
                    </span>
                  </span>
                  {on && inView && <span key={tick} className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-linear-to-r from-violet to-pink" style={{ animation: `fill-x ${msFor(mode.id)}ms linear both` }} />}
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal variant="right" delay={120}>
        <div className="relative rounded-3xl overflow-hidden min-h-[760px] bg-night ring-1 ring-white/10" role="tabpanel" aria-label={m.title}>
          <VideoBackdrop clip={m.clip} active={inView} />
          <div className={`absolute inset-0 ${m.dim ? 'bg-[#07060c]/60' : 'bg-[#07060c]/25'}`} />
          <div className="absolute inset-x-0 top-0 h-2/3 bg-linear-to-b from-[#0a0716]/90 via-[#0a0716]/55 to-transparent" />
          <div key={`text-${m.id}`} className="relative z-10 p-6 sm:p-8 md:p-12 anim-rise">
            <h3 className="text-white text-3xl sm:text-4xl md:text-5xl font-medium leading-tight mb-5" style={{ letterSpacing: '-0.03em' }}>{m.title}</h3>
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
        </Reveal>
      </div>
    </section>
  );
}
