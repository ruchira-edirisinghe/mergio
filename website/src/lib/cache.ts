/** A short-lived copy of what GitHub answered, so moving around the page doesn't ask again every time. It expires,
    so a tab that stays open across a release still picks up the new version. */
const MAX_AGE = 10 * 60e3;

export function readCache<T>(key: string): T | null {
  try {
    const c = JSON.parse(sessionStorage.getItem(key) || 'null');
    // older pages stored the bare value without a time: treat that as expired
    if (!c || typeof c !== 'object' || typeof c.at !== 'number' || !('value' in c)) return null;
    return Date.now() - c.at < MAX_AGE ? (c.value as T) : null;
  } catch { return null; /* storage blocked or not JSON */ }
}

export function writeCache(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value })); } catch { /* storage blocked */ }
}
