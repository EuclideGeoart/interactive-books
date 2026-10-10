/**
 * The six rules of I.5 and what the chapter asks about each one: its pipeline, domain, image, injectivity, and the inputs that give a chosen
 * output (preimages).
 *
 *   id       rule              pipeline                              domain       image
 *   line     a·x               multiply by a                         ℝ            ℝ  (a ≠ 0)   {0}  (a = 0)
 *   stretch  a·x²              square, multiply by a                 ℝ            [0,∞) (a>0)  (−∞,0] (a<0)  {0} (a=0)
 *   shift    (x − a)²          subtract a, square                    ℝ            [0,∞)
 *   root     √(x + a)          add a, square root                    [−a, ∞)      [0,∞)
 *   pole     1/(x − a)         subtract a, reciprocal                ℝ ∖ {a}      ℝ ∖ {0}
 *   abs      |x − a|           subtract a, absolute value             ℝ            [0,∞)
 *
 * The domain is COMPUTED by `domainOf` (working backwards through the pipeline). The image and the injectivity are stated here by hand and
 * checked against brute force by the oracle and by the unit tests; they are the claims a reader is asked to believe, so they have witnesses
 * (`preimages`) rather than only a table.
 */
import { add, div, fromDecimal, int, mul, neg, rational, sign, ZERO, type Rational } from '../quantity/rational';
import { rootOf } from '../quantity/root';
import { radicalSum, type RadicalSum } from '../algebra/extraneous';
import { domainOf } from './domain';
import { ALL, exceptPoint, rayDown, rayUp, single, contains, type IntervalSet } from './interval';
import { evaluate, evaluateDouble, numEqual, applyOp, exactNum, rationalNum, type Evaluation, type Num, type Op } from './value';

export type RuleId = 'line' | 'stretch' | 'shift' | 'root' | 'pole' | 'abs';
export const RULE_IDS: readonly RuleId[] = Object.freeze(['line', 'stretch', 'shift', 'root', 'pole', 'abs']);
export const A_LIMIT = 5;
export const X_LIMIT = 6;

export interface FunctionState {
  readonly rule: RuleId;
  /** An integer in [−5, 5]: the multiplier (line, stretch) or the shift (the other four rules). */
  readonly a: number;
  /** A decimal with at most 2 places in [−6, 6]. */
  readonly x: number;
}

/** The pipeline of a rule as a list of operations. An `add 0` is left out: it does nothing, so the pipeline says nothing about it. */
export function opsOf(rule: RuleId, a: number): readonly Op[] {
  const A = int(a);
  const ops: Op[] = (() => {
    switch (rule) {
      case 'line': return [{ op: 'mul', c: A }];
      case 'stretch': return [{ op: 'square' }, { op: 'mul', c: A }];
      case 'shift': return [{ op: 'add', c: neg(A) }, { op: 'square' }];
      case 'root': return [{ op: 'add', c: A }, { op: 'sqrt' }];
      case 'pole': return [{ op: 'add', c: neg(A) }, { op: 'recip' }];
      case 'abs': return [{ op: 'add', c: neg(A) }, { op: 'abs' }];
    }
  })();
  return Object.freeze(ops.filter(o => !(o.op === 'add' && sign(o.c) === 0)));
}

export const domainOfRule = (rule: RuleId, a: number): IntervalSet => domainOf(opsOf(rule, a));

export function imageOfRule(rule: RuleId, a: number): IntervalSet {
  switch (rule) {
    case 'line': return a === 0 ? single(ZERO) : ALL;
    case 'stretch': return a === 0 ? single(ZERO) : a > 0 ? rayUp(ZERO, true) : rayDown(ZERO, true);
    case 'shift': case 'abs': case 'root': return rayUp(ZERO, true);
    case 'pole': return exceptPoint(ZERO);
  }
}

/** One-to-one: different inputs always give different outputs. */
export function isInjective(rule: RuleId, a: number): boolean {
  switch (rule) {
    case 'line': return a !== 0;
    case 'root': case 'pole': return true;
    default: return false;
  }
}
/** Onto the real numbers: the image is all of ℝ. */
export const isOntoReals = (rule: RuleId, a: number): boolean => rule === 'line' && a !== 0;

export function rulesDouble(rule: RuleId, a: number): (x: number) => number | null {
  const ops = opsOf(rule, a);
  return x => evaluateDouble(ops, x);
}
/** The abscissa where the curve is broken (the pole), if any. */
export const breaksOf = (rule: RuleId, a: number): readonly number[] => (rule === 'pole' ? [a] : []);

// ------------------------------------------------------------------------------------------------ one input
export interface FunctionDerived {
  readonly state: FunctionState;
  readonly xRational: Rational;
  readonly ops: readonly Op[];
  readonly evaluation: Evaluation;
  readonly output: Num;
  readonly domain: IntervalSet;
  readonly image: IntervalSet;
  readonly inDomain: boolean;
  readonly injective: boolean;
  readonly onto: boolean;
}

/** A decimal typed with at most two places, as an exact rational. */
export function rationalFromNumber(v: number): Rational {
  const r = fromDecimal(v, 2);
  if (!r) throw new RangeError('x must be a number with at most two decimal places');
  return r;
}

export function deriveFunction(state: FunctionState): FunctionDerived {
  const xRational = rationalFromNumber(state.x);
  const ops = opsOf(state.rule, state.a);
  const evaluation = evaluate(ops, xRational);
  const domain = domainOfRule(state.rule, state.a);
  return {
    state, xRational, ops, evaluation, output: evaluation.output, domain, image: imageOfRule(state.rule, state.a),
    inDomain: contains(domain, xRational), injective: isInjective(state.rule, state.a), onto: isOntoReals(state.rule, state.a),
  };
}

// ------------------------------------------------------------------------------------------------ preimages
export type Preimage =
  | { readonly kind: 'none' }
  | { readonly kind: 'points'; readonly xs: readonly RadicalSum[] }
  | { readonly kind: 'all' };

const pt = (r: Rational): RadicalSum => radicalSum(r, ZERO, 1n);
/** a ± √t for a rational t > 0, as two sums in increasing order. */
function aroundRoot(center: Rational, t: Rational): readonly RadicalSum[] {
  const r = rootOf(t, 2);
  if (r.kind !== 'exact') throw new RangeError('preimage radicand out of the exact range');
  const v = rational(r.root.a, r.root.c);
  return [radicalSum(center, neg(v), r.root.b), radicalSum(center, v, r.root.b)];
}

/** Every input x with  f(x) = h  — exactly. `h` is a rational. */
export function preimages(rule: RuleId, a: number, h: Rational): Preimage {
  const A = int(a);
  const s = sign(h);
  switch (rule) {
    case 'line':
      if (a === 0) return s === 0 ? { kind: 'all' } : { kind: 'none' };
      return { kind: 'points', xs: [pt(div(h, A))] };
    case 'stretch': {
      if (a === 0) return s === 0 ? { kind: 'all' } : { kind: 'none' };
      const t = div(h, A);
      if (sign(t) < 0) return { kind: 'none' };
      if (sign(t) === 0) return { kind: 'points', xs: [pt(ZERO)] };
      return { kind: 'points', xs: aroundRoot(ZERO, t) };
    }
    case 'shift':
      if (s < 0) return { kind: 'none' };
      if (s === 0) return { kind: 'points', xs: [pt(A)] };
      return { kind: 'points', xs: aroundRoot(A, h) };
    case 'abs':
      if (s < 0) return { kind: 'none' };
      if (s === 0) return { kind: 'points', xs: [pt(A)] };
      return { kind: 'points', xs: [pt(add(A, neg(h))), pt(add(A, h))] };
    case 'root':
      return s < 0 ? { kind: 'none' } : { kind: 'points', xs: [pt(add(mul(h, h), neg(A)))] };
    case 'pole':
      return s === 0 ? { kind: 'none' } : { kind: 'points', xs: [pt(add(A, div(int(1), h)))] };
  }
}

/** Apply the pipeline to an exact input and report whether it gives h exactly — the check that a claimed preimage point really maps to h. */
export function mapsTo(rule: RuleId, a: number, x: RadicalSum, h: Rational): boolean {
  let n: Num = exactNum(x);
  for (const op of opsOf(rule, a)) n = applyOp(op, n);
  return numEqual(n, rationalNum(h));
}

export const preimageCount = (p: Preimage): number | 'all' => (p.kind === 'none' ? 0 : p.kind === 'all' ? 'all' : p.xs.length);

// ------------------------------------------------------------------------------------------------ one height
export interface HeightState {
  readonly rule: RuleId;
  readonly a: number;
  /** A decimal with at most 2 places in [−6, 6]: the height of the horizontal line y = h. */
  readonly h: number;
}
export interface HeightDerived {
  readonly state: HeightState;
  readonly hRational: Rational;
  readonly domain: IntervalSet;
  readonly image: IntervalSet;
  readonly preimage: Preimage;
  readonly count: number | 'all';
  /** h is an output of the machine: some input gives it. */
  readonly inImage: boolean;
  readonly injective: boolean;
  readonly onto: boolean;
}
export function deriveHeight(state: HeightState): HeightDerived {
  const hRational = rationalFromNumber(state.h);
  const preimage = preimages(state.rule, state.a, hRational);
  const image = imageOfRule(state.rule, state.a);
  return {
    state, hRational, domain: domainOfRule(state.rule, state.a), image, preimage, count: preimageCount(preimage),
    inImage: contains(image, hRational), injective: isInjective(state.rule, state.a), onto: isOntoReals(state.rule, state.a),
  };
}

