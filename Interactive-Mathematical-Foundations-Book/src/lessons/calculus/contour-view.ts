/** Memoised level curves for the contour-map lessons (III.7, III.8, III.11), keyed on the surface and window: dragging never recomputes them. */
import { contours } from '../../math/calculus/bivariate';
import type { Polyline } from '../../platform/geometry/curve';
import type { WorldWindow } from '../../platform/geometry/viewport';

const contourCache = new Map<string, Polyline[]>();
export function cachedContours(key: string, f: (x: number, y: number) => number, window: WorldWindow, levels: readonly number[], n = 64): Polyline[] {
  const k = `${key}|${window.xMin},${window.xMax},${window.yMin},${window.yMax}|${levels.join(',')}|${n}`;
  let lines = contourCache.get(k);
  if (!lines) { lines = contours(f, window, levels, n); if (contourCache.size > 100) contourCache.clear(); contourCache.set(k, lines); }
  return lines;
}
