import { useEffect, useRef, useState } from 'react';
import { readCache, writeCache } from './cache';
import { compareTags } from './releases';

/** True while the element is on (or near) the screen, so animations pause when nobody can see them. */
export function useInView<T extends Element>(rootMargin = '150px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}

export function useInterval(callback: () => void, ms: number | null) {
  const saved = useRef(callback);
  useEffect(() => { saved.current = callback; });
  useEffect(() => {
    if (ms == null) return;
    const id = window.setInterval(() => saved.current(), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Steps through 0..count-1 every `ms` while active. */
export function useCycle(count: number, ms: number, active: boolean) {
  const [i, setI] = useState(0);
  useInterval(() => setI(v => (v + 1) % count), active ? ms : null);
  return [i, setI] as const;
}

export interface FeedEntry<T> { key: number; item: T }

/** Plays a script one item at a time, keeping the newest `max` on screen (like a live chat). */
export function useFeed<T>(script: T[], ms: number, active: boolean, max = 8, prefill = 4) {
  const pos = useRef(prefill % script.length);
  const seq = useRef(prefill);
  const [items, setItems] = useState<FeedEntry<T>[]>(() => script.slice(0, prefill).map((item, key) => ({ key, item })));
  useInterval(() => {
    const item = script[pos.current];
    pos.current = (pos.current + 1) % script.length;
    const key = seq.current++;
    setItems(list => [...list, { key, item }].slice(-max));
  }, active ? ms : null);
  return items;
}

const FALLBACK_VERSION = 'v1.7.0';
/** Never show a version older than the one this page shipped with. */
const newest = (tag: string) => (compareTags(tag, FALLBACK_VERSION) > 0 ? tag : FALLBACK_VERSION);

/** The latest release tag from GitHub (saved for 10 minutes), falling back to the version this page shipped with. */
export function useLatestVersion() {
  const [version, setVersion] = useState(FALLBACK_VERSION);
  useEffect(() => {
    let cancelled = false;
    const cached = readCache<string>('mergio-version');
    if (typeof cached === 'string' && cached) { setVersion(newest(cached)); return; }
    fetch('https://api.github.com/repos/ruchira-edirisinghe/mergio/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (cancelled || !j?.tag_name) return;
        setVersion(newest(String(j.tag_name)));
        writeCache('mergio-version', String(j.tag_name));
      })
      .catch(() => { /* offline: keep the fallback */ });
    return () => { cancelled = true; };
  }, []);
  return version;
}

/** True while the media query matches (false during the first render). */
export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return match;
}
