/**
 * Inverse pairs and their HONEST domains (master plan §4 I.6).
 *
 *   ln(eˣ) = x        for every real x           e^(ln x) = x      only for x > 0 (ln x does not exist otherwise)
 *   √(x²) = |x|       (= x only for x ≥ 0)       (√x)² = x         only for x ≥ 0
 *
 * `roundTrip` pushes one input through a function and then its inverse, in either order, and reports each intermediate value, the
 * result, whether the input came back, and WHY or why not. Two different things can go wrong and they are kept apart:
 *   - the MATHEMATICS fails (the identity does not hold there: x < 0 under √(x²); an undefined first step), or
 *   - the COMPUTER fails although the mathematics holds (eˣ overflows near x ≈ 709.78 and underflows below ≈ −745.13; in between the
 *     subnormal range keeps only a few significant bits).
 * Exact arithmetic is used where it exists (x² and √ of a perfect square are exact rationals); every other value is a double ("≈").
 * "Returned" for doubles means: within the stated tolerance — never "bit-identical", which differs between engines.
 */
import { sampleCurve, type CurveWindow, type Polyline } from '../../platform/geometry/curve';
import type { Point } from '../../platform/geometry/viewport';
import { ONE, ZERO, exactDecimal, exactSqrt, mul, sign, toNumber, type Rat } from './rational';
import { sampleFamily } from './families';

export type RoundTripFamily = 'exp' | 'square';
export type RoundTripOrder = 'forward-first' | 'inverse-first';
export interface RoundTripState {
  readonly family: RoundTripFamily;
  readonly order: RoundTripOrder;
  readonly x: number;
}
export const CANONICAL_ROUNDTRIP: RoundTripState = Object.freeze({ family: 'exp', order: 'forward-first', x: 1.5 });
export const ROUNDTRIP_DECIMALS = 2;
/** The largest |x| the controls accept: beyond e^709.78 the double e^x overflows, so ±800 shows both ends. */
export const ROUNDTRIP_LIMIT = 800;

/** 2⁻⁵²: the spacing of doubles just above 1. */
export const EPSILON = 2 ** -52;
/** Smallest positive normal double; below it numbers are subnormal and keep fewer significant bits. */
export const MIN_NORMAL = 2.2250738585072014e-308;
/** ln of the largest double (the overflow threshold of e^x) and ln of half the smallest subnormal (below it e^x rounds to 0). */
export const EXP_OVERFLOW_ABOVE = 709.782712893384;
export const EXP_UNDERFLOW_BELOW = -745.1332191019412;

export type StepValue =
  | { readonly kind: 'exact'; readonly value: Rat }
  | { readonly kind: 'numeric'; readonly value: number }
  | { readonly kind: 'undefined'; readonly reason: string }
  /** The true value is finite but exceeds the largest double: the computer returns ∞. */
  | { readonly kind: 'overflow' }
  /** The true value is positive but below the smallest double: the computer returns 0. */
  | { readonly kind: 'underflow' }
  /** The step cannot be carried out because the previous one did not produce a usable number. */
  | { readonly kind: 'lost'; readonly reason: string };

export interface Step {
  /** Plain text, e.g. "e^x" or "ln". */
  readonly name: string;
  readonly tex: string;
  readonly output: StepValue;
}

export type Cause = 'ok' | 'domain' | 'sign-lost' | 'overflow' | 'underflow' | 'subnormal' | 'rounding';

export interface RoundTrip {
  readonly state: RoundTripState;
  readonly x: Rat;
  readonly steps: readonly [Step, Step];
  /** The identity as a mathematical statement, with its honest domain. */
  readonly claim: { readonly text: string; readonly tex: string };
  /** Does the mathematics return x (the second step undoes the first at this x, assuming exact arithmetic)? */
  readonly mathReturns: boolean;
  /** Did the computation return x (exactly for rationals, within `tolerance` for doubles)? `null` when a step is undefined/lost. */
  readonly returned: boolean | null;
  /** Did the final double equal x bit for bit? `null` unless both are doubles. (Engine-dependent for exp/ln, so only displayed as an aside.) */
  readonly identical: boolean | null;
  readonly cause: Cause;
  /** One or two sentences: why it came back or did not. */
  readonly why: string;
  /** The absolute tolerance used for doubles (0 for exact results). */
  readonly tolerance: number;
  /** x and the final double, for the discrepancy readout. */
  readonly error: number | null;
  /** The points (x, first(x)) and (first(x), x) on the graph and its mirror image, when the first step produced a finite double. */
  readonly mirror: { readonly onFirst: Point; readonly reflected: Point } | null;
}

const exactStep = (name: string, tex: string, value: Rat): Step => ({ name, tex, output: { kind: 'exact', value } });
const FORWARD: Record<RoundTripFamily, { name: string; tex: string }> = { exp: { name: 'eˣ', tex: 'e^{x}' }, square: { name: 'x²', tex: 'x^{2}' } };
const INVERSE: Record<RoundTripFamily, { name: string; tex: string }> = { exp: { name: 'ln', tex: '\\ln' }, square: { name: '√', tex: '\\sqrt{\\ }' } };

const CLAIMS: Record<RoundTripFamily, Record<RoundTripOrder, { text: string; tex: string }>> = {
  exp: {
    'forward-first': { text: 'ln(eˣ) = x for every real x.', tex: '\\ln\\left(e^{x}\\right)=x\\quad\\text{for every real }x' },
    'inverse-first': { text: 'e^(ln x) = x only for x > 0 (ln x does not exist for x ≤ 0).', tex: 'e^{\\ln x}=x\\quad\\text{only for }x>0' },
  },
  square: {
    'forward-first': { text: '√(x²) = |x|, which equals x only when x ≥ 0.', tex: '\\sqrt{x^{2}}=\\abs{x}\\quad\\text{(equal to }x\\text{ only when }x\\ge 0)' },
    'inverse-first': { text: '(√x)² = x only for x ≥ 0 (√x does not exist as a real number for x < 0).', tex: '\\left(\\sqrt{x}\\right)^{2}=x\\quad\\text{only for }x\\ge 0' },
  },
};

const NO_LN = 'ln x is undefined for x ≤ 0: no power of e is zero or negative. The computer reports an error or NaN here.';
const NO_SQRT = 'The real square root is undefined for x < 0: no real number squared is negative.';

export function roundTrip(state: RoundTripState): RoundTrip {
  const x = exactDecimal(state.x, ROUNDTRIP_DECIMALS);
  const xn = toNumber(x);
  const fwd = FORWARD[state.family];
  const inv = INVERSE[state.family];
  const claim = CLAIMS[state.family][state.order];
  const base = { state, x, claim };

  if (state.family === 'square') return state.order === 'forward-first' ? squareThenRoot(base, x, xn, fwd, inv) : rootThenSquare(base, x, xn, fwd, inv);
  return state.order === 'forward-first' ? expThenLn(base, x, xn, fwd, inv) : lnThenExp(base, x, xn, fwd, inv);
}

type Base = { state: RoundTripState; x: Rat; claim: { text: string; tex: string } };
type Names = { name: string; tex: string };

function squareThenRoot(base: Base, x: Rat, xn: number, fwd: Names, inv: Names): RoundTrip {
  const squared = mul(x, x);
  const root = exactSqrt(squared)!; // x² is the square of the rational x, so the root exists: it is |x|
  const nonNegative = sign(x) >= 0;
  return {
    ...base,
    steps: [exactStep(fwd.name, fwd.tex, squared), exactStep(inv.name, inv.tex, root)],
    mathReturns: nonNegative,
    returned: nonNegative,
    identical: null,
    cause: nonNegative ? 'ok' : 'sign-lost',
    why: nonNegative
      ? 'x ≥ 0, so √(x²) = |x| = x. Squaring is one-to-one on [0, ∞), so the root can undo it.'
      : 'Squaring maps x and −x to the same number, so the root cannot know which one it started from. It returns the non-negative one: √(x²) = |x|, not x.',
    tolerance: 0,
    error: Math.abs(toNumber(root) - xn),
    mirror: { onFirst: { x: xn, y: toNumber(squared) }, reflected: { x: toNumber(squared), y: xn } },
  };
}

function rootThenSquare(base: Base, x: Rat, xn: number, fwd: Names, inv: Names): RoundTrip {
  if (sign(x) < 0) {
    return {
      ...base,
      steps: [{ name: inv.name, tex: inv.tex, output: { kind: 'undefined', reason: NO_SQRT } }, { name: fwd.name, tex: fwd.tex, output: { kind: 'lost', reason: 'There is no number to square: the first step is undefined.' } }],
      mathReturns: false, returned: null, identical: null, cause: 'domain',
      why: 'x < 0 is outside the domain of the real square root, so the round trip never starts.', tolerance: 0, error: null, mirror: null,
    };
  }
  const exact = exactSqrt(x);
  if (exact) {
    return {
      ...base,
      steps: [exactStep(inv.name, inv.tex, exact), exactStep(fwd.name, fwd.tex, mul(exact, exact))],
      mathReturns: true, returned: true, identical: null, cause: 'ok',
      why: `x is the square of a rational number, so √x is exact and squaring it gives x back exactly.`, tolerance: 0, error: 0,
      mirror: { onFirst: { x: xn, y: toNumber(exact) }, reflected: { x: toNumber(exact), y: xn } },
    };
  }
  const root = Math.sqrt(xn);
  const back = root * root;
  const tolerance = 4 * EPSILON * xn;
  const returned = Math.abs(back - xn) <= tolerance;
  return {
    ...base,
    steps: [{ name: inv.name, tex: inv.tex, output: { kind: 'numeric', value: root } }, { name: fwd.name, tex: fwd.tex, output: { kind: 'numeric', value: back } }],
    mathReturns: true, returned, identical: back === xn, cause: back === xn ? 'ok' : 'rounding',
    why: back === xn
      ? '√x is irrational, so the computer stores a rounded value; squaring it happened to land exactly on x.'
      : '√x is irrational, so the computer stores a rounded value, and squaring that rounded value is off from x in the last digits. Mathematically (√x)² = x exactly.',
    tolerance, error: Math.abs(back - xn),
    mirror: { onFirst: { x: xn, y: root }, reflected: { x: root, y: xn } },
  };
}

function expThenLn(base: Base, x: Rat, xn: number, fwd: Names, inv: Names): RoundTrip {
  const claimHolds = true; // ln(e^x) = x for EVERY real x
  if (sign(x) === 0) {
    return { ...base, steps: [exactStep(fwd.name, fwd.tex, ONE), exactStep(inv.name, inv.tex, ZERO)], mathReturns: claimHolds, returned: true, identical: null, cause: 'ok',
      why: 'e⁰ = 1 and ln 1 = 0, both exactly.', tolerance: 0, error: 0, mirror: { onFirst: { x: 0, y: 1 }, reflected: { x: 1, y: 0 } } };
  }
  const e = Math.exp(xn);
  if (e === Infinity) {
    return { ...base,
      steps: [{ name: fwd.name, tex: fwd.tex, output: { kind: 'overflow' } }, { name: inv.name, tex: inv.tex, output: { kind: 'lost', reason: 'The input to ln is ∞, which carries no information about x.' } }],
      mathReturns: claimHolds, returned: false, identical: null, cause: 'overflow',
      why: `The mathematics is fine (ln(eˣ) = x for every x), but eˣ is larger than the largest double (about 1.8×10³⁰⁸; this happens above x ≈ ${EXP_OVERFLOW_ABOVE.toFixed(2)}). The computer holds ∞, and ln ∞ = ∞ cannot give x back.`,
      tolerance: 0, error: null, mirror: null };
  }
  if (e === 0) {
    return { ...base,
      steps: [{ name: fwd.name, tex: fwd.tex, output: { kind: 'underflow' } }, { name: inv.name, tex: inv.tex, output: { kind: 'undefined', reason: NO_LN } }],
      mathReturns: claimHolds, returned: false, identical: null, cause: 'underflow',
      why: `The mathematics is fine, but eˣ is positive and smaller than the smallest double (this happens below x ≈ ${EXP_UNDERFLOW_BELOW.toFixed(2)}). The computer rounds it to 0, and ln 0 does not exist.`,
      tolerance: 0, error: null, mirror: null };
  }
  const back = Math.log(e);
  const tolerance = 8 * EPSILON * Math.max(1, Math.abs(xn));
  const returned = Math.abs(back - xn) <= tolerance;
  const subnormal = e < MIN_NORMAL;
  return { ...base,
    steps: [{ name: fwd.name, tex: fwd.tex, output: { kind: 'numeric', value: e } }, { name: inv.name, tex: inv.tex, output: { kind: 'numeric', value: back } }],
    mathReturns: claimHolds, returned, identical: back === xn,
    cause: returned ? (back === xn ? 'ok' : 'rounding') : subnormal ? 'subnormal' : 'rounding',
    why: returned
      ? 'ln undoes eˣ for every real x. The computer rounds eˣ once and ln once, so the result matches x to within a few units in the last place, which is all a double can promise.'
      : 'eˣ is so small that it is a subnormal double with only a few significant bits left, so the stored value is a coarse rounding of eˣ and ln of it is visibly off from x.',
    tolerance, error: Math.abs(back - xn),
    mirror: { onFirst: { x: xn, y: e }, reflected: { x: e, y: xn } } };
}

function lnThenExp(base: Base, x: Rat, xn: number, fwd: Names, inv: Names): RoundTrip {
  if (sign(x) <= 0) {
    return { ...base,
      steps: [{ name: inv.name, tex: inv.tex, output: { kind: 'undefined', reason: NO_LN } }, { name: fwd.name, tex: fwd.tex, output: { kind: 'lost', reason: 'There is no number to exponentiate: the first step is undefined.' } }],
      mathReturns: false, returned: null, identical: null, cause: 'domain',
      why: 'x ≤ 0 is outside the domain of ln, so the round trip never starts. The identity e^(ln x) = x holds only for x > 0.', tolerance: 0, error: null, mirror: null };
  }
  if (x.num === x.den) {
    return { ...base, steps: [exactStep(inv.name, inv.tex, ZERO), exactStep(fwd.name, fwd.tex, ONE)], mathReturns: true, returned: true, identical: null, cause: 'ok',
      why: 'ln 1 = 0 and e⁰ = 1, both exactly.', tolerance: 0, error: 0, mirror: { onFirst: { x: 1, y: 0 }, reflected: { x: 0, y: 1 } } };
  }
  const l = Math.log(xn);
  const back = Math.exp(l);
  // The rounding error of ln x (relative 2⁻⁵³) becomes a RELATIVE error of |ln x|·2⁻⁵³ in e^(ln x): the tolerance grows with |ln x|.
  const tolerance = 4 * EPSILON * (1 + Math.abs(l)) * xn;
  const returned = Math.abs(back - xn) <= tolerance;
  return { ...base,
    steps: [{ name: inv.name, tex: inv.tex, output: { kind: 'numeric', value: l } }, { name: fwd.name, tex: fwd.tex, output: { kind: 'numeric', value: back } }],
    mathReturns: true, returned, identical: back === xn, cause: back === xn ? 'ok' : 'rounding',
    why: 'x > 0, so e^(ln x) = x. The computer rounds ln x, and exponentiating multiplies that tiny rounding error by |ln x|, so the result can differ from x in the last digits.',
    tolerance, error: Math.abs(back - xn),
    mirror: { onFirst: { x: xn, y: l }, reflected: { x: l, y: xn } } };
}

// ---------------------------------------------------------------------------------------------- curves of the pair
export interface UndoCurves {
  /** The first function of the pair in the "forward" role: eˣ or x². */
  readonly forward: readonly Polyline[];
  /** Its inverse function: ln x, or the principal root √x (x ≥ 0). */
  readonly inverse: readonly Polyline[];
  /** The mirror image of x² that is NOT a function: the lower branch y = −√x (empty for the exponential). */
  readonly otherBranch: readonly Polyline[];
  /** The line y = x across which the graphs are mirror images. */
  readonly diagonal: readonly [Point, Point];
}

function sampleSqrt(window: CurveWindow, sign: 1 | -1, samples = 480): Polyline[] {
  const f = (x: number) => (x >= 0 ? sign * Math.sqrt(x) : null);
  const lines = sampleCurve(f, window, { samples });
  if (!(window.xMin < 0 && window.xMax > 0) || lines.length === 0) return lines;
  const step = (window.xMax - window.xMin) / samples;
  const fine: Point[] = [];
  for (let i = 30; i >= 1; i--) { const x = step * 2 ** -i; fine.push({ x, y: sign * Math.sqrt(x) }); }
  fine.unshift({ x: 0, y: 0 });
  return [[...fine, ...lines[0]!], ...lines.slice(1)];
}

/** Sample the graphs for the pair. Depends only on (family, window), never on x. */
export function undoCurves(family: RoundTripFamily, window: CurveWindow, samples = 480): UndoCurves {
  const lo = Math.min(window.xMin, window.yMin);
  const hi = Math.max(window.xMax, window.yMax);
  const diagonal: [Point, Point] = [{ x: lo, y: lo }, { x: hi, y: hi }];
  if (family === 'exp') {
    return { forward: sampleCurve(x => Math.exp(x), window, { samples }), inverse: sampleFamily('ln', 1, 0, window, samples), otherBranch: [], diagonal };
  }
  return { forward: sampleCurve(x => x * x, window, { samples }), inverse: sampleSqrt(window, 1, samples), otherBranch: sampleSqrt(window, -1, samples), diagonal };
}

/** Swap x and y in every point: the reflection in the line y = x. */
export const reflectPolylines = (lines: readonly Polyline[]): Polyline[] => lines.map(line => line.map(p => ({ x: p.y, y: p.x })));
