import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { watchScrollable } from '../platform/overflow';

/** A horizontally scrollable container for display math that becomes a labelled tab stop only when it overflows. */
export function MathScroll({ children, label }: { children: ComponentChildren; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? watchScrollable(ref.current, label) : undefined), [label]);
  return <div class="math-scroll" ref={ref}>{children}</div>;
}
