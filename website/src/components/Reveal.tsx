import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ElementType, ReactNode } from 'react';

type Variant = 'up' | 'left' | 'right' | 'scale' | 'blur';

/** Plays an entrance animation the first time the element scrolls into view. */
export function Reveal({ as: Tag = 'div', variant = 'up', delay = 0, className = '', style, children }: {
  as?: ElementType; variant?: Variant; delay?: number; className?: string; style?: CSSProperties; children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return (
    <Tag ref={ref} data-reveal={variant} className={`reveal ${shown ? 'is-in' : ''} ${className}`} style={{ '--d': `${delay}ms`, ...style } as CSSProperties}>
      {children}
    </Tag>
  );
}
