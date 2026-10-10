/**
 * FormulaScroll — a display formula in its own horizontally scrolling region (the same contract as `MathScroll`), re-checked whenever the
 * formula text changes and once the math fonts have loaded.
 *
 * Why not `MathScroll` alone: its observer watches the wrapper and the `.formula` element, whose boxes do not change when KaTeX's webfonts
 * arrive or when `innerHTML` is replaced with a wider formula, so a region that starts to overflow afterwards would stay a non-focusable
 * scroller. This wrapper re-syncs on those two events; the platform helper (`syncScrollable`) does the real work.
 */
import { useEffect, useRef } from 'preact/hooks';
import { syncScrollable, watchScrollable } from '../platform/overflow';
import { Formula } from './Formula';

export function FormulaScroll({ tex, label }: { tex: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const sync = () => {
      syncScrollable(element, label);
      // a sub-pixel overhang (content 187.4px in a box of 187px) rounds to a 1px "scrollable" region that a reader cannot meaningfully scroll
      // and that audit tools nevertheless report: clip it instead of leaving an unlabelled scroller.
      const sliver = element.scrollWidth > element.clientWidth && element.scrollWidth <= element.clientWidth + 1;
      element.style.overflowX = sliver ? 'hidden' : '';
    };
    const stop = watchScrollable(element, label);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);
    observer?.observe(element);
    const frame = requestAnimationFrame(sync);
    let alive = true;
    void document.fonts?.ready.then(() => { if (alive) sync(); });
    sync();
    return () => { alive = false; cancelAnimationFrame(frame); observer?.disconnect(); stop(); };
  }, [tex, label]);
  return <div class="math-scroll" ref={ref}><Formula tex={tex} display /></div>;
}
