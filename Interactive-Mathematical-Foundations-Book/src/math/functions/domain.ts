/**
 * The domain of a machine, found by working BACKWARDS through its operations.
 *
 * Two operations can refuse an input: the square root wants a number ≥ 0 and the reciprocal wants a number ≠ 0. Starting from "every number",
 * walk the list from the last operation to the first; at each step keep only what the operation accepts (`valid`), then ask which inputs of
 * that step produce an accepted output (`pull`). What is left at the front is the set of inputs the whole machine accepts.
 *
 * The pull-back of a square (x² must land in a given set) has endpoints like √2 in general; the chapter's machines never need that, so
 * `pull` for `square` is exact for the sets that occur (all of ℝ≥0, ℝ>0, {0}, nothing) and throws for any other set instead of guessing.
 */
import { cmp, div, int, mul, neg, sign, sub, ZERO, type Rational } from '../quantity/rational';
import {
  ALL, EMPTY, exceptPoint, intersect, isEmpty, normalise, rayUp, single, type Interval, type IntervalSet,
} from './interval';
import type { Op } from './value';

const NONNEGATIVE: IntervalSet = rayUp(ZERO, true);

/** The part of the line this operation accepts as input. */
export function valid(op: Op): IntervalSet {
  if (op.op === 'sqrt') return NONNEGATIVE;
  if (op.op === 'recip') return exceptPoint(ZERO);
  return ALL;
}

const shiftEnd = (e: Rational | null, f: (r: Rational) => Rational): Rational | null => (e === null ? null : f(e));

/** All t with  op(t) ∈ S  (for t where op is defined). */
export function pull(op: Op, S: IntervalSet): IntervalSet {
  switch (op.op) {
    case 'add':
      return normalise(S.map(i => ({ lo: shiftEnd(i.lo, r => sub(r, op.c)), loClosed: i.loClosed, hi: shiftEnd(i.hi, r => sub(r, op.c)), hiClosed: i.hiClosed })));
    case 'mul': {
      if (sign(op.c) === 0) return S.some(i => containsZero(i)) ? ALL : EMPTY;
      const flip = sign(op.c) < 0;
      return normalise(S.map(i => {
        const lo = shiftEnd(i.lo, r => div(r, op.c));
        const hi = shiftEnd(i.hi, r => div(r, op.c));
        return flip
          ? { lo: hi, loClosed: i.hiClosed, hi: lo, hiClosed: i.loClosed }
          : { lo, loClosed: i.loClosed, hi, hiClosed: i.hiClosed };
      }));
    }
    case 'sqrt': {
      // t ≥ 0 and √t ∈ S  ⇔  t ∈ S⁺ squared end by end
      const plus = intersect(S, NONNEGATIVE);
      return normalise(plus.map(i => ({ lo: shiftEnd(i.lo, sq), loClosed: i.loClosed, hi: shiftEnd(i.hi, sq), hiClosed: i.hiClosed })));
    }
    case 'recip':
      return pullRecip(S);
    case 'abs': {
      const plus = intersect(S, NONNEGATIVE);
      const mirrored: Interval[] = plus.map(i => ({ lo: shiftEnd(i.hi, neg), loClosed: i.hiClosed, hi: shiftEnd(i.lo, neg), hiClosed: i.loClosed }));
      return normalise([...plus, ...mirrored]);
    }
    case 'square': {
      const plus = intersect(S, NONNEGATIVE);
      if (isEmpty(plus)) return EMPTY;
      if (plus.length === 1) {
        const i = plus[0]!;
        if (i.hi === null && i.lo !== null && cmp(i.lo, ZERO) === 0) return i.loClosed ? ALL : exceptPoint(ZERO);
        if (i.lo !== null && i.hi !== null && cmp(i.lo, ZERO) === 0 && cmp(i.hi, ZERO) === 0) return single(ZERO);
      }
      throw new RangeError('The pull-back of a square is only computed exactly for [0, ∞), (0, ∞) and {0}.');
    }
  }
}

const sq = (r: Rational): Rational => mul(r, r);
const containsZero = (i: Interval): boolean =>
  (i.lo === null || sign(i.lo) < 0 || (sign(i.lo) === 0 && i.loClosed)) && (i.hi === null || sign(i.hi) > 0 || (sign(i.hi) === 0 && i.hiClosed));

/** All t ≠ 0 with 1/t ∈ S. Positive and negative parts of S are inverted separately; inversion reverses order inside each part. */
function pullRecip(S: IntervalSet): IntervalSet {
  const out: Interval[] = [];
  for (const i of S) {
    // negative part: i ∩ (−∞, 0)
    const neg_ = intersect([i], [{ lo: null, loClosed: false, hi: ZERO, hiClosed: false }]);
    for (const n of neg_) {
      // 1/t ∈ (lo, hi) with hi ≤ 0 ⇒ t ∈ (1/hi, 1/lo); hi = 0 gives −∞; lo = −∞ gives 0 (open)
      out.push({
        lo: n.hi === null || sign(n.hi) === 0 ? null : div(int(1), n.hi), loClosed: n.hi === null || sign(n.hi) === 0 ? false : n.hiClosed,
        hi: n.lo === null ? ZERO : div(int(1), n.lo), hiClosed: n.lo === null ? false : n.loClosed,
      });
    }
    const pos = intersect([i], [{ lo: ZERO, loClosed: false, hi: null, hiClosed: false }]);
    for (const p of pos) {
      // 1/t ∈ (lo, hi) with lo ≥ 0 ⇒ t ∈ (1/hi, 1/lo); lo = 0 gives +∞; hi = +∞ gives 0 (open)
      out.push({
        lo: p.hi === null ? ZERO : div(int(1), p.hi), loClosed: p.hi === null ? false : p.hiClosed,
        hi: p.lo === null || sign(p.lo) === 0 ? null : div(int(1), p.lo), hiClosed: p.lo === null || sign(p.lo) === 0 ? false : p.loClosed,
      });
    }
  }
  return normalise(out);
}

/** The set of inputs the whole machine accepts. */
export function domainOf(ops: readonly Op[]): IntervalSet {
  let S: IntervalSet = ALL;
  for (let k = ops.length - 1; k >= 0; k--) {
    const op = ops[k]!;
    S = pull(op, intersect(S, valid(op)));
  }
  return S;
}
