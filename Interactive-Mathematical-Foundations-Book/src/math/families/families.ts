/**
 * The comparison model for the essential function families (master plan §4 I.6).
 *
 *   y = a · g(x − h),     g ∈ { x, x², eˣ, ln x, sin x, cos x }
 *
 * State is flat and serializable: six visibility toggles, the vertical scale `a`, the horizontal shift `h`, and the input `x`.
 * `a`, `h` and `x` are decimals with at most TWO places (the controls reject finer input), so the model converts them to exact
 * rationals and computes the shifted input u = x − h EXACTLY (never as the difference of two doubles: 0.3 − 0.1 is not 0.2 in
 * floating point). Consequences:
 *   - x, x² are exact rationals ("="),
 *   - eˣ, sin, cos have an exact value only at u = 0 (every other rational u gives an irrational value), and ln only at u = 1,
 *   - every other finite value is a double, shown with "≈".
 * Where a family is undefined (ln for u ≤ 0) the value is `undefined` with a reason — never −∞ and never NaN.
 *
 * "Facts" (domain, range, zeros, asymptote, monotonicity, symmetry) are model DATA, verified against the sampled function in tests.
 */
import { sampleCurve, type CurveWindow, type Polyline } from '../../platform/geometry/curve';
import { ZERO, add, exactDecimal, exactSqrt, isZero, mul, neg, sign, sub, toNumber, equals, ONE, type Rat } from './rational';

export type FamilyId = 'linear' | 'square' | 'exp' | 'ln' | 'sin' | 'cos';
export const FAMILY_IDS: readonly FamilyId[] = Object.freeze(['linear', 'square', 'exp', 'ln', 'sin', 'cos'] as const);

export interface FamilyMeta {
  readonly id: FamilyId;
  /** Plain-text name, e.g. "x²". */
  readonly name: string;
  /** LaTeX for g, with a placeholder for its argument: `g('x-h')`. */
  readonly g: (arg: string) => string;
  readonly spokenName: string;
}
const META: Record<FamilyId, FamilyMeta> = {
  linear: { id: 'linear', name: 'x', g: arg => arg, spokenName: 'x' },
  square: { id: 'square', name: 'x²', g: arg => `(${arg})^{2}`, spokenName: 'x squared' },
  exp: { id: 'exp', name: 'eˣ', g: arg => `e^{${arg}}`, spokenName: 'e to the x' },
  ln: { id: 'ln', name: 'ln x', g: arg => `\\ln(${arg})`, spokenName: 'natural log of x' },
  sin: { id: 'sin', name: 'sin x', g: arg => `\\sin(${arg})`, spokenName: 'sine of x' },
  cos: { id: 'cos', name: 'cos x', g: arg => `\\cos(${arg})`, spokenName: 'cosine of x' },
};
export const familyMeta = (id: FamilyId): FamilyMeta => META[id];

// ---------------------------------------------------------------------------------------------- state
export interface CompareState {
  readonly linear: boolean;
  readonly square: boolean;
  readonly exp: boolean;
  readonly ln: boolean;
  readonly sin: boolean;
  readonly cos: boolean;
  /** Vertical scale a. */
  readonly a: number;
  /** Horizontal shift h (the graph moves right by h). */
  readonly h: number;
  /** The input x, marked on the x-axis. */
  readonly x: number;
}
export const PARAM_DECIMALS = 2;

export const CANONICAL_COMPARE: CompareState = Object.freeze({ linear: false, square: false, exp: true, ln: true, sin: true, cos: false, a: 1, h: 0, x: 1 });

export const visibleFamilies = (s: CompareState): FamilyId[] => FAMILY_IDS.filter(id => s[id]);

// ---------------------------------------------------------------------------------------------- values
export type FamilyValue =
  /** An exact rational ("="). */
  | { readonly kind: 'exact'; readonly value: Rat }
  /** A finite double, rounded ("≈"). */
  | { readonly kind: 'numeric'; readonly value: number }
  | { readonly kind: 'undefined'; readonly reason: string }
  /** The true value is finite but larger than the largest double: the computer would return ∞. */
  | { readonly kind: 'overflow' };

export const UNDEFINED_LN = 'ln is only defined for positive inputs: here x − h is not positive.';

/**
 * a·eᵘ without a spurious overflow or underflow: when eᵘ alone leaves the double range but the product does not (0.01·e^713), rescale
 * through two half-size exponentials: a·eᵘ = (a·e^(u/2))·e^(u/2), accurate to a few ulps.
 */
function scaledExp(an: number, un: number): number {
  const direct = an * Math.exp(un);
  if (!((direct === 0 || !Number.isFinite(direct)) && an !== 0)) return direct;
  const half = Math.exp(un / 2); // halving u is exact; each factor stays inside the double range when the product does
  return an * half * half;
}

/** The value of a·g(u) for exact a and u. */
export function valueAt(id: FamilyId, a: Rat, u: Rat): FamilyValue {
  const un = toNumber(u);
  const an = toNumber(a);
  const finite = (v: number): FamilyValue => (Number.isFinite(v) ? { kind: 'numeric', value: v + 0 } : { kind: 'overflow' });
  switch (id) {
    case 'linear': return { kind: 'exact', value: mul(a, u) };
    case 'square': return { kind: 'exact', value: mul(a, mul(u, u)) };
    case 'exp': return isZero(u) ? { kind: 'exact', value: a } : isZero(a) ? { kind: 'exact', value: ZERO } : finite(scaledExp(an, un));
    case 'ln':
      if (sign(u) <= 0) return { kind: 'undefined', reason: UNDEFINED_LN };
      return equals(u, ONE) || isZero(a) ? { kind: 'exact', value: ZERO } : finite(an * Math.log(un));
    case 'sin': return isZero(u) || isZero(a) ? { kind: 'exact', value: ZERO } : finite(an * Math.sin(un));
    case 'cos': return isZero(u) ? { kind: 'exact', value: a } : isZero(a) ? { kind: 'exact', value: ZERO } : finite(an * Math.cos(un));
  }
}

/** The number a value stands for (the double nearest to it), or `null` if it is undefined or overflowed. */
export function numberOf(v: FamilyValue): number | null {
  return v.kind === 'exact' ? toNumber(v.value) : v.kind === 'numeric' ? v.value : null;
}

export interface CompareDerived {
  readonly state: CompareState;
  readonly a: Rat;
  readonly h: Rat;
  readonly x: Rat;
  /** u = x − h, exactly. */
  readonly u: Rat;
  readonly visible: readonly FamilyId[];
  readonly values: Readonly<Record<FamilyId, FamilyValue>>;
}

export function deriveCompare(state: CompareState): CompareDerived {
  const a = exactDecimal(state.a, PARAM_DECIMALS);
  const h = exactDecimal(state.h, PARAM_DECIMALS);
  const x = exactDecimal(state.x, PARAM_DECIMALS);
  const u = sub(x, h);
  const values = Object.fromEntries(FAMILY_IDS.map(id => [id, valueAt(id, a, u)])) as Record<FamilyId, FamilyValue>;
  return { state, a, h, x, u, visible: visibleFamilies(state), values };
}

// ---------------------------------------------------------------------------------------------- curves
/** The graph of a·g(x − h) as a function of a double x; `null` where it is undefined. Used only to DRAW (sampled at doubles). */
export function curveFn(id: FamilyId, a: number, h: number): (x: number) => number | null {
  switch (id) {
    case 'linear': return x => a * (x - h);
    case 'square': return x => a * (x - h) * (x - h);
    case 'exp': return x => a * Math.exp(x - h);
    case 'ln': return x => (x - h > 0 ? a * Math.log(x - h) : null);
    case 'sin': return x => a * Math.sin(x - h);
    case 'cos': return x => a * Math.cos(x - h);
  }
}

/**
 * Polylines for one family. Depends ONLY on (family, a, h, window): dragging x never re-samples (the caller memoises on exactly these).
 * Near ln's vertical asymptote the uniform grid would stop visibly short of x = h, so the sampler adds points that approach h geometrically.
 */
export function sampleFamily(id: FamilyId, a: number, h: number, window: CurveWindow, samples = 480): Polyline[] {
  const f = curveFn(id, a, h);
  const lines = sampleCurve(f, window, { samples });
  if (id !== 'ln' || a === 0 || !(h > window.xMin && h < window.xMax) || lines.length === 0) return lines;
  const step = (window.xMax - window.xMin) / samples;
  const clip = 20 * (window.yMax - window.yMin);
  const fine = [];
  for (let i = 30; i >= 1; i--) {
    const x = h + step * 2 ** -i;
    const y = f(x);
    if (y !== null && x > h) fine.push({ x, y: Math.max(-clip, Math.min(clip, y)) });
  }
  const first = lines[0]!;
  return [[...fine, ...first], ...lines.slice(1)];
}

// ---------------------------------------------------------------------------------------------- facts
export type Trend = 'increasing' | 'decreasing' | 'constant';
export interface TrendPiece {
  /** The piece covers u in (fromU, toU), u = x − h. */
  readonly fromU: number;
  readonly toU: number;
  readonly trend: Trend;
}
export type Zeros =
  | { readonly kind: 'none' }
  | { readonly kind: 'everywhere' }
  /** One zero at x = h + offset. */
  | { readonly kind: 'single'; readonly at: Rat; readonly touches: boolean }
  /** Zeros at x = h + offsetHalfPi·(π/2) + k·π for every integer k. */
  | { readonly kind: 'periodic'; readonly offsetHalfPi: 0 | 1 };
export type Asymptote =
  | { readonly kind: 'none' }
  | { readonly kind: 'vertical'; readonly x: Rat }
  | { readonly kind: 'horizontal'; readonly y: Rat; readonly side: 'left' };
export type Symmetry = { readonly kind: 'even' } | { readonly kind: 'odd' } | { readonly kind: 'none' };

export interface FamilyFacts {
  readonly id: FamilyId;
  /** Domain as u = x − h: all reals, or u > 0. */
  readonly domain: 'all' | 'u>0';
  /** The range of a·g, in words with exact bounds. */
  readonly range: { readonly lo: Rat | null; readonly hi: Rat | null; readonly loOpen: boolean; readonly hiOpen: boolean };
  readonly zeros: Zeros;
  readonly asymptote: Asymptote;
  readonly pieces: readonly TrendPiece[];
  readonly symmetry: Symmetry;
  /** Period of a·g in x (2π) or `null`. */
  readonly periodic: boolean;
}

const INF = Number.POSITIVE_INFINITY;

/** Facts for a·g(x − h). With a = 0 every graph is the constant function 0 where it is defined. */
export function factsOf(id: FamilyId, a: Rat, h: Rat): FamilyFacts {
  const s = sign(a);
  const flat = s === 0;
  const flip = (t: Trend): Trend => (flat ? 'constant' : s > 0 ? t : t === 'increasing' ? 'decreasing' : t === 'decreasing' ? 'increasing' : t);
  const range = (lo: Rat | null, hi: Rat | null, loOpen: boolean, hiOpen: boolean) => ({ lo, hi, loOpen, hiOpen });
  const withSign = (positive: ReturnType<typeof range>, negative: ReturnType<typeof range>) => (flat ? range(ZERO, ZERO, false, false) : s > 0 ? positive : negative);
  switch (id) {
    case 'linear':
      return { id, domain: 'all', range: flat ? range(ZERO, ZERO, false, false) : range(null, null, true, true), zeros: flat ? { kind: 'everywhere' } : { kind: 'single', at: h, touches: false },
        asymptote: { kind: 'none' }, pieces: [{ fromU: -INF, toU: INF, trend: flip('increasing') }], symmetry: { kind: 'odd' }, periodic: false };
    case 'square':
      return { id, domain: 'all', range: withSign(range(ZERO, null, false, true), range(null, ZERO, true, false)), zeros: flat ? { kind: 'everywhere' } : { kind: 'single', at: h, touches: true },
        asymptote: { kind: 'none' }, pieces: [{ fromU: -INF, toU: 0, trend: flip('decreasing') }, { fromU: 0, toU: INF, trend: flip('increasing') }], symmetry: { kind: 'even' }, periodic: false };
    case 'exp':
      return { id, domain: 'all', range: withSign(range(ZERO, null, true, true), range(null, ZERO, true, true)), zeros: flat ? { kind: 'everywhere' } : { kind: 'none' },
        asymptote: flat ? { kind: 'none' } : { kind: 'horizontal', y: ZERO, side: 'left' }, pieces: [{ fromU: -INF, toU: INF, trend: flip('increasing') }], symmetry: { kind: 'none' }, periodic: false };
    case 'ln':
      return { id, domain: 'u>0', range: flat ? range(ZERO, ZERO, false, false) : range(null, null, true, true), zeros: flat ? { kind: 'everywhere' } : { kind: 'single', at: add(h, ONE), touches: false },
        asymptote: flat ? { kind: 'none' } : { kind: 'vertical', x: h }, pieces: [{ fromU: 0, toU: INF, trend: flip('increasing') }], symmetry: { kind: 'none' }, periodic: false };
    case 'sin':
    case 'cos': {
      const m = flat ? ZERO : s > 0 ? a : neg(a);
      const sinus = id === 'sin';
      // Within one period (u from −π/2 to 3π/2 for sin; from 0 to 2π for cos) the monotone pieces are quarter/half periods; listed over [−π, π] in u.
      const pieces: TrendPiece[] = sinus
        ? [{ fromU: -Math.PI, toU: -Math.PI / 2, trend: flip('decreasing') }, { fromU: -Math.PI / 2, toU: Math.PI / 2, trend: flip('increasing') }, { fromU: Math.PI / 2, toU: Math.PI, trend: flip('decreasing') }]
        : [{ fromU: -Math.PI, toU: 0, trend: flip('increasing') }, { fromU: 0, toU: Math.PI, trend: flip('decreasing') }];
      return { id, domain: 'all', range: range(neg(m), m, false, false), zeros: flat ? { kind: 'everywhere' } : { kind: 'periodic', offsetHalfPi: sinus ? 0 : 1 },
        asymptote: { kind: 'none' }, pieces: flat ? [{ fromU: -INF, toU: INF, trend: 'constant' }] : pieces, symmetry: { kind: sinus ? 'odd' : 'even' }, periodic: !flat };
    }
  }
}

/** The zeros of a·g(x − h) that lie in [xMin, xMax], as doubles (for drawing markers and for tests). */
export function zerosIn(facts: FamilyFacts, h: Rat, xMin: number, xMax: number): number[] {
  const z = facts.zeros;
  const hn = toNumber(h);
  if (z.kind === 'none' || z.kind === 'everywhere') return [];
  if (z.kind === 'single') { const x = toNumber(z.at); return x >= xMin && x <= xMax ? [x] : []; }
  const out: number[] = [];
  const base = hn + z.offsetHalfPi * (Math.PI / 2);
  const kMin = Math.ceil((xMin - base) / Math.PI);
  const kMax = Math.floor((xMax - base) / Math.PI);
  for (let k = kMin; k <= kMax; k++) out.push(base + k * Math.PI);
  return out;
}

/** Is the family defined at u = x − h? (the only restriction among these six is ln: u > 0). */
export const definedAtU = (id: FamilyId, u: Rat): boolean => id !== 'ln' || sign(u) > 0;

// ---------------------------------------------------------------------------------------------- the line y = x and powers
export type PowerKind = 2 | 3 | 'sqrt';
/** xⁿ for n = 2, 3 (exact) and √x for x ≥ 0 (exact when x is the square of a rational). Used by the "undoing" stage. */
export function powerValue(kind: PowerKind, x: Rat): FamilyValue {
  if (kind === 2) return { kind: 'exact', value: mul(x, x) };
  if (kind === 3) return { kind: 'exact', value: mul(x, mul(x, x)) };
  if (sign(x) < 0) return { kind: 'undefined', reason: 'The real square root is only defined for x ≥ 0.' };
  const r = exactSqrt(x);
  return r ? { kind: 'exact', value: r } : { kind: 'numeric', value: Math.sqrt(toNumber(x)) };
}
