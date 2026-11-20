import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

/** The black pill with a white arrow circle (or the white version for dark backgrounds). */
export function PillLink({ href, children, light, size = 'md', external }: { href: string; children: ReactNode; light?: boolean; size?: 'md' | 'lg'; external?: boolean }) {
  const ext = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  return (
    <a href={href} {...ext}
      className={`group inline-flex items-center gap-3 rounded-full font-medium transition-colors duration-200 pl-7 pr-2 py-2 ${size === 'lg' ? 'text-base md:text-lg' : 'text-base'} ${light ? 'bg-white text-black hover:bg-white/85' : 'bg-black text-white hover:bg-gray-800'}`}>
      {children}
      <span className={`rounded-full p-2 transition-transform duration-200 group-hover:translate-x-0.5 ${light ? 'bg-black' : 'bg-white'}`}>
        <ArrowRight className={`h-5 w-5 ${light ? 'text-white' : 'text-black'}`} />
      </span>
    </a>
  );
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-black/60 mb-2 ${className}`}>{children}</p>;
}
