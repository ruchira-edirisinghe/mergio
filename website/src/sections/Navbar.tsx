import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { GithubIcon, Wordmark } from '../components/brand';
import { RELEASES, REPO } from '../lib/links';

const LINKS = [
  ['Features', '#features'],
  ['Alerts', '#modes'],
  ['Setup', '#setup'],
  ['FAQ', '#faq'],
  ['Dev notes', '#devnotes'],
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="word-in absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 py-5">
      <div className="flex items-center justify-between">
        <a href="#top" className="flex items-center" aria-label="Mergio home">
          <Wordmark className="h-8 w-auto" />
        </a>
        <div className="hidden md:flex items-center gap-8">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} className="hidden lg:inline text-base text-white/70 hover:text-white font-medium transition-colors duration-200">{label}</a>
          ))}
          <a href={REPO} target="_blank" rel="noopener noreferrer" title="Mergio is free and open source. See the code on GitHub."
            className="glow-border inline-flex items-center gap-2 rounded-full bg-white/[.07] py-2 pl-3 pr-4 text-sm font-semibold text-white ring-1 ring-white/10 backdrop-blur-md transition-colors duration-200 hover:bg-white/[.13]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] anim-pulse" />Free &amp; open source<GithubIcon className="h-4 w-4 text-white/70" />
          </a>
        </div>
        <div className="flex items-center gap-2">
          <a href={RELEASES} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap bg-white text-black text-base font-medium px-5 sm:px-7 py-2.5 rounded-full hover:bg-white/85 transition-colors duration-200">
            Download<span className="hidden sm:inline"> free</span>
          </a>
          <button type="button" className="lg:hidden grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/10" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(o => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden mt-3 rounded-2xl bg-surface/95 p-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl anim-rise">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-base font-medium text-white/85 hover:bg-white/[.06]">{label}</a>
          ))}
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-3 rounded-xl bg-white/[.06] px-4 py-3 text-base font-medium text-white ring-1 ring-white/10 hover:bg-white/[.1]">
            <GithubIcon className="h-[18px] w-[18px]" />
            <span>Free &amp; open source<span className="block text-xs font-normal text-white/55">See the code on GitHub</span></span>
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#22c55e] anim-pulse" />
          </a>
        </div>
      )}
    </nav>
  );
}
