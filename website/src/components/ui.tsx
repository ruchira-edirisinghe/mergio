import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

/** The white pill with a dark arrow circle. */
export function PillLink({ href, children, size = 'md', external }: { href: string; children: ReactNode; size?: 'md' | 'lg'; external?: boolean }) {
  const ext = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  return (
    <a href={href} {...ext}
      className={`group inline-flex items-center gap-3 rounded-full bg-white font-medium text-black transition-colors duration-200 hover:bg-white/85 pl-7 pr-2 py-2 ${size === 'lg' ? 'text-base md:text-lg' : 'text-base'}`}>
      {children}
      <span className="rounded-full bg-black p-2 transition-transform duration-200 group-hover:translate-x-0.5">
        <ArrowRight className="h-5 w-5 text-white" />
      </span>
    </a>
  );
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-white/55 mb-2 ${className}`}>{children}</p>;
}
