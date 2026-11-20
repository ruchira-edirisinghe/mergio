import type { ReactNode } from 'react';
import { PillLink } from '../components/ui';
import { useInView } from '../lib/hooks';
import { AutoDetect, AvatarWall, GiftShow, MergeFlow, Placement, TidyChat } from '../visuals/FeatureVisuals';

function Card({ tone, title, body, wide, children }: { tone: 'light' | 'plum'; title: ReactNode; body: ReactNode; wide?: boolean; children: (active: boolean) => ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const light = tone === 'light';
  return (
    <div ref={ref}
      className={`rounded-2xl p-7 min-h-80 flex flex-col justify-between gap-6 overflow-hidden ${wide ? 'lg:col-span-2' : ''} ${light ? 'bg-white' : 'bg-plum'}`}
      style={light ? { backgroundImage: 'radial-gradient(at 0% 0%, #ece4ff 0, transparent 50%), radial-gradient(at 100% 100%, #ffe1f0 0, transparent 55%)' } : undefined}>
      <h3 className={`text-2xl font-medium leading-snug whitespace-pre-line ${light ? 'text-black' : 'text-white'}`} style={{ letterSpacing: '-0.02em' }}>{title}</h3>
      <div className="flex flex-1 items-center justify-center">{children(inView)}</div>
      <p className={`text-base max-w-sm ${light ? 'text-black/70' : 'text-white/60'}`}>{body}</p>
    </div>
  );
}

export function Info() {
  return (
    <section id="features" className="bg-[#F5F5F5] px-4 sm:px-6 py-24 scroll-mt-4">
      <div className="max-w-[88rem] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-start">
          <div>
            <h2 className="text-black text-4xl md:text-5xl font-medium leading-tight mb-8" style={{ letterSpacing: '-0.03em' }}>Meet Mergio.</h2>
            <PillLink href="#modes">See it in action</PillLink>
          </div>
          <p className="text-black/70 text-2xl md:text-3xl leading-relaxed" style={{ letterSpacing: '-0.01em' }}>
            Your viewers chat in five different places. Mergio reads all of them at once and shows them as one chat on your stream, with alerts for every gift, sub and Super Chat.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card tone="light" wide title="Five chats, one overlay" body="YouTube, Twitch, Kick, TikTok and Facebook flow into a single browser source. Type a name or paste a link, and Mergio reconnects by itself if a connection drops.">
            {a => <MergeFlow active={a} />}
          </Card>
          <Card tone="plum" title={'The real gift,\nevery time.'} body="A Rose shows a rose, a Galaxy shows the galaxy, and TikTok combos count up live.">
            {a => <GiftShow active={a} />}
          </Card>
          <Card tone="plum" title={'Faces, not\njust names.'} body="Real profile pictures for everyone in chat, even when it's busy.">
            {a => <AvatarWall active={a} />}
          </Card>
          <Card tone="plum" title={'Connects when\nyou go live.'} body="Add your channels once. Mergio notices when you start streaming, so there are no live links to paste.">
            {a => <AutoDetect active={a} />}
          </Card>
          <Card tone="light" wide title="Alerts where you want them" body="Show subs, gifts and Super Chats as a calm line in the chat, as big alerts on their own overlay that you can put anywhere, or both.">
            {a => <Placement active={a} />}
          </Card>
          <Card tone="plum" title={'Calm and\ntidy chat.'} body="Follow-up messages tuck under the picture, and old messages can fade away so only the newest stay.">
            {a => <TidyChat active={a} />}
          </Card>
        </div>
      </div>
    </section>
  );
}
