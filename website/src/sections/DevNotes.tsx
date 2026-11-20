import { Fragment, useState, type ReactNode } from 'react';
import { ArrowUpRight, ChevronDown, Rocket, Sparkles, Wrench, type LucideIcon } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { GithubIcon } from '../components/brand';
import { Eyebrow } from '../components/ui';
import { REPO } from '../lib/links';
import { kindOf, useReleases, type Kind, type Release } from '../lib/releases';

const SHOWN = 4;

const KIND: Record<Kind, { label: string; icon: LucideIcon; badge: string }> = {
  first: { label: 'First release', icon: Rocket, badge: 'bg-[#22c55e]/15 text-[#86efac] ring-[#22c55e]/30' },
  feature: { label: 'New features', icon: Sparkles, badge: 'bg-violet/20 text-[#c9b8ff] ring-violet/40' },
  update: { label: 'Update', icon: Wrench, badge: 'bg-white/[.07] text-white/70 ring-white/15' },
};

const anchor = (tag: string) => tag.replace(/\./g, '-');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 30 ? `${days} days ago` : `on ${fmtDate(iso)}`;
}

/** **bold**, *italic* and `code` from the release notes. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/).map((part, k) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={k} className="font-semibold text-white/85">{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={k} className="rounded-md bg-white/[.08] px-1.5 py-0.5 font-mono text-[.85em] text-[#d8ceff]">{part.slice(1, -1)}</code>;
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={k} className="not-italic text-white/80">{part.slice(1, -1)}</em>;
        return <Fragment key={k}>{part}</Fragment>;
      })}
    </>
  );
}

function Entry({ r, kind, latest }: { r: Release; kind: Kind; latest: boolean }) {
  const K = KIND[kind];
  return (
    <>
      <span className={`absolute left-0 top-6 grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-full ring-1 ${latest ? 'bg-gradient-to-br from-violet to-pink text-white ring-white/20 shadow-[0_10px_30px_-8px_rgba(124,77,255,.8)]' : 'bg-surface text-white/70 ring-white/15'}`}>
        {latest && <span className="absolute inset-0 rounded-full bg-violet/40 anim-ring" />}
        <K.icon className="relative h-4 w-4 sm:h-5 sm:w-5" />
      </span>
      <article id={anchor(r.tag)} className={`scroll-mt-6 rounded-3xl p-5 sm:p-7 ring-1 transition-colors duration-300 ${latest ? 'bg-gradient-to-br from-[#1b1630] to-surface ring-violet/30' : 'bg-surface ring-white/[.07] hover:ring-white/15'}`}>
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-white">{r.tag}</h3>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${K.badge}`}>{K.label}</span>
          {latest && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black">
              <span className="h-1.5 w-1.5 rounded-full bg-pink anim-pulse" />Latest
            </span>
          )}
          <time dateTime={r.date} className="ml-auto text-sm text-white/45">{fmtDate(r.date)}</time>
        </header>
        <ul className="mt-5 grid gap-4">
          {r.notes.map((n, k) => (
            <li key={k} className="flex gap-3.5">
              <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-violet to-pink" />
              <p className="text-[15px] leading-relaxed text-white/60">
                {n.title && <strong className="mr-1.5 font-semibold text-white">{n.title}.</strong>}
                <Inline text={n.text} />
              </p>
            </li>
          ))}
        </ul>
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm text-white/45 underline-offset-4 hover:text-white hover:underline">
          Release on GitHub<ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </article>
    </>
  );
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-white/[.04] px-4 py-3 ring-1 ring-white/[.06]">
      <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}

export function DevNotes() {
  const releases = useReleases();
  const [all, setAll] = useState(false);
  if (!releases.length) return null;
  const latest = releases[0];
  const first = releases[releases.length - 1];
  const features = releases.reduce((n, r) => n + r.notes.length, 0);
  const shown = all ? releases : releases.slice(0, SHOWN);
  const hidden = releases.length - shown.length;
  const jump = (tag: string) => {
    if (releases.findIndex(r => r.tag === tag) >= SHOWN) setAll(true);
    requestAnimationFrame(() => document.getElementById(anchor(tag))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <section id="devnotes" className="bg-ink px-4 sm:px-6 pb-20 md:pb-24 scroll-mt-4">
      <div className="mx-auto grid max-w-[88rem] grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-16">
        <Reveal variant="left" className="lg:sticky lg:top-8">
          <Eyebrow>Dev notes</Eyebrow>
          <h2 className="mb-4 text-4xl md:text-5xl font-medium leading-tight" style={{ letterSpacing: '-0.03em' }}>What's new,<br />version by version.</h2>
          <p className="mb-6 max-w-sm text-base text-white/60">Every Mergio release and what it brought. You don't need to check here: Mergio tells you when a new version is out and shows these notes after it updates.</p>
          <div className="rounded-3xl bg-surface p-5 ring-1 ring-white/[.07]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[.16em] text-white/45">Latest version</p>
                <p className="mt-1 font-mono text-3xl font-semibold text-gradient">{latest.tag}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/15 px-3 py-1 text-xs font-semibold text-[#86efac] ring-1 ring-[#22c55e]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] anim-pulse" />Out {ago(latest.date)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat value={releases.length} label="releases" />
              <Stat value={features} label="new features & fixes" />
            </div>
            <p className="mt-4 mb-2 text-xs font-medium uppercase tracking-[.16em] text-white/45">Jump to a version</p>
            <div className="flex flex-wrap gap-1.5">
              {releases.map(r => (
                <button key={r.tag} type="button" onClick={() => jump(r.tag)}
                  className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors ${r === latest ? 'bg-white text-black hover:bg-white/85' : 'bg-white/[.06] text-white/70 ring-1 ring-white/10 hover:bg-white/[.12] hover:text-white'}`}>
                  {r.tag}
                </button>
              ))}
            </div>
            <a href={`${REPO}/releases`} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10">
              <GithubIcon className="h-4 w-4" />All releases on GitHub
            </a>
            <p className="mt-3 text-center text-xs text-white/35">Since {fmtDate(first.date)}</p>
          </div>
        </Reveal>

        <div>
          <ol className="relative grid gap-6 before:absolute before:bottom-6 before:left-[17px] before:top-6 before:w-px before:bg-gradient-to-b before:from-violet/70 before:via-white/10 before:to-transparent sm:before:left-[21px]">
            {shown.map((r, i) => (
              <Reveal as="li" key={r.tag} delay={i < SHOWN ? i * 80 : 0} className="relative pl-12 sm:pl-16">
                <Entry r={r} kind={kindOf(releases, releases.indexOf(r))} latest={r === latest} />
              </Reveal>
            ))}
          </ol>
          {releases.length > SHOWN && (
            <div className="mt-6 pl-12 sm:pl-16">
              <button type="button" onClick={() => setAll(a => !a)} aria-expanded={all}
                className="inline-flex items-center gap-2 rounded-full bg-white/[.06] px-5 py-3 text-sm font-medium text-white ring-1 ring-white/10 transition-colors hover:bg-white/[.12]">
                {all ? 'Show fewer versions' : `Show ${hidden} older version${hidden === 1 ? '' : 's'}`}
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${all ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
