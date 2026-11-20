import { GithubIcon, MergioMark, PlatformIcon, PLATFORMS, Wordmark } from '../components/brand';
import { readme, RELEASES, REPO } from '../lib/links';
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

export function Footer() {
  return (
    <footer className="bg-ink px-4 sm:px-6 py-10">
      <div className="max-w-[88rem] mx-auto flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex items-center gap-4">
          <Wordmark className="h-7 w-auto" />
          <span className="text-sm text-white/50">Free and open source under the MIT License.</span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
          <a className="hover:text-white" href={RELEASES} target="_blank" rel="noopener noreferrer">Download</a>
          <a className="hover:text-white" href={readme('complete-guide')} target="_blank" rel="noopener noreferrer">Guide</a>
          <a className="hover:text-white" href="#devnotes">Dev notes</a>
          <a className="hover:text-white" href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer">Report a problem</a>
          <a className="hover:text-white inline-flex items-center gap-1.5" href={REPO} target="_blank" rel="noopener noreferrer"><GithubIcon className="h-4 w-4" />GitHub</a>
        </nav>
      </div>
      <p className="max-w-[88rem] mx-auto mt-6 text-xs text-white/35">
        Stock video from <a className="underline underline-offset-2 hover:text-white/70" href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a> and <a className="underline underline-offset-2 hover:text-white/70" href="https://mixkit.co" target="_blank" rel="noopener noreferrer">Mixkit</a>, portraits from Pexels. Brand logos belong to their owners.
      </p>
    </footer>
  );
}
