/**
 * Values that flow through a function machine in I.5, and the six small operations a machine is built from.
 *
 * A value is one of
 *   exact      u + v√b with rational u, v and a square-free b (b = 1 means rational): the arithmetic is exact, signs are decided by comparing squares;
 *   approx     a double, used only when an exact form is not attempted (the square root of a number that already contains a radical);
 *   undefined  the machine refused its input (a division by zero, a root of a negative number); the reason is a sentence.
 *
 * An operation either maps a value to a value or turns it into `undefined`; `undefined` stays `undefined` downstream. A rule of the chapter is a
 * short list of operations (`x → subtract 2 → square`), and so is a composite `f ∘ g` (the list of g followed by the list of f).
 */
import { add, div, int, mul, neg, rational, sign, toNumber, ZERO, type Rational } from '../quantity/rational';
import { rootOf } from '../quantity/root';
import { radicalSum, sumEq, sumNeg, sumPlus, sumSign, sumSquare, sumValue, type RadicalSum } from '../algebra/extraneous';

export type Num =
  | { readonly kind: 'exact'; readonly s: RadicalSum; readonly approx: number }
  | { readonly kind: 'approx'; readonly value: number; readonly reason: string }
  | { readonly kind: 'undefined'; readonly reason: string };

export type Op =
  | { readonly op: 'add'; readonly c: Rational }
  | { readonly op: 'mul'; readonly c: Rational }
  | { readonly op: 'square' }
  | { readonly op: 'sqrt' }
  | { readonly op: 'recip' }
  | { readonly op: 'abs' };

export const exactNum = (s: RadicalSum): Num => ({ kind: 'exact', s, approx: sumValue(s) });
export const rationalNum = (r: Rational): Num => exactNum(radicalSum(r, ZERO, 1n));
export const undefinedNum = (reason: string): Num => ({ kind: 'undefined', reason });
export const isDefined = (n: Num): boolean => n.kind !== 'undefined';
/** The value as a double, or `null` when undefined. */
export const numValue = (n: Num): number | null => (n.kind === 'exact' ? n.approx : n.kind === 'approx' ? n.value : null);
/** The value as a rational when it is one. */
export const numRational = (n: Num): Rational | null => (n.kind === 'exact' && n.s.b === 1n ? n.s.u : null);

export const NEGATIVE_ROOT = 'The square root of a negative number is not a real number: no real number squared is negative.';
export const ZERO_RECIP = 'Division by zero is undefined: no number multiplied by 0 gives 1.';

/** Do two values agree exactly? Only exact values are compared exactly; an approximation is compared as a double and never claimed equal. */
export function numEqual(a: Num, b: Num): boolean {
  if (a.kind === 'exact' && b.kind === 'exact') return sumEq(a.s, b.s);
  if (a.kind === 'undefined' && b.kind === 'undefined') return true;
  return false;
}

export function applyOp(op: Op, n: Num): Num {
  if (n.kind === 'undefined') return n;
  switch (op.op) {
    case 'add':
      return n.kind === 'exact' ? exactNum(sumPlus(n.s, op.c)) : { kind: 'approx', value: n.value + toNumber(op.c), reason: n.reason };
    case 'mul':
      return n.kind === 'exact' ? exactNum(radicalSum(mul(n.s.u, op.c), mul(n.s.v, op.c), n.s.b)) : { kind: 'approx', value: n.value * toNumber(op.c), reason: n.reason };
    case 'square':
      return n.kind === 'exact' ? exactNum(sumSquare(n.s)) : { kind: 'approx', value: n.value * n.value, reason: n.reason };
    case 'abs':
      return n.kind === 'exact' ? exactNum(sumSign(n.s) < 0 ? sumNeg(n.s) : n.s) : { kind: 'approx', value: Math.abs(n.value), reason: n.reason };
    case 'recip': {
      if (n.kind === 'approx') return n.value === 0 ? undefinedNum(ZERO_RECIP) : { kind: 'approx', value: 1 / n.value, reason: n.reason };
      const { u, v, b } = n.s;
      if (b === 1n) return sign(u) === 0 ? undefinedNum(ZERO_RECIP) : exactNum(radicalSum(div(int(1), u), ZERO, 1n));
      // 1 / (u + v√b) = (u − v√b) / (u² − v²b); the denominator is rational and non-zero because √b is irrational
      const den = add(mul(u, u), neg(mul(mul(v, v), rational(b))));
      return exactNum(radicalSum(div(u, den), div(neg(v), den), b));
    }
    case 'sqrt': {
      if (n.kind === 'approx') return n.value < 0 ? undefinedNum(NEGATIVE_ROOT) : { kind: 'approx', value: Math.sqrt(n.value), reason: n.reason };
      if (sumSign(n.s) < 0) return undefinedNum(NEGATIVE_ROOT);
      if (n.s.b === 1n) {
        const r = rootOf(n.s.u, 2);
        if (r.kind === 'exact') return exactNum(radicalSum(ZERO, rational(r.root.a, r.root.c), r.root.b));
        if (r.kind === 'numeric') return { kind: 'approx', value: r.approx, reason: r.reason };
        return undefinedNum(r.reason);
      }
      return { kind: 'approx', value: Math.sqrt(n.approx), reason: 'The square root of a number that already contains a radical is shown as a decimal only; its exact form is not attempted here.' };
    }
  }
}

/** One row of a trace: the value before the operation, the operation and the value after it. */
export interface TraceRow { readonly op: Op; readonly before: Num; readonly after: Num }
export interface Evaluation { readonly input: Num; readonly rows: readonly TraceRow[]; readonly output: Num }

/** Run a pipeline on any starting value, keeping every intermediate value. */
export function runOps(ops: readonly Op[], start: Num): Evaluation {
  let current = start;
  const rows: TraceRow[] = [];
  for (const op of ops) {
    const after = applyOp(op, current);
    rows.push({ op, before: current, after });
    current = after;
  }
  return { input: start, rows, output: current };
}
export const evaluate = (ops: readonly Op[], x: Rational): Evaluation => runOps(ops, rationalNum(x));

/** The same machine on doubles, for drawing curves. `null` where the machine refuses the input. */
export function evaluateDouble(ops: readonly Op[], x: number): number | null {
  let v = x;
  for (const op of ops) {
    switch (op.op) {
      case 'add': v += toNumber(op.c); break;
      case 'mul': v *= toNumber(op.c); break;
      case 'square': v *= v; break;
      case 'abs': v = Math.abs(v); break;
      case 'sqrt': if (v < 0) return null; v = Math.sqrt(v); break;
      case 'recip': if (v === 0) return null; v = 1 / v; break;
    }
  }
  return Number.isFinite(v) ? v : null;
}
