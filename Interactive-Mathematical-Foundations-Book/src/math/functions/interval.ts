/**
 * Exact sets of real numbers made of intervals, for the domains and images of I.5.
 *
 * An interval has rational end points (`null` = unbounded) and each finite end is open or closed. A set is a sorted list of disjoint,
 * non-touching intervals in a normal form, so two sets are equal exactly when their lists are equal. This module lives with the functions
 * chapter on purpose: it is the smallest thing I.5 needs (membership, intersection, a few named constructors), and the later chapter on sets
 * and intervals builds its own, richer version.
 */
import { cmp, eq, type Rational } from '../quantity/rational';

export interface Interval {
  readonly lo: Rational | null;
  readonly loClosed: boolean;
  readonly hi: Rational | null;
  readonly hiClosed: boolean;
}
export type IntervalSet = readonly Interval[];

export const EMPTY: IntervalSet = Object.freeze([]);
export const ALL: IntervalSet = Object.freeze([{ lo: null, loClosed: false, hi: null, hiClosed: false }]);

/** `[a, ∞)` or `(a, ∞)`. */
export const rayUp = (a: Rational, closed: boolean): IntervalSet => Object.freeze([{ lo: a, loClosed: closed, hi: null, hiClosed: false }]);
/** `(−∞, a]` or `(−∞, a)`. */
export const rayDown = (a: Rational, closed: boolean): IntervalSet => Object.freeze([{ lo: null, loClosed: false, hi: a, hiClosed: closed }]);
export const single = (a: Rational): IntervalSet => Object.freeze([{ lo: a, loClosed: true, hi: a, hiClosed: true }]);
/** ℝ without one point: `(−∞, a) ∪ (a, ∞)`. */
export const exceptPoint = (a: Rational): IntervalSet => Object.freeze([
  { lo: null, loClosed: false, hi: a, hiClosed: false },
  { lo: a, loClosed: false, hi: null, hiClosed: false },
]);

/** Is `x` below the lower end (`true`), or does the interval start at or before it? */
const belowLo = (i: Interval, x: Rational): boolean => i.lo !== null && (cmp(x, i.lo) < 0 || (cmp(x, i.lo) === 0 && !i.loClosed));
const aboveHi = (i: Interval, x: Rational): boolean => i.hi !== null && (cmp(x, i.hi) > 0 || (cmp(x, i.hi) === 0 && !i.hiClosed));

export const intervalContains = (i: Interval, x: Rational): boolean => !belowLo(i, x) && !aboveHi(i, x);
export const contains = (set: IntervalSet, x: Rational): boolean => set.some(i => intervalContains(i, x));
export const isEmpty = (set: IntervalSet): boolean => set.length === 0;
export const isAll = (set: IntervalSet): boolean => set.length === 1 && set[0]!.lo === null && set[0]!.hi === null;

const sameEnd = (a: Rational | null, b: Rational | null): boolean => (a === null || b === null ? a === b : eq(a, b));
export const setEquals = (a: IntervalSet, b: IntervalSet): boolean =>
  a.length === b.length && a.every((i, k) => sameEnd(i.lo, b[k]!.lo) && i.loClosed === b[k]!.loClosed && sameEnd(i.hi, b[k]!.hi) && i.hiClosed === b[k]!.hiClosed);

/** The part of two intervals they share, or `null`. */
function meet(a: Interval, b: Interval): Interval | null {
  // lower end: the larger of the two (the open one wins a tie)
  let lo: Rational | null;
  let loClosed: boolean;
  if (a.lo === null) { lo = b.lo; loClosed = b.loClosed; }
  else if (b.lo === null) { lo = a.lo; loClosed = a.loClosed; }
  else { const c = cmp(a.lo, b.lo); lo = c >= 0 ? a.lo : b.lo; loClosed = c > 0 ? a.loClosed : c < 0 ? b.loClosed : a.loClosed && b.loClosed; }
  let hi: Rational | null;
  let hiClosed: boolean;
  if (a.hi === null) { hi = b.hi; hiClosed = b.hiClosed; }
  else if (b.hi === null) { hi = a.hi; hiClosed = a.hiClosed; }
  else { const c = cmp(a.hi, b.hi); hi = c <= 0 ? a.hi : b.hi; hiClosed = c < 0 ? a.hiClosed : c > 0 ? b.hiClosed : a.hiClosed && b.hiClosed; }
  if (lo !== null && hi !== null) {
    const c = cmp(lo, hi);
    if (c > 0 || (c === 0 && !(loClosed && hiClosed))) return null;
  }
  return { lo, loClosed: lo === null ? false : loClosed, hi, hiClosed: hi === null ? false : hiClosed };
}

const startsBefore = (a: Interval, b: Interval): number => {
  if (a.lo === null) return b.lo === null ? 0 : -1;
  if (b.lo === null) return 1;
  const c = cmp(a.lo, b.lo);
  return c !== 0 ? c : a.loClosed === b.loClosed ? 0 : a.loClosed ? -1 : 1;
};

/** Sort, drop empty intervals, merge any two that overlap or touch with at least one closed side. */
export function normalise(items: readonly Interval[]): IntervalSet {
  const sorted = [...items].sort(startsBefore);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && (last.hi === null || (i.lo !== null && (cmp(i.lo, last.hi) < 0 || (cmp(i.lo, last.hi) === 0 && (i.loClosed || last.hiClosed)))) || i.lo === null)) {
      // overlapping or touching: extend the last one if this one reaches further
      let hi = last.hi;
      let hiClosed = last.hiClosed;
      if (last.hi !== null && (i.hi === null || cmp(i.hi, last.hi) > 0 || (cmp(i.hi, last.hi) === 0 && i.hiClosed))) { hi = i.hi; hiClosed = i.hiClosed; }
      out[out.length - 1] = { lo: last.lo, loClosed: last.loClosed, hi, hiClosed };
    } else out.push(i);
  }
  return Object.freeze(out);
}

export function intersect(a: IntervalSet, b: IntervalSet): IntervalSet {
  const parts: Interval[] = [];
  for (const i of a) for (const j of b) { const m = meet(i, j); if (m) parts.push(m); }
  return normalise(parts);
}
