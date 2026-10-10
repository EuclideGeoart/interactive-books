/**
 * Equation overflow (master plan §8.4): wide display math scrolls inside its own region — never the page,
 * never shrink-to-fit. A region that actually overflows must be keyboard-reachable and named; one that fits
 * must NOT be a tab stop (tabindex -1). This helper keeps the two states in sync.
 */
export function syncScrollable(element: HTMLElement, label = 'Equation, scrollable'): void {
  const overflows = element.scrollWidth > element.clientWidth + 1;
  if (overflows) {
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'region');
    element.setAttribute('aria-label', label);
  } else {
    // tabindex="-1" opts out of Chrome's built-in "keyboard-focusable scroller" behaviour, which would otherwise make
    // any overflow:auto box (even one with only sub-pixel overhang) an unlabelled tab stop.
    element.setAttribute('tabindex', '-1');
    element.removeAttribute('role');
    element.removeAttribute('aria-label');
  }
}

/** Keep `element` in sync as it (or its content) resizes. Returns a cleanup function. */
export function watchScrollable(element: HTMLElement, label?: string): () => void {
  const update = () => syncScrollable(element, label);
  update();
  if (typeof ResizeObserver === 'undefined') return () => {};
  const observer = new ResizeObserver(update);
  observer.observe(element);
  for (const child of Array.from(element.children)) observer.observe(child);
  return () => observer.disconnect();
}

/**
 * Scrollable regions become landmarks (role=region) while they overflow, and landmarks with the same role must
 * have distinct names. Number repeated labels: "Table 1, scrollable", "Table 2, scrollable"…
 */
export function labelDuplicates(elements: readonly HTMLElement[], fallback: string): Map<HTMLElement, string> {
  const labels = elements.map(el => el.dataset.scrollable || fallback);
  const totals = new Map<string, number>();
  for (const l of labels) totals.set(l, (totals.get(l) ?? 0) + 1);
  const seen = new Map<string, number>();
  const out = new Map<HTMLElement, string>();
  elements.forEach((el, i) => {
    const base = labels[i]!;
    if ((totals.get(base) ?? 0) < 2) { out.set(el, base); return; }
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.set(el, base.replace(/,/, ` ${n},`));
  });
  return out;
}
