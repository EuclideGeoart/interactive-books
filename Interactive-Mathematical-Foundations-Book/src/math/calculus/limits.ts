/**
 * Limits and continuity at a point (III.1, III.2). The classification is read from the function's ANALYTIC one-sided limits; the approach
 * table is a sequence of genuine evaluations at x ≠ a and is shown as evidence only. f(a) is evaluated separately and is never replaced by the
 * limit.
 */
import { add, div, eq, int, neg, sub, toNumber, type Rational } from '../quantity/rational';
import type { OneSided, PointValue, Univariate } from './univariate';

export type LimitKind = 'continuous' | 'removable' | 'jump' | 'infinite' | 'oscillation' | 'one-sided' | 'outside';
export interface PointAnalysis {
  readonly value: PointValue;
  readonly left: OneSided;
  readonly right: OneSided;
  /** The two-sided limit when it exists and is finite. */
  readonly limit: { readonly value: number; readonly exact?: Rational } | null;
  readonly kind: LimitKind;
  /** Continuity from each side: the one-sided limit exists, is finite and equals f(a). */
  readonly continuousLeft: boolean;
  readonly continuousRight: boolean;
}
const same = (a: { value: number; exact?: Rational }, b: { value: number; exact?: Rational }) => (a.exact && b.exact ? eq(a.exact, b.exact) : a.value === b.value);
const meets = (side: OneSided, v: PointValue) => side.kind === 'finite' && v.kind === 'value' && same(side, v);

export function analyse(f: Univariate, a: Rational): PointAnalysis {
  const value = f.at(a), left = f.limit(a, 'left'), right = f.limit(a, 'right');
  const continuousLeft = meets(left, value), continuousRight = meets(right, value);
  let kind: LimitKind, limit: PointAnalysis['limit'] = null;
  if (left.kind === 'finite' && right.kind === 'finite') {
    if (same(left, right)) { limit = left; kind = continuousLeft ? 'continuous' : 'removable'; } else kind = 'jump';
  } else if (left.kind === 'infinite' || right.kind === 'infinite') kind = 'infinite';
  else if ((left.kind === 'none' && left.cause === 'oscillation') || (right.kind === 'none' && right.cause === 'oscillation')) kind = 'oscillation';
  else if (left.kind === 'none' && right.kind === 'none') kind = 'outside';
  else kind = 'one-sided';
  return { value, left, right, limit, kind, continuousLeft, continuousRight };
}

export interface ApproachRow { readonly k: number; readonly delta: Rational; readonly left: PointValue; readonly right: PointValue }
/** f(a − δₖ) and f(a + δₖ) for δₖ = δ₀/2ᵏ: genuine evaluations at points different from a. */
export function approach(f: Univariate, a: Rational, delta0: Rational, count: number): ApproachRow[] {
  const rows: ApproachRow[] = [];
  let d = delta0;
  for (let k = 0; k < count; k++) { rows.push({ k, delta: d, left: f.at(sub(a, d)), right: f.at(add(a, d)) }); d = div(d, int(2)); }
  return rows;
}
/** Distance |f(x) − L| between a sample and a finite limit (for the ε-band reading). */
export function gapTo(v: PointValue, limit: { value: number; exact?: Rational } | null): { value: number; exact?: Rational } | null {
  if (!limit || v.kind !== 'value') return null;
  if (v.exact && limit.exact) { const d = sub(v.exact, limit.exact); const ad = d.num < 0n ? neg(d) : d; return { value: toNumber(ad), exact: ad }; }
  return { value: Math.abs(v.value - limit.value) };
}
