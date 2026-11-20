/** Profile pictures for the demo viewers: real portraits from Pexels (Pexels License). */
const COUNT = 16;
const ORDER = ['PixelPanda', 'KiraNightfall', 'NovaRider', 'TurboTaco', 'LunaByte', 'ZenMaster99', 'mochi.moon', 'SirChomps', 'EchoVale', 'Rangi'];

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function faceIndex(name: string) {
  const k = ORDER.indexOf(name);
  return k >= 0 ? k : hash(name) % COUNT;
}

export function Face({ name, index, className = '' }: { name: string; index?: number; className?: string }) {
  const n = (index ?? faceIndex(name)) % COUNT;
  return <img src={`/faces/${String(n).padStart(2, '0')}.jpg`} alt="" width={96} height={96} loading="lazy" decoding="async" draggable={false} className={`object-cover ${className}`} />;
}
