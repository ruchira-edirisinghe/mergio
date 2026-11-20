import { useState } from 'react';
import { AppWindow, Filter, Gift, Layers, Lock, MessageSquare, Palette, Radar, ShieldCheck, Smile, Timer, Zap, Plus, type LucideIcon } from 'lucide-react';
import { Eyebrow } from '../components/ui';
import { readme } from '../lib/links';

const FEATURES: [LucideIcon, string, string][] = [
  [Radar, 'Auto-connect', 'Add your channels once. Mergio connects as soon as you go live.'],
  [Gift, 'Every alert type', 'TikTok gifts, Bits, subs, gift subs, raids, Super Chats, Super Stickers, members, KICKs and more.'],
  [Smile, 'Emotes everywhere', 'Twitch, 7TV, BetterTTV, FrankerFaceZ, YouTube custom emoji, Kick emotes and cheermotes.'],
  [Palette, 'Six looks and any font', 'One-click styles plus every Google Font, colours, roundness, alignment and animations.'],
  [Timer, 'Disappearing messages', 'Messages fade out after the time you choose, so only the newest stay on screen.'],
  [Layers, 'A look per scene', 'Add options to the overlay link to change one browser source, like bigger text in Just Chatting.'],
  [Zap, 'Instant updates', 'Changes reach OBS immediately, and the control panel tells you when OBS is showing the overlay.'],
  [ShieldCheck, 'Moderation sync', 'Messages deleted or users banned on Twitch, YouTube or Kick vanish from the overlay too.'],
  [Filter, 'Filters', 'Hide !commands, bots or blocked words, set a minimum TikTok gift value, choose who may post images.'],
  [MessageSquare, 'One feed for you', 'A Live chat page with every chat in one list. Dock it inside OBS.'],
  [AppWindow, 'Install it as an app', 'The control panel opens in its own window with its own icon, not a browser tab.'],
  [Lock, 'Private', 'Everything runs on your own PC. No telemetry, no accounts, no cloud.'],
];

export function Features() {
  return (
    <section className="bg-[#F5F5F5] px-4 sm:px-6 pb-24">
      <div className="max-w-[88rem] mx-auto rounded-3xl bg-white p-8 md:p-12">
        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div>
            <Eyebrow>And there's more</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-medium leading-tight" style={{ letterSpacing: '-0.03em' }}>Everything a<br />multistream needs.</h2>
          </div>
          <a href={readme('features')} target="_blank" rel="noopener noreferrer" className="text-base text-black/60 underline-offset-4 hover:text-black hover:underline md:justify-self-end">Full feature list on GitHub →</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
          {FEATURES.map(([Icon, title, text]) => (
            <div key={title}>
              <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#f1ecff] text-[#6a3dff]"><Icon className="h-5 w-5" /></span>
              <h3 className="mb-1 text-base font-semibold">{title}</h3>
              <p className="text-[15px] leading-relaxed text-black/60">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQ: [string, string][] = [
  ['Is Mergio really free?', 'Yes. Mergio is open source under the MIT License. There are no subscriptions, no paid tiers and no account to create.'],
  ['Do I need to log in or get API keys?', 'Not for YouTube, Twitch, Kick or TikTok: type your username or paste a link. TikTok has an optional free key that raises its connection limits. Facebook needs a free Page access token, and the guide on GitHub walks you through it.'],
  ['Does it work with Streamlabs, Meld, vMix or TikTok LIVE Studio?', 'Yes. Anything that can show a web page works: add a browser source (or "Web Browser" input in vMix, "Link" source in TikTok LIVE Studio) and paste the same overlay link.'],
  ['Do I have to paste a new link every time I go live?', 'No. Add your channel once (for Facebook, your Page). Mergio notices when you go live and connects by itself.'],
  ['Where does my chat go?', 'Nowhere. Mergio runs on your own computer and only talks to the platforms you add. There is no telemetry and no cloud service in between.'],
  ['Which computers does it run on?', 'Windows 10 and 11 (installer or portable), macOS on Apple silicon, and Linux (.deb or .tar.gz). Every download is on the GitHub releases page.'],
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="bg-[#F5F5F5] px-4 sm:px-6 pb-24 scroll-mt-4">
      <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="md:pr-12">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-medium leading-tight mb-4" style={{ letterSpacing: '-0.03em' }}>Questions,<br />answered.</h2>
          <p className="text-black/60 text-base max-w-sm">Something else? The <a className="underline underline-offset-4 hover:text-black" href={readme('troubleshooting')} target="_blank" rel="noopener noreferrer">guide and troubleshooting</a> on GitHub cover the rest.</p>
        </div>
        <div className="divide-y divide-black/10 rounded-3xl bg-white px-6 md:px-8">
          {FAQ.map(([q, a], k) => {
            const on = open === k;
            return (
              <div key={q}>
                <button type="button" aria-expanded={on} onClick={() => setOpen(on ? -1 : k)} className="flex w-full items-center gap-4 py-5 text-left text-base md:text-lg font-medium">
                  {q}
                  <Plus className={`ml-auto h-5 w-5 shrink-0 transition-transform duration-300 ${on ? 'rotate-45' : ''}`} />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <p className="overflow-hidden text-base leading-relaxed text-black/60"><span className="block pb-5">{a}</span></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
