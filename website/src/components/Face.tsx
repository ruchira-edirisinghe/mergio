/** Little illustrated profile pictures, generated from a name so every viewer always gets the same face. */
const SKIN = ['#ffd9b8', '#f1b98c', '#d99a6c', '#a8714a', '#7a4e2f', '#ffe3cc'];
const HAIR = ['#2b1b12', '#5a3420', '#e8c26b', '#c8463c', '#1f1f2e', '#8f6bff', '#ff7ab8', '#f4f0ff'];
const BG = ['#7c4dff', '#ff2d8f', '#2bb8ff', '#22c55e', '#ffb020', '#ff6b6b', '#14b8a6', '#a855f7'];
const SHIRT = ['#ffffff', '#111827', '#fde047', '#38bdf8', '#f472b6', '#4ade80'];

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function Face({ name, className }: { name: string; className?: string }) {
  const h = hash(name);
  const pick = <T,>(a: T[], shift: number) => a[(h >>> shift) % a.length];
  const skin = pick(SKIN, 0), hair = pick(HAIR, 3), bg = pick(BG, 6), shirt = pick(SHIRT, 9);
  const style = (h >>> 12) % 4;
  const glasses = (h >>> 15) % 5 === 0;
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill={bg} />
      {style === 1 && <path d="M8 22 C8 10 32 10 32 22 L33 34 L7 34Z" fill={hair} />}
      <path d="M6 40 C7 31 13 28 20 28 C27 28 33 31 34 40Z" fill={shirt} />
      <rect x="17" y="24" width="6" height="6" rx="2" fill={skin} />
      <circle cx="20" cy="19" r="9" fill={skin} />
      {style === 0 && <path d="M11 18 C11 9 29 9 29 18 C26 14 16 13 11 18Z" fill={hair} />}
      {style === 1 && <path d="M11 19 C11 9 29 9 29 19 C27 13 14 12 11 19Z" fill={hair} />}
      {style === 2 && <><circle cx="20" cy="8.5" r="4" fill={hair} /><path d="M11 18 C11 10 29 10 29 18 C25 13 15 13 11 18Z" fill={hair} /></>}
      {style === 3 && <path d="M11 17 L13 10 L16 13 L19 8 L22 12 L25 8 L27 12 L29 17 C25 13 15 13 11 17Z" fill={hair} />}
      <circle cx="16.6" cy="19.5" r="1.25" fill="#1b1424" />
      <circle cx="23.4" cy="19.5" r="1.25" fill="#1b1424" />
      {glasses && <g fill="none" stroke="#1b1424" strokeWidth="1"><circle cx="16.6" cy="19.5" r="2.6" /><circle cx="23.4" cy="19.5" r="2.6" /><path d="M19.2 19.5 H20.8" /></g>}
      <path d="M17 23 Q20 25.6 23 23" stroke="#1b1424" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <circle cx="14.6" cy="22.4" r="1.3" fill="#ff7a90" opacity=".35" />
      <circle cx="25.4" cy="22.4" r="1.3" fill="#ff7a90" opacity=".35" />
    </svg>
  );
}
