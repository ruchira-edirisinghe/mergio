import { useState } from 'react';
import { Bookmark, Eye, EyeOff, Filter, Gift, Info, Languages, Layers, Lock, Palette, PanelRight, Radar, RefreshCw, Rows3, ShieldCheck, Smile, Sparkles, Target, Trophy, Zap, Plus, type LucideIcon } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { Eyebrow } from '../components/ui';
import { readme } from '../lib/links';

const ROW_A: [LucideIcon, string][] = [
  [Sparkles, 'Ten alert themes'], [Trophy, 'Gift rarity & levels'], [Radar, 'Auto-connect'], [Gift, 'Every alert type'], [Smile, '7TV, BTTV & FFZ emotes'],
  [Palette, 'Any Google Font'], [Eye, 'Viewer count'], [Target, 'Follower goals'], [Languages, 'Any language'], [Bookmark, 'Three saved looks'],
];
const ROW_B: [LucideIcon, string][] = [
  [PanelRight, 'OBS docks'], [EyeOff, 'Hide any message'], [Rows3, 'Counters in one line'], [Zap, 'Instant updates'], [ShieldCheck, 'Moderation sync'], [Filter, 'Bot & word filters'],
  [Info, 'Plain-words tips'], [RefreshCw, 'Updates itself'], [Layers, 'A look per scene'], [Lock, 'Private, no cloud'],
];

function ChipRow({ items, reverse }: { items: [LucideIcon, string][]; reverse?: boolean }) {
  return (
    <div className="overflow-hidden marquee-mask">
      <div className={`marquee-track ${reverse ? 'marquee-rev' : ''}`}>
        {[0, 1].map(copy => (
          <div key={copy} className="flex shrink-0 gap-3 pr-3" aria-hidden={copy === 1}>
            {items.map(([Icon, label]) => (
              <span key={label} className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full bg-white/[.06] py-2.5 pl-2.5 pr-5 text-base font-medium text-white/85 ring-1 ring-white/10">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet/40 to-pink/30 text-white"><Icon className="h-4 w-4" /></span>
                {label}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section className="bg-ink pb-20 md:pb-24">
      <Reveal className="mx-auto mb-10 max-w-[88rem] px-4 sm:px-6 text-center">
        <Eyebrow>And there's more</Eyebrow>
        <h2 className="text-4xl md:text-5xl font-medium leading-tight" style={{ letterSpacing: '-0.03em' }}>Everything a multistream needs.</h2>
      </Reveal>
      <Reveal variant="scale" delay={150} className="grid gap-3">
        <ChipRow items={ROW_A} />
        <ChipRow items={ROW_B} reverse />
      </Reveal>
      <p className="mt-8 text-center">
        <a href={readme('features')} target="_blank" rel="noopener noreferrer" className="text-base text-white/55 underline-offset-4 hover:text-white hover:underline">Full feature list on GitHub →</a>
      </p>
    </section>
  );
}

/** The questions on the page, also used for the FAQ data search engines read (see seo.ts). */
export const FAQ: [string, string][] = [
  ['Is it really free?', 'Yes. Mergio is free and open source under the MIT License, with credit to its creator. No subscriptions, no account.'],
  ['Do I need API keys?', 'No. Type your username or paste a link. Only Facebook needs a free Page token, and the guide shows how.'],
  ['Can it show my viewers and follower goals?', 'Yes. The viewer count and follower goal overlays add up every platform live, can sit in one line, and show only the numbers you pick.'],
  ['Can I take a message off the stream?', 'Yes. In Live chat, hide any message from the overlay in one click, or keep only the ones you pick and clear the rest.'],
  ['Where does my chat go?', 'Nowhere. Mergio runs on your own PC, with no telemetry and no cloud.'],
  ['Is it safe?', "Mergio only listens on your own PC, and websites you visit can't talk to it. Your keys never reach the overlays, chat is always shown as plain text, and updates are checked before they install. The security policy, linked at the bottom of this page, has the details."],
  ['How do I update?', 'Mergio tells you when a new version is out. On Windows, one click downloads it, installs it and opens Mergio again.'],
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="bg-ink px-4 sm:px-6 pb-20 md:pb-24 scroll-mt-4">
      <div className="max-w-[88rem] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Reveal variant="left" className="lg:pr-12">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-medium leading-tight mb-4" style={{ letterSpacing: '-0.03em' }}>Questions,<br />answered.</h2>
          <p className="text-white/60 text-base max-w-sm">More in the <a className="underline underline-offset-4 hover:text-white" href={readme('troubleshooting')} target="_blank" rel="noopener noreferrer">guide on GitHub</a>.</p>
        </Reveal>
        <Reveal variant="right" delay={100} className="divide-y divide-white/10 rounded-3xl bg-surface px-5 sm:px-6 md:px-8 ring-1 ring-white/[.07]">
          {FAQ.map(([q, a], k) => {
            const on = open === k;
            return (
              <div key={q}>
                <button type="button" aria-expanded={on} onClick={() => setOpen(on ? -1 : k)} className="flex w-full items-center gap-4 py-5 text-left text-base md:text-lg font-medium">
                  {q}
                  <Plus className={`ml-auto h-5 w-5 shrink-0 transition-transform duration-300 ${on ? 'rotate-45' : ''}`} />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <p className="overflow-hidden text-base leading-relaxed text-white/60"><span className="block pb-5">{a}</span></p>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
