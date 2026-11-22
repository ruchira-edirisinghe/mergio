import { GithubIcon, MergioMark, PlatformIcon, PLATFORMS, Wordmark } from '../components/brand';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { readme, REPO } from '../lib/links';
import { Reveal } from '../components/Reveal';
import { DownloadList } from './Steps';

export function DownloadCta() {
  return (
    <section id="download" className="bg-ink px-4 sm:px-6 pb-6 scroll-mt-4">
      <div className="relative max-w-[88rem] mx-auto overflow-hidden rounded-3xl bg-plum px-5 py-14 sm:px-8 md:px-16 md:py-20 ring-1 ring-white/10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#7c4dff]/40 blur-3xl anim-orb" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-[#ff2d8f]/25 blur-3xl anim-orb" style={{ animationDelay: '-8s' }} />
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <Reveal variant="left">
            <div className="relative mb-8 h-24 w-24">
              <span className="absolute inset-0 rounded-[28px] bg-white/10 anim-ring" />
              <div className="relative grid h-24 w-24 place-items-center rounded-[28px] bg-[#13111f] shadow-[0_20px_50px_-10px_rgba(124,77,255,.6)] anim-float">
                <MergioMark className="h-16 w-16" />
              </div>
            </div>
            <h2 className="text-white text-4xl md:text-6xl font-medium leading-[1.05] mb-5" style={{ letterSpacing: '-0.04em' }}>Bring every<br />chat together.</h2>
            <p className="text-white/65 text-base md:text-lg max-w-md mb-8">Free, forever. Download it from GitHub.</p>
            <div className="flex items-center gap-4 text-white/70">
              {PLATFORMS.map(p => <PlatformIcon key={p.id} id={p.id} className="h-6 w-6" aria-label={p.name} />)}
            </div>
          </Reveal>
          <Reveal variant="scale" delay={150} className="glow-border rounded-2xl bg-white/[.06] p-5 ring-1 ring-white/10 backdrop-blur-md">
            <DownloadList />
            <a href={REPO} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-medium text-white hover:bg-white/10 transition-colors">
              <GithubIcon className="h-5 w-5" />Star Mergio on GitHub
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export const CREATOR = { name: 'Ruchira Edirisinghe', url: 'https://ruchiraedirisinghe.vercel.app', photo: '/ruchira.webp' };
const LICENSE = `${REPO}/blob/main/LICENSE`;
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  { title: 'Product', links: [
    { label: 'Features', href: '/#features' },
    { label: 'Download', href: '/#download' },
    { label: 'Dev notes', href: '/#devnotes' },
  ] },
  { title: 'Help', links: [
    { label: 'Setup', href: '/#setup' },
    { label: 'Complete guide', href: readme('complete-guide'), external: true },
    { label: 'FAQ', href: '/#faq' },
    { label: 'Report a problem', href: `${REPO}/issues/new/choose`, external: true },
  ] },
  { title: 'Open source', links: [
    { label: 'Source code', href: REPO, external: true },
    { label: 'All releases', href: `${REPO}/releases`, external: true },
    { label: 'License', href: LICENSE, external: true },
    { label: 'Security policy', href: `${REPO}/security/policy`, external: true },
    { label: 'Privacy policy', href: '/privacy' },
    { label: 'Terms of use', href: '/terms' },
  ] },
];

/** Who made Mergio: a compact row like the GitHub card, with the photo in a spinning gradient ring. Links to the portfolio. */
function CreatorCard() {
  return (
    <a href={CREATOR.url} {...ext} aria-label={`Created by ${CREATOR.name}. Opens the portfolio.`}
      className="group flex items-center justify-between gap-4 rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/[.08] transition-colors hover:bg-white/[.08]">
      <span className="flex min-w-0 items-center gap-3">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center">
          <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#7c4dff,#d63cff,#ff2d8f,#ffb02e,#7c4dff)] anim-spin-slow" />
          <img src={CREATOR.photo} alt="" width={320} height={320} loading="lazy" decoding="async" draggable={false}
            className="relative h-[calc(100%-4px)] w-[calc(100%-4px)] rounded-full object-cover ring-2 ring-ink" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">Created by {CREATOR.name}</span>
          <span className="block text-xs text-white/50">Designed and built Mergio. Visit my portfolio.</span>
        </span>
      </span>
      <ArrowUpRight className="h-5 w-5 shrink-0 text-white/50 transition-transform group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-white" />
    </a>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink px-4 pt-16 sm:px-6 md:pt-20">
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-full max-w-[88rem] -translate-x-1/2 bg-linear-to-r from-transparent via-violet/60 to-transparent" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[60rem] max-w-full -translate-x-1/2 rounded-full bg-violet/15 blur-3xl" />

      <div className="relative mx-auto grid max-w-[88rem] grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-8">
          <div>
            <Wordmark className="h-8 w-auto" />
            <p className="mt-4 max-w-sm text-base text-white/60">Every live chat, one overlay. YouTube, Twitch, Kick, TikTok and Facebook in a single OBS source.</p>
            <div className="mt-5 flex items-center gap-3 text-white/45">
              {PLATFORMS.map(p => <PlatformIcon key={p.id} id={p.id} className="h-5 w-5" aria-label={p.name} />)}
            </div>
          </div>
          <div className="lg:mt-auto"><CreatorCard /></div>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-10 lg:pt-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          {COLUMNS.map(col => (
            <div key={col.title}>
              <p className="mb-4 text-xs font-medium uppercase tracking-[.18em] text-white/40">{col.title}</p>
              <ul className="grid gap-3">
                {col.links.map(l => (
                  <li key={l.label}>
                    <a href={l.href} {...(l.external ? ext : {})} className="group/l inline-flex items-center gap-1 text-[15px] text-white/65 transition-colors hover:text-white">
                      {l.label}
                      {l.external && <ArrowUpRight className="h-3.5 w-3.5 text-white/30 transition-transform group-hover/l:-translate-y-px group-hover/l:translate-x-px group-hover/l:text-white/70" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          </div>
          <a href={REPO} {...ext} className="flex items-center justify-between gap-4 rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/[.08] transition-colors hover:bg-white/[.08] lg:mt-auto">
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-black"><GithubIcon className="h-5 w-5" /></span>
              <span>
                <span className="block text-sm font-semibold text-white">Star Mergio on GitHub</span>
                <span className="block text-xs text-white/50">Free and open source. Ideas and fixes are welcome.</span>
              </span>
            </span>
            <ArrowUpRight className="h-5 w-5 shrink-0 text-white/50" />
          </a>
        </nav>
      </div>

      <div className="relative mx-auto mt-14 flex max-w-[88rem] flex-col gap-4 border-t border-white/[.08] py-6 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} <a href={CREATOR.url} {...ext} className="font-medium text-white/75 underline-offset-4 hover:text-white hover:underline">{CREATOR.name}</a>
          <span className="mx-2 text-white/20">·</span>
          <a href={LICENSE} {...ext} className="underline-offset-4 hover:text-white hover:underline">MIT License, with credit to the creator</a>
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <a href="/privacy" className="underline-offset-4 hover:text-white hover:underline">Privacy</a>
        <a href="/terms" className="underline-offset-4 hover:text-white hover:underline">Terms</a>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white/[.06] px-4 py-2 text-white/70 ring-1 ring-white/10 transition-colors hover:bg-white/[.12] hover:text-white">
          <ArrowUp className="h-4 w-4" />Back to top
        </button>
        </div>
      </div>
      <p className="relative mx-auto max-w-[88rem] pb-4 text-xs text-white/30">
        Stock video from <a className="underline underline-offset-2 hover:text-white/70" href="https://www.pexels.com" {...ext}>Pexels</a> and <a className="underline underline-offset-2 hover:text-white/70" href="https://mixkit.co" {...ext}>Mixkit</a>, portraits from Pexels. Brand logos belong to their owners.
      </p>

      <p aria-hidden="true" className="pointer-events-none relative mx-auto max-w-[88rem] select-none bg-linear-to-b from-white/[.09] to-transparent bg-clip-text text-center font-semibold leading-[.8] text-transparent"
        style={{ fontSize: 'clamp(5rem, 22vw, 20rem)', letterSpacing: '-0.06em', marginBottom: '-0.14em' }}>
        Mergio
      </p>
    </footer>
  );
}
