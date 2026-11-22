import type { ReactNode } from 'react';
import { PillLink } from '../components/ui';
import { Reveal } from '../components/Reveal';
import { useInView } from '../lib/hooks';
import { AutoDetect, Counters, GiftShow, LevelUp, MergeFlow, Placement } from '../visuals/FeatureVisuals';

function Card({ tone, title, body, wide, delay = 0, children }: { tone: 'light' | 'plum'; title: ReactNode; body: ReactNode; wide?: boolean; delay?: number; children: (active: boolean) => ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const light = tone === 'light';
  return (
    <Reveal variant="up" delay={delay} className={wide ? 'sm:col-span-2' : ''}>
    <div ref={ref}
      className={`lift h-full rounded-2xl p-7 min-h-80 flex flex-col justify-between gap-6 overflow-hidden ${light ? 'bg-surface ring-1 ring-white/[.07]' : 'bg-plum'}`}
      style={light ? { backgroundImage: 'radial-gradient(at 0% 0%, rgba(124,77,255,.22) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(255,45,143,.16) 0, transparent 55%)' } : undefined}>
      <h3 className={`text-2xl font-medium leading-snug whitespace-pre-line text-white`} style={{ letterSpacing: '-0.02em' }}>{title}</h3>
      <div className="flex flex-1 items-center justify-center">{children(inView)}</div>
      <p className={`text-base max-w-sm ${light ? 'text-white/70' : 'text-white/60'}`}>{body}</p>
    </div>
    </Reveal>
  );
}

export function Info() {
  return (
    <section id="features" className="bg-ink px-4 sm:px-6 py-16 md:py-24 scroll-mt-4">
      <div className="max-w-[88rem] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12 lg:mb-16 items-start">
          <Reveal variant="left">
            <h2 className="text-white text-4xl md:text-5xl font-medium leading-tight mb-8" style={{ letterSpacing: '-0.03em' }}>Meet Mergio.</h2>
            <PillLink href="#modes">See it in action</PillLink>
          </Reveal>
          <Reveal as="p" variant="blur" delay={150} className="text-white/70 text-2xl sm:text-3xl lg:text-4xl leading-snug" style={{ letterSpacing: '-0.02em' }}>
            Your viewers chat in five places. <span className="text-white">Mergio puts them all in one.</span>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:grid-flow-dense">
          <Card tone="light" wide title="Five chats, one overlay" body="Every platform flows into one browser source.">
            {a => <MergeFlow active={a} />}
          </Card>
          <Card tone="plum" delay={100} title={'The real gift,\nevery time.'} body="Gifts show up as the real thing, combos count live.">
            {a => <GiftShow active={a} />}
          </Card>
          <Card tone="plum" title={'Gifts that\nlevel up.'} body="Bigger gifts drop rarer alerts, from common to legendary.">
            {a => <LevelUp active={a} />}
          </Card>
          <Card tone="plum" delay={100} title={'Connects when\nyou go live.'} body="Add your channels once. That's it.">
            {a => <AutoDetect active={a} />}
          </Card>
          <Card tone="light" wide delay={200} title="Alerts where you want them" body="In the chat, on their own overlay, or both.">
            {a => <Placement active={a} />}
          </Card>
          <Card tone="plum" title={'Viewers and\nfollower goals.'} body="Live counts from every platform, even in one line.">
            {a => <Counters active={a} />}
          </Card>
        </div>
      </div>
    </section>
  );
}
