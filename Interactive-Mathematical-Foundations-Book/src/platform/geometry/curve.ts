/**
 * Curve sampling for function graphs (shared by I.5 and I.6; master plan §2.5 — extracted because two real chapters need it).
 *
 * `sampleCurve` turns a function of one real variable into polylines in WORLD coordinates. It is deliberately small:
 *  - the function says where it is undefined by returning `null` (or a non-finite number); the curve is BROKEN there, never drawn
 *    through, so `log x` for x ≤ 0 and `1/x` at 0 produce no spurious segments;
 *  - a caller may name exact break abscissae (the poles of tan) — the curve is split at them regardless of the samples;
 *  - values far outside the visible window are clamped to ±`clip` so a steep branch stays a finite, correctly-sloped line (SVG clips it);
 *  - as a defensive heuristic, two consecutive samples on opposite sides of the axis that are BOTH outside the window are treated as a pole
 *    and separated.
 * Sampling depends on the function and the window only. Callers memoise it on the PARAMETERS, not on a moving input, so dragging an input
 * never re-samples the curve.
 */
import type { Point } from './viewport';

export interface CurveWindow { readonly xMin: number; readonly xMax: number; readonly yMin: number; readonly yMax: number }

export interface SampleOptions {
  /** Number of sample intervals across [xMin, xMax]. Default 480. */
  readonly samples?: number;
  /** Abscissae at which the function has a pole or jump; the curve is split there. */
  readonly breaks?: readonly number[];
  /** Clamp |y| to this many window heights beyond the window. Default 20. */
  readonly clipHeights?: number;
}

export type Polyline = readonly Point[];

export function sampleCurve(f: (x: number) => number | null, window: CurveWindow, options: SampleOptions = {}): Polyline[] {
  const n = options.samples ?? 480;
  if (!(Number.isInteger(n) && n >= 2)) throw new RangeError('sampleCurve needs at least 2 intervals');
  const { xMin, xMax, yMin, yMax } = window;
  if (!(xMax > xMin && yMax > yMin)) throw new RangeError('empty window');
  const height = yMax - yMin;
  const clip = (options.clipHeights ?? 20) * height;
  const breaks = [...(options.breaks ?? [])].filter(b => b > xMin && b < xMax).sort((a, b) => a - b);
  const out: Point[][] = [];
  let run: Point[] = [];
  let previous: number | null = null;
  const flush = () => { if (run.length >= 2) out.push(run); run = []; previous = null; };
  let nextBreak = 0;
  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    // split at every exact break lying in (previous sample, this sample]
    while (nextBreak < breaks.length && breaks[nextBreak]! <= x) { if (i > 0) flush(); nextBreak++; }
    const raw = f(x);
    if (raw === null || !Number.isFinite(raw)) { flush(); continue; }
    const y = Math.max(-clip, Math.min(clip, raw));
    const offscreen = (v: number) => v > yMax || v < yMin;
    if (previous !== null && Math.sign(previous) !== Math.sign(y) && previous !== 0 && y !== 0 && offscreen(previous) && offscreen(y)) flush();
    run.push({ x, y });
    previous = y;
  }
  flush();
  return out;
}

/** Where a function is defined on a window, as the fraction of sample points that returned a value (a cheap sanity probe for tests). */
export function definedFraction(f: (x: number) => number | null, xMin: number, xMax: number, n = 200): number {
  let count = 0;
  for (let i = 0; i <= n; i++) { const y = f(xMin + ((xMax - xMin) * i) / n); if (y !== null && Number.isFinite(y)) count++; }
  return count / (n + 1);
}
