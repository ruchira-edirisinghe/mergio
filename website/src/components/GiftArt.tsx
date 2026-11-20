import { useId } from 'react';
import type { GiftId } from '../lib/chat';

/** Gift pictures, drawn from scratch for the demo (the app shows the platform's real gift images). */
export function GiftArt({ gift, className }: { gift: GiftId; className?: string }) {
  const u = useId().replace(/:/g, '');
  const g = (n: string) => `${n}-${u}`;
  switch (gift) {
    case 'rose':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <defs>
            <radialGradient id={g('p')} cx=".45" cy=".35" r=".7"><stop offset="0" stopColor="#ff6b8a" /><stop offset=".6" stopColor="#e8143c" /><stop offset="1" stopColor="#9b0a26" /></radialGradient>
          </defs>
          <path d="M32 34 C31 44 30 52 33 61" stroke="#2fa84f" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M31.5 47 C24 42 19 44 16 48 C22 50 27 50 31.5 47Z" fill="#3cc463" />
          <path d="M32.5 52 C39 46 45 47 48 51 C42 54 37 54 32.5 52Z" fill="#2fa84f" />
          <path d="M18 22 C18 10 28 5 32 5 C36 5 46 10 46 22 C46 32 39 37 32 37 C25 37 18 32 18 22Z" fill={`url(#${g('p')})`} />
          <path d="M24 17 C27 11 37 11 40 17 C37 15 27 15 24 17Z" fill="#ff9db1" opacity=".8" />
          <path d="M22 24 C25 30 39 30 42 24 C40 33 24 33 22 24Z" fill="#c10f33" opacity=".7" />
          <path d="M27 20 C29 17 35 17 37 20 C35 22 29 22 27 20Z" fill="#7d0820" opacity=".55" />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <defs>
            <linearGradient id={g('h')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff8ad1" /><stop offset="1" stopColor="#ff2d6f" /></linearGradient>
          </defs>
          <path d="M32 56 C14 44 6 34 6 22 C6 13 13 7 21 7 C26 7 30 10 32 14 C34 10 38 7 43 7 C51 7 58 13 58 22 C58 34 50 44 32 56Z" fill={`url(#${g('h')})`} />
          <path d="M15 18 C17 13 22 12 25 14" stroke="#fff" strokeOpacity=".7" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M50 6 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z" fill="#fff6a8" />
        </svg>
      );
    case 'doughnut':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <ellipse cx="32" cy="35" rx="26" ry="22" fill="#e0a25c" />
          <path d="M8 31 C9 18 20 11 32 11 C44 11 55 18 56 31 C54 36 50 33 47 37 C44 41 40 36 36 39 C32 42 28 37 24 40 C20 43 16 37 12 38 C9 38 8 35 8 31Z" fill="#ff74b5" />
          <ellipse cx="32" cy="30" rx="8.5" ry="6.5" fill="#7a4a1c" />
          {[[18, 21, '#fff36b', 20], [24, 16, '#6bf3ff', -30], [40, 16, '#8dff8a', 40], [46, 23, '#fff', -10], [17, 30, '#c792ff', 70], [47, 32, '#6bf3ff', 10], [29, 20, '#fff', 80], [37, 39, '#fff36b', -50]].map(([x, y, c, r], i) => (
            <rect key={i} x={Number(x) - 2.5} y={Number(y) - 1} width="5" height="2" rx="1" fill={String(c)} transform={`rotate(${r} ${x} ${y})`} />
          ))}
        </svg>
      );
    case 'galaxy':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <defs>
            <radialGradient id={g('c')} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff" /><stop offset=".18" stopColor="#ffd6ff" /><stop offset=".5" stopColor="#a34dff" /><stop offset="1" stopColor="#2a0a6b" stopOpacity="0" /></radialGradient>
            <linearGradient id={g('a')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6bf3ff" /><stop offset="1" stopColor="#ff5bd8" /></linearGradient>
          </defs>
          <circle cx="32" cy="32" r="29" fill={`url(#${g('c')})`} />
          <g fill="none" stroke={`url(#${g('a')})`} strokeLinecap="round">
            <path d="M32 32 C40 26 50 30 50 38 C50 48 36 54 26 48" strokeWidth="5" />
            <path d="M32 32 C24 38 14 34 14 26 C14 16 28 10 38 16" strokeWidth="5" />
            <path d="M26 48 C18 44 14 38 16 34" strokeWidth="2.5" opacity=".6" />
            <path d="M38 16 C46 20 50 26 48 30" strokeWidth="2.5" opacity=".6" />
          </g>
          <circle cx="32" cy="32" r="5" fill="#fff" />
          {[[10, 12], [54, 14], [52, 52], [12, 50], [44, 8], [6, 34]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 1.2 : 1.8} fill="#fff" opacity=".9" />)}
        </svg>
      );
  }
}
