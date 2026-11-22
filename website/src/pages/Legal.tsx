import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, Ban, FileText, HardDrive, Handshake, Scale, ShieldCheck, TriangleAlert, Unplug, UserX, type LucideIcon } from 'lucide-react';
import { Wordmark } from '../components/brand';
import { Footer } from '../sections/Closing';
import { REPO } from '../lib/links';

export type LegalDoc = 'privacy' | 'terms';

const UPDATED = '22 November 2026';
const CREATOR = { name: 'Ruchira Edirisinghe', url: 'https://ruchiraedirisinghe.vercel.app' };
const ISSUES = `${REPO}/issues/new/choose`;
const LICENSE = `${REPO}/blob/main/LICENSE`;

/* ---------- small building blocks for the text ---------- */
const P = ({ children, id }: { children: ReactNode; id?: string }) => <p id={id} className="scroll-mt-24 text-[15.5px] leading-relaxed text-white/65">{children}</p>;
const UL = ({ children }: { children: ReactNode }) => <ul className="grid gap-2.5 pl-1 text-[15.5px] leading-relaxed text-white/65">{children}</ul>;
const LI = ({ children }: { children: ReactNode }) => (
  <li className="flex gap-3"><span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-violet to-pink" /><span>{children}</span></li>
);
const B = ({ children }: { children: ReactNode }) => <strong className="font-semibold text-white/90">{children}</strong>;
const A = ({ href, children }: { href: string; children: ReactNode }) => {
  const ext = /^https?:/.test(href);
  return <a href={href} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="font-medium text-[#c9b8ff] underline decoration-[#c9b8ff]/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60">{children}</a>;
};
const Code = ({ children }: { children: ReactNode }) => <code className="rounded-md bg-white/[.08] px-1.5 py-0.5 font-mono text-[.85em] text-[#d8ceff]">{children}</code>;

function ServiceTable({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-white/[.08]">
      <div className="hidden grid-cols-[1.1fr_1.4fr_1.4fr] gap-4 bg-white/[.04] px-5 py-3 text-xs font-medium uppercase tracking-[.14em] text-white/45 md:grid">
        <span>Service</span><span>What it's for</span><span>What it receives</span>
      </div>
      {rows.map(([name, href, why, gets]) => (
        <div key={name} className="grid gap-1.5 border-t border-white/[.06] px-5 py-4 first:border-t-0 md:grid-cols-[1.1fr_1.4fr_1.4fr] md:gap-4 md:first:border-t">
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 self-start font-semibold leading-snug text-white hover:underline">{name}<ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" /></a>
          <span className="text-sm leading-relaxed text-white/65">{why}</span>
          <span className="text-sm leading-relaxed text-white/50">{gets}</span>
        </div>
      ))}
    </div>
  );
}

interface Section { id: string; title: string; body: ReactNode }
interface Doc { title: string; tagline: string; summary: { icon: LucideIcon; title: string; text: string }[]; sections: Section[] }

/* ---------- Privacy policy ---------- */
const PRIVACY: Doc = {
  title: 'Privacy policy',
  tagline: 'Mergio runs on your own computer. There is no Mergio account, no Mergio server and nothing to sign up for, so there is very little to say. Here is all of it.',
  summary: [
    { icon: UserX, title: 'No account, no tracking', text: 'Mergio has no sign-up, no analytics and no ads. The developer never sees who uses it.' },
    { icon: HardDrive, title: 'Your data stays with you', text: 'Settings and keys are saved in a file on your computer. Chat and counts are shown live and not saved.' },
    { icon: Unplug, title: 'Direct connections', text: 'Mergio talks straight to YouTube, Twitch, Kick, TikTok and Facebook from your PC. Nothing goes through us.' },
    { icon: Ban, title: 'Nothing sold or shared', text: 'There is no data to sell. Mergio never sends your information to the developer.' },
  ],
  sections: [
    {
      id: 'who', title: 'Who this is from',
      body: <>
        <P>Mergio is a free, open source app created by <A href={CREATOR.url}>{CREATOR.name}</A>, with later contributions from other people. This policy covers the Mergio app and this website. In it, "Mergio", "we" and "us" mean the Mergio project.</P>
        <P>Because all of Mergio's code is public on <A href={REPO}>GitHub</A>, anyone can check that it does what this page says.</P>
      </>,
    },
    {
      id: 'stored', title: 'What the app keeps on your computer',
      body: <>
        <P>Mergio saves a few files in its data folder on your own computer. That's a <Code>data</Code> folder next to the app, or, if that folder can't be written to, a <Code>Mergio</Code> folder in your user settings folder (<Code>%APPDATA%</Code> on Windows, <Code>~/Library/Application Support</Code> on macOS, <Code>~/.config</Code> on Linux).</P>
        <UL>
          <LI><B>Your settings</B> (<Code>config.json</Code>): the channels and pages you add, how the overlay looks, your saved looks, and any keys you choose to enter, such as a Facebook Page token, a TikTok signing key or a YouTube Data API key. Keys are kept in this file on your computer only, and on macOS and Linux only your user account can read it.</LI>
          <LI><B>A log</B> (<Code>mergio.log</Code>): connection messages like "connected" or "reconnecting", to help you fix problems. It isn't sent anywhere.</LI>
          <LI><B>A picture cache</B>: links to viewers' public profile pictures, so they load faster next time.</LI>
          <LI><B>A browser profile</B> (<Code>browser-profile</Code>): used only by the hidden Edge or Chrome window that reads TikTok and Facebook follower counts. It holds that window's cookies and cache, never your own browser's.</LI>
        </UL>
        <P>Chat messages, gifts, alerts, viewer counts and follower counts are kept in memory while Mergio runs and shown on your overlays. They are not saved to disk. Delete the data folder and everything Mergio stored is gone.</P>
        <P>If you press <B>Install the docks in OBS</B>, Mergio adds its three docks (Mergio Chat, Mergio Gifts and Mergio Viewers) to OBS Studio's own settings file (<Code>user.ini</Code>, or <Code>global.ini</Code> in older versions) while OBS is closed. It keeps a copy of that file the first time, named <Code>.mergio-backup</Code>, and leaves any docks you added yourself alone. Nothing else in OBS is changed, and you can remove the docks in OBS at any time.</P>
        <P>If you switch on <B>Read messages aloud</B>, the voice comes from your own computer (Windows speech, <Code>say</Code> on macOS, <Code>espeak-ng</Code> on Linux). It works offline: the audio is made on your PC, kept in memory only while it plays and never sent anywhere.</P>
      </>,
    },
    {
      id: 'connections', title: 'What Mergio connects to',
      body: <>
        <P>To show your chats, Mergio connects directly from your computer to the services below. Nothing passes through a Mergio server, because there isn't one. Like any internet connection, each service sees your IP address and the request, and handles it under its own privacy policy. Mergio never adds anything that identifies you.</P>
        <ServiceTable rows={[
          ['YouTube', 'https://policies.google.com/privacy', 'Reading the public live chat and viewer count of the streams you add, and the subscriber count from the channel page. If you add your own YouTube Data API key, the subscriber count comes from that API instead.', 'The channel or video you watch, and your API key if you add one.'],
          ['Twitch', 'https://www.twitch.tv/p/legal/privacy-notice/', 'Reading public chat as a guest, plus badges, profile pictures and the public follower and viewer counts.', 'The channel you watch and chatters\' usernames.'],
          ['Kick', 'https://kick.com/privacy-policy', 'Reading public chat, gifts, follows and the follower and viewer counts.', 'The channel you watch.'],
          ['TikTok', 'https://www.tiktok.com/legal/privacy-policy', 'Reading the LIVE chat, gifts, likes and viewer count. The follower count is read from the public profile page in a hidden Edge or Chrome window.', 'The TikTok username you watch.'],
          ['Euler Stream', 'https://www.eulerstream.com', 'Signing the TikTok LIVE connection (the community library Mergio uses for TikTok needs this).', 'The TikTok username you watch, and your signing key if you add one.'],
          ['Facebook (Meta)', 'https://www.facebook.com/privacy/policy/', 'Reading comments on your Page\'s live videos and the Page\'s follower count with the Page token you provide. Without a token, the follower count is read from the public Page in a hidden Edge or Chrome window.', 'Your Page token and Page ID.'],
          ['7TV, BetterTTV, FrankerFaceZ', 'https://7tv.app', 'Showing community emotes in Twitch chat (can be turned off).', 'The Twitch channel you watch.'],
          ['decapi.me', 'https://decapi.me', 'A backup way to find a Twitch chatter\'s profile picture.', 'That chatter\'s username.'],
          ['pronouns.alejo.io', 'https://pronouns.alejo.io', 'Showing chatters\' pronouns, only if you turn that on.', 'Twitch chatters\' usernames.'],
          ['Google Fonts', 'https://policies.google.com/privacy', 'Loading the font you pick for the overlay.', 'The font name.'],
          ['GitHub', 'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement', 'Checking for new versions and downloading updates.', 'The version you have.'],
        ]} />
        <P>Follower counts are only looked up for the chats you add, and only while the follower goals overlay or its page is open. Refreshing by hand is rate limited, so Mergio can't flood a platform with requests.</P>
        <P>The overlay and control panel run on a small web server that only listens on your own computer (<Code>127.0.0.1</Code>). Other devices and websites can't reach it, and it refuses requests from other sites.</P>
      </>,
    },
    {
      id: 'facebook', title: 'Facebook data and how to delete it',
      body: <>
        <P>If you connect a Facebook Page, Mergio uses your Page access token only to read comments on that Page's live videos and show them on your overlay. It does not post, like, message or change anything, and it never sends Facebook data to the developer or anyone else.</P>
        <P id="data-deletion">To remove your Facebook data from Mergio:</P>
        <UL>
          <LI>In Mergio, open <B>Settings &gt; Accounts &amp; keys</B> and clear the Facebook Page token, or remove the Facebook chat from <B>Chats</B>.</LI>
          <LI>To remove everything, delete Mergio's data folder (see above) or uninstall Mergio.</LI>
          <LI>To cut off access completely, remove the app under <A href="https://www.facebook.com/settings?tab=business_tools">Facebook Settings &gt; Business integrations</A>, which also makes the token stop working.</LI>
        </UL>
        <P>Comments are never stored, so there is nothing else to delete.</P>
      </>,
    },
    {
      id: 'website', title: 'This website',
      body: <>
        <UL>
          <LI><B>No cookies, analytics or ads.</B> The site doesn't track you.</LI>
          <LI><B>Hosting:</B> the site is hosted by <A href="https://vercel.com/legal/privacy-policy">Vercel</A>, which may keep standard server logs (such as IP address and browser) for security and reliability.</LI>
          <LI><B>Release info:</B> your browser asks GitHub's public API for the latest version and the release notes shown in Dev notes. A copy is kept in your browser's session storage for up to 10 minutes, so it isn't asked again on every visit, and is gone when you close the tab.</LI>
          <LI><B>Fonts:</B> the fonts in the overlay demos come from Google Fonts.</LI>
          <LI><B>Downloads</B> come straight from Mergio's GitHub releases.</LI>
        </UL>
      </>,
    },
    {
      id: 'children', title: 'Children',
      body: <P>Mergio is a tool for streamers and isn't aimed at children under 13. It doesn't knowingly collect anything from anyone, of any age.</P>,
    },
    {
      id: 'changes', title: 'Changes to this policy',
      body: <P>If Mergio starts connecting to something new, this page will be updated and the date at the top will change. New app features are listed in the <A href="/#devnotes">Dev notes</A> and in each release on GitHub.</P>,
    },
    {
      id: 'contact', title: 'Questions',
      body: <P>Ask anything about privacy by <A href={ISSUES}>opening an issue on GitHub</A>.</P>,
    },
  ],
};

/* ---------- Terms of use ---------- */
const TERMS: Doc = {
  title: 'Terms of use',
  tagline: 'Mergio is free and open source. These terms explain what that means for you, in plain words.',
  summary: [
    { icon: Handshake, title: 'Free to use', text: 'Use Mergio on as many streams as you like. No payment, no account.' },
    { icon: Scale, title: 'Open source, with credit', text: 'The code is under the MIT License, with credit to the creator.' },
    { icon: ShieldCheck, title: 'Follow each platform\'s rules', text: 'You are responsible for how you use Mergio and what appears on your stream.' },
    { icon: TriangleAlert, title: 'Provided "as is"', text: 'Mergio comes without a warranty. Platforms can change and break things.' },
  ],
  sections: [
    {
      id: 'agree', title: 'Using Mergio',
      body: <P>These terms apply when you download or use the Mergio app or this website. By using them you accept these terms. If you don't agree, please don't use Mergio. Mergio was created by <A href={CREATOR.url}>{CREATOR.name}</A>. "We" and "us" mean the Mergio project and its contributors.</P>,
    },
    {
      id: 'license', title: 'The license',
      body: <>
        <P>Mergio's code is free and open source under the <A href={LICENSE}>MIT License, with credit to the creator</A>. You can use, copy, change and share it, including in your own projects, as long as you:</P>
        <UL>
          <LI>keep the copyright and license notice, and</LI>
          <LI>clearly credit {CREATOR.name} as the creator of Mergio, in your project's documentation and, if it has one, its about or credits screen. Contributions added later don't replace this credit.</LI>
        </UL>
        <P>The LICENSE file is the full legal text for the code. If these terms and the LICENSE ever disagree about the code, the LICENSE wins.</P>
      </>,
    },
    {
      id: 'free', title: 'Free, with no account',
      body: <P>Mergio costs nothing and has no paid version, account or subscription. Nobody can charge you for the official Mergio. If someone sells it to you, you've been misled.</P>,
    },
    {
      id: 'responsible', title: 'Your responsibilities',
      body: <UL>
        <LI><B>Follow the platforms' rules.</B> Using Mergio doesn't change the terms of YouTube, Twitch, Kick, TikTok, Facebook, OBS or any other service you use. Make sure your use follows them.</LI>
        <LI><B>Use only keys and accounts you're allowed to use,</B> such as a token for a Facebook Page you manage, and keep them private.</LI>
        <LI><B>Your stream is yours.</B> Messages, names and pictures on your overlay come from your viewers and the platforms. Use the platforms' moderation tools and Mergio's filters to keep your stream the way you want it.</LI>
        <LI><B>Don't use Mergio to harm others,</B> for example to collect people's data, spam, or get around a platform's restrictions.</LI>
      </UL>,
    },
    {
      id: 'third-party', title: 'Other services',
      body: <>
        <P>Mergio relies on the platforms and community services listed in the <A href="/privacy#connections">privacy policy</A>. They can change or stop working at any time, which can break a connection until Mergio is updated. Some connections, like TikTok LIVE and YouTube chat, use unofficial methods that the platform could block.</P>
        <P>Mergio isn't made, endorsed or supported by YouTube, Google, Twitch, Kick, TikTok, Meta, OBS or any other platform. Their names and logos belong to their owners and are only used to show what Mergio works with.</P>
      </>,
    },
    {
      id: 'downloads', title: 'Where to get Mergio',
      body: <P>Download Mergio only from its <A href={`${REPO}/releases`}>GitHub releases</A> or this website, and update it from inside the app. Copies from anywhere else could be changed and aren't covered by these terms.</P>,
    },
    {
      id: 'warranty', title: 'No warranty',
      body: <P>Mergio is provided "as is", without any warranty, express or implied, including that it will be error free, always available, or fit for a particular purpose. You use it at your own risk.</P>,
    },
    {
      id: 'liability', title: 'Limitation of liability',
      body: <P>As far as the law allows, the creator and contributors are not liable for any damages or losses that come from using or not being able to use Mergio. That includes missed messages or alerts, interrupted streams, lost data, and anything a platform does to your account.</P>,
    },
    {
      id: 'contributions', title: 'Contributions',
      body: <P>Ideas, bug reports and code are welcome on <A href={REPO}>GitHub</A>. Code you contribute is shared under the same license as Mergio, and the credit to the creator stays in place.</P>,
    },
    {
      id: 'changes', title: 'Changes and ending',
      body: <P>These terms may be updated, and the date at the top will change when they are. You can stop using Mergio at any time by closing and uninstalling it. Sections on the license, warranty and liability still apply to the time you used it.</P>,
    },
    {
      id: 'contact', title: 'Questions',
      body: <P>Ask about these terms by <A href={ISSUES}>opening an issue on GitHub</A>.</P>,
    },
  ],
};

const DOCS: Record<LegalDoc, Doc> = { privacy: PRIVACY, terms: TERMS };

/** Highlights the section that's on screen in the contents list. */
function useActive(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      const seen = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (seen) setActive(seen.target.id);
    }, { rootMargin: '-20% 0px -65% 0px' });
    ids.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

/** The privacy policy or terms of use page. */
export function Legal({ doc }: { doc: LegalDoc }) {
  const d = DOCS[doc];
  const ids = d.sections.map(s => s.id);
  const active = useActive(ids);
  useEffect(() => {
    document.title = `${d.title} · Mergio`;
    if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
  }, [d.title]);

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <header className="sticky top-0 z-30 border-b border-white/[.06] bg-ink/80 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-4">
          <a href="/" aria-label="Mergio home"><Wordmark className="h-7 w-auto sm:h-8" /></a>
          <nav aria-label="Legal pages" className="flex items-center gap-1 rounded-full bg-white/[.06] p-1 ring-1 ring-white/10">
            {(['privacy', 'terms'] as const).map(k => (
              <a key={k} href={`/${k}`} aria-current={k === doc ? 'page' : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${k === doc ? 'bg-white text-black' : 'text-white/65 hover:text-white'}`}>
                {k === 'privacy' ? 'Privacy' : 'Terms'}
              </a>
            ))}
          </nav>
          <a href="/" className="hidden items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white sm:inline-flex"><ArrowLeft className="h-4 w-4" />Back to Mergio</a>
        </div>
      </header>

      <main className="relative flex-1 px-4 pb-20 sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,rgba(124,77,255,.22),transparent_60%)]" />
        <div className="relative mx-auto max-w-[88rem]">
          <div className="max-w-3xl pb-10 pt-14 md:pt-20">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/[.06] px-3 py-1 text-xs font-medium uppercase tracking-[.16em] text-white/55 ring-1 ring-white/10">
              <FileText className="h-3.5 w-3.5" />Legal
            </p>
            <h1 className="text-5xl font-medium leading-[1.02] text-white md:text-6xl" style={{ letterSpacing: '-0.045em' }}>{d.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/65">{d.tagline}</p>
            <p className="mt-5 text-sm text-white/40">Last updated {UPDATED}</p>
          </div>

          <section aria-labelledby="short" className="mb-14 rounded-3xl bg-gradient-to-br from-[#1b1630] to-surface p-5 ring-1 ring-violet/25 sm:p-7">
            <h2 id="short" className="mb-5 text-sm font-medium uppercase tracking-[.16em] text-white/50">The short version</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {d.summary.map(s => (
                <div key={s.title} className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/[.06]">
                  <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet to-pink text-white shadow-[0_8px_24px_-8px_rgba(124,77,255,.8)]"><s.icon className="h-5 w-5" /></span>
                  <p className="font-semibold text-white">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">{s.text}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
            <nav aria-label="Contents" className="hidden lg:block">
              <div className="sticky top-24">
                <p className="mb-3 text-xs font-medium uppercase tracking-[.16em] text-white/40">Contents</p>
                <ol className="grid gap-0.5 border-l border-white/[.08]">
                  {d.sections.map((s, i) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className={`-ml-px flex gap-2.5 border-l-2 py-1.5 pl-4 text-sm transition-colors ${active === s.id ? 'border-violet text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}>
                        <span className="w-4 shrink-0 font-mono text-xs leading-5 text-white/35">{i + 1}</span>{s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>
            <div className="grid max-w-3xl gap-12">
              {d.sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="mb-4 flex items-baseline gap-3 text-2xl font-semibold tracking-tight text-white md:text-[28px]" style={{ letterSpacing: '-0.02em' }}>
                    <span className="font-mono text-base font-medium text-gradient">{String(i + 1).padStart(2, '0')}</span>{s.title}
                  </h2>
                  <div className="grid gap-4">{s.body}</div>
                </section>
              ))}
              <div className="rounded-2xl bg-white/[.04] p-5 text-sm leading-relaxed text-white/55 ring-1 ring-white/[.08]">
                {doc === 'privacy'
                  ? <>See also the <A href="/terms">terms of use</A>. Mergio's code, including every connection listed here, is open on <A href={REPO}>GitHub</A>.</>
                  : <>See also the <A href="/privacy">privacy policy</A> and the full <A href={LICENSE}>LICENSE</A>.</>}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
