import { ArrowUpRight, BadgeCheck, Code2, Monitor, UserX } from 'lucide-react';
import { Fragment, type CSSProperties } from 'react';
import { GithubIcon, PlatformIcon, PLATFORMS } from '../components/brand';
import { ALERT_LOOKS, AlertShow, ChatFeed } from '../components/Overlay';
import { PillLink } from '../components/ui';
import { ALERTS, SCRIPT } from '../lib/chat';
import { useCycle, useFeed, useInView, useLatestVersion } from '../lib/hooks';
import { RELEASES, REPO } from '../lib/links';
import { LiveHud, VideoBackdrop } from '../visuals/Backdrop';

const ALERT_LIFE = 5.5;

export function Hero() {
  const [ref, inView] = useInView<HTMLDivElement>('0px');
  const items = useFeed(SCRIPT, 1700, inView, 10, 6);
  const [ai] = useCycle(ALERTS.length, ALERT_LIFE * 1000, inView);
  const version = useLatestVersion();

  return (
    <section className="flex-1 px-4 sm:px-6 pt-20 pb-4 sm:pb-6 flex items-end">
      <div ref={ref} className="relative w-full rounded-2xl overflow-hidden bg-night ring-1 ring-white/10 lg:h-[calc(100vh-96px)] lg:min-h-[660px]">
        <VideoBackdrop clip="live-streamer" tall="live-streamer-tall" active={inView} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07060c]/85 via-[#07060c]/60 to-[#07060c]/85 lg:bg-gradient-to-r lg:from-[#07060c]/95 lg:via-[#07060c]/65 lg:to-[#07060c]/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,77,255,.25),transparent_55%)]" />
        <LiveHud active={inView} className="absolute bottom-4 right-4 z-20 justify-end sm:bottom-6 sm:right-6" />

        <div className="relative z-10 grid h-full grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="flex flex-col items-start justify-start p-6 pt-12 sm:p-10 sm:pt-16 lg:p-12 lg:pt-24 xl:pt-32">
            <a href={RELEASES} target="_blank" rel="noopener noreferrer"
              style={{ '--d': '0ms' } as CSSProperties}
              className="word-in mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1.5 pl-1.5 pr-3 text-sm text-white/85 backdrop-blur-md hover:bg-white/15 transition-colors">
              <span className="rounded-full bg-gradient-to-r from-violet to-pink px-2.5 py-0.5 text-xs font-semibold text-white">{version}</span>
              100% free &amp; open source
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <h1 className="text-white text-5xl md:text-6xl xl:text-7xl font-medium leading-[1.02] max-w-xl mb-5" style={{ letterSpacing: '-0.045em' }}>
              {/* real spaces between the words, so screen readers and search engines read "Every live chat. One overlay." */}
              {['Every', 'live', 'chat.'].map((w, k) => <Fragment key={w}>{k > 0 && ' '}<span className="word-in inline-block" style={{ '--d': `${120 + k * 90}ms` } as CSSProperties}>{w}</span></Fragment>)}
              {' '}<br />
              {['One', 'overlay.'].map((w, k) => <Fragment key={w}>{k > 0 && ' '}<span className="word-in inline-block text-gradient-live pb-1" style={{ '--d': `${420 + k * 110}ms` } as CSSProperties}>{w}</span></Fragment>)}
            </h1>
            <p className="word-in text-white/75 text-base md:text-lg max-w-md mb-8 leading-relaxed" style={{ '--d': '700ms' } as CSSProperties}>
              YouTube, Twitch, Kick, TikTok and Facebook chat, merged into one beautiful OBS overlay. Free, and no accounts.
            </p>
            <div className="word-in flex flex-wrap items-center gap-3" style={{ '--d': '850ms' } as CSSProperties}>
              <PillLink href={RELEASES} size="lg" external>Download free</PillLink>
              <a href={REPO} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full border border-white/20 px-6 py-3.5 text-base md:text-lg font-medium text-white hover:bg-white/10 transition-colors duration-200">
                <GithubIcon className="h-5 w-5" />View on GitHub
              </a>
            </div>
            <ul className="word-in mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70" style={{ '--d': '950ms' } as CSSProperties}>
              <li className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-[#4ade80]" />Free forever</li>
              <li className="inline-flex items-center gap-1.5"><Code2 className="h-4 w-4 text-[#c9b8ff]" />Open source</li>
              <li className="inline-flex items-center gap-1.5"><UserX className="h-4 w-4 text-[#ff8fc7]" />No account needed</li>
              <li className="inline-flex items-center gap-1.5"><Monitor className="h-4 w-4 text-white/50" />Windows · macOS · Linux</li>
            </ul>

            <div className="mt-10 lg:mt-auto lg:pt-10 w-full">
              <p className="word-in mb-3.5 text-xs font-semibold uppercase tracking-[.18em] text-white/50" style={{ '--d': '1000ms' } as CSSProperties}>Works with</p>
              <ul className="flex flex-wrap gap-2.5 sm:gap-3" aria-label="Works with YouTube, Twitch, Kick, TikTok and Facebook">
                {PLATFORMS.map((p, i) => (
                  <li key={p.id} className="word-in inline-flex items-center gap-2.5 rounded-2xl bg-white/[.06] py-2 pl-2 pr-4 ring-1 ring-white/10 backdrop-blur-sm transition-colors duration-200 hover:bg-white/[.11]"
                    style={{ '--d': `${1080 + i * 80}ms` } as CSSProperties}>
                    <span className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl" style={{ background: `${p.color}24`, boxShadow: `inset 0 0 0 1px ${p.color}55` }}>
                      <PlatformIcon id={p.id} colored className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
                    </span>
                    <span className="text-base sm:text-[17px] font-semibold tracking-tight text-white">{p.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The overlays, sitting on the stream like OBS browser sources */}
          <div className="relative h-[520px] sm:h-[580px] lg:h-auto px-4 pb-16 sm:px-6 lg:pl-0 lg:pr-6 lg:pb-20 lg:pt-6">
            {/* a fixed slot above the chat: every look fits in it, so an alert never covers the chat box */}
            <div className="absolute inset-x-4 top-8 h-[150px] sm:inset-x-6 lg:left-0 lg:right-6 lg:top-10 lg:h-[180px] flex items-center justify-center z-10 pointer-events-none">
              <AlertShow key={ai} item={ALERTS[ai]} look={ALERT_LOOKS[ai % ALERT_LOOKS.length].id} life={ALERT_LIFE} size={0.62} fit />
            </div>
            <div className="relative h-full pt-[210px] lg:pt-[250px]">
              <div className="relative h-full rounded-[3px] outline outline-[1.5px] outline-[#ff4d4d]/75">
                <span className="absolute -top-6 left-0 rounded-t-md bg-[#ff4d4d]/85 px-2 py-0.5 text-[11px] font-semibold text-white">Browser source · Mergio</span>
                {['-left-1 -top-1', '-right-1 -top-1', '-left-1 -bottom-1', '-right-1 -bottom-1'].map(c => <span key={c} className={`absolute ${c} h-2 w-2 bg-[#ff4d4d]`} />)}
                <ChatFeed items={items} fontSize={14.5} className="absolute inset-0 p-3 [mask-image:linear-gradient(180deg,transparent,#000_22%)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
