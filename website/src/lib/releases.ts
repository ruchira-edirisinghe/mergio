import { useEffect, useState } from 'react';
import bundled from './releases.json';

export interface Note { title: string; text: string }
export interface Release { tag: string; date: string; url: string; notes: Note[] }
export type Kind = 'first' | 'feature' | 'update';

const API = 'https://api.github.com/repos/ruchira-edirisinghe/mergio/releases?per_page=50';
const CACHE = 'mergio-releases';
const OVERRIDES = bundled.overrides as Record<string, Note[]>;

/** The "What's new" bullets of a release, as { title, text } with links reduced to their text. */
export function parseNotes(body: string): Note[] {
  const start = body.search(/^#+\s*What.s new\s*$/im);
  if (start < 0) return [];
  let sec = body.slice(start).replace(/^.*\r?\n/, '');
  const end = sec.search(/^#+\s/m);
  if (end >= 0) sec = sec.slice(0, end);
  const out: Note[] = [];
  for (const line of sec.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (!m) continue;
    const t = m[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    const b = t.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    out.push(b ? { title: b[1].replace(/[.:]$/, '').trim(), text: b[2].trim() } : { title: '', text: t });
  }
  return out;
}

/** 1.10.0 > 1.9.2 */
const parts = (tag: string) => tag.replace(/^v/i, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
const byVersion = (a: Release, b: Release) => { const x = parts(a.tag), y = parts(b.tag); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (y[i] || 0) - (x[i] || 0); return 0; };

/** What kind of release this was compared with the one before it. */
export function kindOf(list: Release[], i: number): Kind {
  const prev = list[i + 1];
  if (!prev) return 'first';
  const [a, b] = [parts(list[i].tag), parts(prev.tag)];
  return a[0] !== b[0] || a[1] !== b[1] ? 'feature' : 'update';
}

function fromGitHub(json: unknown): Release[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter(r => r && !r.draft && !r.prerelease && r.tag_name)
    .map(r => ({ tag: String(r.tag_name), date: String(r.published_at || r.created_at), url: String(r.html_url), notes: parseNotes(String(r.body || '')).length ? parseNotes(String(r.body || '')) : OVERRIDES[r.tag_name] || [] }))
    .filter(r => r.notes.length)
    .sort(byVersion);
}

const BUNDLED = (bundled.releases as Release[]).filter(r => r.notes.length).sort(byVersion);

/** Every release with its notes: the copy this page shipped with, replaced by the live list from GitHub. */
export function useReleases() {
  const [list, setList] = useState<Release[]>(BUNDLED);
  useEffect(() => {
    let cancelled = false;
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE) || 'null');
      if (Array.isArray(cached) && cached.length) { setList(cached); return; }
    } catch { /* storage blocked */ }
    fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const live = fromGitHub(j);
        if (cancelled || !live.length) return;
        setList(live);
        try { sessionStorage.setItem(CACHE, JSON.stringify(live)); } catch { /* storage blocked */ }
      })
      .catch(() => { /* offline: keep the copy this page shipped with */ });
    return () => { cancelled = true; };
  }, []);
  return list;
}
