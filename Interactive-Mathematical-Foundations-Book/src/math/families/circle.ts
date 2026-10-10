/**
 * The rotating unit vector: sine and cosine as the components of (cos θ, sin θ) (master plan §3.4 radians, §4 I.6).
 *
 * Two modes, kept apart in the state so that "exact" is never inferred from a double that merely looks special:
 *
 *   exact  θ = k·π/12 for an INTEGER k held in state (k = 2 is π/6). sin θ and cos θ come from a small exact table of the
 *          reference angles 0, π/12, π/6, π/4, π/3, 5π/12, π/2 plus quadrant signs: the values are 0, ±1/2, ±√2/2, ±√3/2, ±1 and
 *          ±(√6 ∓ √2)/4, shown with "=".
 *   free   θ is a decimal with at most three places; sin θ and cos θ are doubles, shown with "≈".
 *
 * The drawn point is (cos θ, sin θ) from THIS object (the table's doubles in exact mode), so θ = π/2 sits exactly on the y-axis
 * instead of at (6e-17, 1). Everything below is pure; the view only formats.
 */
import type { Point } from '../../platform/geometry/viewport';

export interface CircleState {
  readonly mode: 'exact' | 'free';
  /** θ = twelfths·π/12 in exact mode (an integer in [−24, 24]); fixed at DEFAULT_TWELFTHS in free mode. */
  readonly twelfths: number;
  /** θ in radians in free mode (a decimal with at most RADIAN_DECIMALS places); fixed at DEFAULT_RADIANS in exact mode. */
  readonly radians: number;
}

export const RADIAN_DECIMALS = 3;
export const TWELFTHS_LIMIT = 24;
/** Largest |θ| in free mode: the largest three-place decimal not exceeding 2π. */
export const RADIANS_LIMIT = 6.283;
export const DEFAULT_TWELFTHS = 2;
export const DEFAULT_RADIANS = 0.524;

export const exactAngle = (twelfths: number): CircleState => {
  if (!Number.isInteger(twelfths) || Math.abs(twelfths) > TWELFTHS_LIMIT) throw new RangeError('twelfths must be an integer in [−24, 24]');
  return { mode: 'exact', twelfths: twelfths + 0, radians: DEFAULT_RADIANS };
};
export const freeAngle = (radians: number): CircleState => {
  if (!Number.isFinite(radians) || Math.abs(radians) > RADIANS_LIMIT || Number(radians.toFixed(RADIAN_DECIMALS)) !== radians) throw new RangeError('radians must be a decimal with at most 3 places and |θ| ≤ 6.283');
  return { mode: 'free', twelfths: DEFAULT_TWELFTHS, radians: radians + 0 };
};
export const CANONICAL_CIRCLE: CircleState = Object.freeze(exactAngle(DEFAULT_TWELFTHS));

// ---------------------------------------------------------------------------------------------- exact values
/** An exact trigonometric value with a printable form and its double. */
export interface TrigForm {
  readonly text: string;
  readonly tex: string;
  readonly spoken: string;
  readonly numeric: number;
  /** false only for the exact value 0 (which has no sign). */
  readonly nonzero: boolean;
  /** `rational` for 0, ±1/2, ±1; `radical` when a square root appears. */
  readonly kind: 'rational' | 'radical';
}
const R2 = Math.sqrt(2);
const R3 = Math.sqrt(3);
const R6 = Math.sqrt(6);

/** sin of the reference angles j·π/12, j = 0…6. cos(j·π/12) = sin((6 − j)·π/12). */
const SIN_REF: readonly TrigForm[] = Object.freeze(([
  { text: '0', tex: '0', spoken: '0', numeric: 0, nonzero: false, kind: 'rational' },
  { text: '(√6−√2)/4', tex: '\\frac{\\sqrt{6}-\\sqrt{2}}{4}', spoken: 'square root of 6 minus square root of 2, over 4', numeric: (R6 - R2) / 4, nonzero: true, kind: 'radical' },
  { text: '1/2', tex: '\\frac{1}{2}', spoken: 'one half', numeric: 0.5, nonzero: true, kind: 'rational' },
  { text: '√2/2', tex: '\\frac{\\sqrt{2}}{2}', spoken: 'square root of 2 over 2', numeric: R2 / 2, nonzero: true, kind: 'radical' },
  { text: '√3/2', tex: '\\frac{\\sqrt{3}}{2}', spoken: 'square root of 3 over 2', numeric: R3 / 2, nonzero: true, kind: 'radical' },
  { text: '(√6+√2)/4', tex: '\\frac{\\sqrt{6}+\\sqrt{2}}{4}', spoken: 'square root of 6 plus square root of 2, over 4', numeric: (R6 + R2) / 4, nonzero: true, kind: 'radical' },
  { text: '1', tex: '1', spoken: '1', numeric: 1, nonzero: true, kind: 'rational' },
] as TrigForm[]).map(f => Object.freeze(f)));

/** sin² of the reference angles (the squares are exact too, and the pair sums to 1). cos²(j·π/12) = sin²((6 − j)·π/12). */
const SQ_REF: readonly TrigForm[] = Object.freeze(([
  { text: '0', tex: '0', spoken: '0', numeric: 0, nonzero: false, kind: 'rational' },
  { text: '(2−√3)/4', tex: '\\frac{2-\\sqrt{3}}{4}', spoken: '2 minus square root of 3, over 4', numeric: (2 - R3) / 4, nonzero: true, kind: 'radical' },
  { text: '1/4', tex: '\\frac{1}{4}', spoken: 'one quarter', numeric: 0.25, nonzero: true, kind: 'rational' },
  { text: '1/2', tex: '\\frac{1}{2}', spoken: 'one half', numeric: 0.5, nonzero: true, kind: 'rational' },
  { text: '3/4', tex: '\\frac{3}{4}', spoken: 'three quarters', numeric: 0.75, nonzero: true, kind: 'rational' },
  { text: '(2+√3)/4', tex: '\\frac{2+\\sqrt{3}}{4}', spoken: '2 plus square root of 3, over 4', numeric: (2 + R3) / 4, nonzero: true, kind: 'radical' },
  { text: '1', tex: '1', spoken: '1', numeric: 1, nonzero: true, kind: 'rational' },
] as TrigForm[]).map(f => Object.freeze(f)));

const signed = (form: TrigForm, negative: boolean): TrigForm =>
  negative && form.nonzero
    ? { text: `−${form.text}`, tex: `-${form.tex}`, spoken: `minus ${form.spoken}`, numeric: -form.numeric, nonzero: true, kind: form.kind }
    : form;

export const mod24 = (k: number): number => ((k % 24) + 24) % 24;

export type Location =
  | { readonly kind: 'axis'; readonly axis: '+x' | '+y' | '−x' | '−y' }
  | { readonly kind: 'quadrant'; readonly quadrant: 'I' | 'II' | 'III' | 'IV' };

export interface Reduction {
  /** k reduced into [0, 24): θ ≡ reduced·π/12 (mod 2π). */
  readonly reduced: number;
  readonly location: Location;
  /** The reference angle is `referenceIndex·π/12`, between 0 and π/2: the acute angle to the nearest part of the x-axis (axes: 0 or π/2). */
  readonly referenceIndex: number;
  readonly cosSign: -1 | 0 | 1;
  readonly sinSign: -1 | 0 | 1;
}

/** Reduce k·π/12 modulo 2π, find its reference angle and the signs of cos and sin from the quadrant. */
export function reduceTwelfths(k: number): Reduction {
  const r = mod24(k);
  let location: Location;
  let ref: number;
  if (r === 0) { location = { kind: 'axis', axis: '+x' }; ref = 0; }
  else if (r === 6) { location = { kind: 'axis', axis: '+y' }; ref = 6; }
  else if (r === 12) { location = { kind: 'axis', axis: '−x' }; ref = 0; }
  else if (r === 18) { location = { kind: 'axis', axis: '−y' }; ref = 6; }
  else if (r < 6) { location = { kind: 'quadrant', quadrant: 'I' }; ref = r; }
  else if (r < 12) { location = { kind: 'quadrant', quadrant: 'II' }; ref = 12 - r; }
  else if (r < 18) { location = { kind: 'quadrant', quadrant: 'III' }; ref = r - 12; }
  else { location = { kind: 'quadrant', quadrant: 'IV' }; ref = 24 - r; }
  const sinSign: -1 | 0 | 1 = r === 0 || r === 12 ? 0 : r < 12 ? 1 : -1;
  const cosSign: -1 | 0 | 1 = r === 6 || r === 18 ? 0 : r < 6 || r > 18 ? 1 : -1;
  return { reduced: r, location, referenceIndex: ref, cosSign, sinSign };
}

/** Exact sin and cos of k·π/12. */
export function exactTrig(k: number): { readonly cos: TrigForm; readonly sin: TrigForm; readonly cos2: TrigForm; readonly sin2: TrigForm; readonly reduction: Reduction } {
  const red = reduceTwelfths(k);
  const j = red.referenceIndex;
  return {
    sin: signed(SIN_REF[j]!, red.sinSign < 0),
    cos: signed(SIN_REF[6 - j]!, red.cosSign < 0),
    sin2: SQ_REF[j]!,
    cos2: SQ_REF[6 - j]!,
    reduction: red,
  };
}

/** The exact value kπ/12 reduced to lowest terms, e.g. 2 → "π/6", −3 → "−π/4", 12 → "π", 0 → "0". */
export interface PiMultiple { readonly text: string; readonly tex: string; readonly spoken: string }
export function piMultiple(k: number): PiMultiple {
  if (!Number.isInteger(k)) throw new RangeError('k must be an integer');
  if (k === 0) return { text: '0', tex: '0', spoken: '0' };
  const g = gcdInt(Math.abs(k), 12);
  const n = Math.abs(k) / g;
  const d = 12 / g;
  const lead = n === 1 ? '' : String(n);
  const neg = k < 0;
  return {
    text: `${neg ? '−' : ''}${lead}π${d === 1 ? '' : `/${d}`}`,
    tex: `${neg ? '-' : ''}${d === 1 ? `${lead}\\pi` : `\\frac{${lead}\\pi}{${d}}`}`,
    spoken: `${neg ? 'minus ' : ''}${n === 1 ? '' : `${n} `}pi${d === 1 ? '' : ` over ${d}`}`,
  };
}
const gcdInt = (a: number, b: number): number => (b === 0 ? a : gcdInt(b, a % b));

/** arcsin(sin kπ/12): the representative in [−π/2, π/2], as twelfths (an integer in [−6, 6]). */
export function arcsinRepresentative(k: number): number {
  const r = mod24(k);
  if (r <= 6) return r;
  if (r <= 18) return 12 - r;
  return r - 24;
}
/** atan2(sin kπ/12, cos kπ/12): the representative in (−π, π], as twelfths (an integer in (−12, 12]). */
export function atan2Representative(k: number): number {
  const r = mod24(k);
  return r <= 12 ? r : r - 24;
}

// ---------------------------------------------------------------------------------------------- derived
export type TrigValue = { readonly kind: 'exact'; readonly form: TrigForm } | { readonly kind: 'numeric'; readonly value: number };
export type AngleResult =
  | { readonly kind: 'exact'; readonly twelfths: number }
  | { readonly kind: 'numeric'; readonly radians: number };

export interface CircleDerived {
  readonly state: CircleState;
  readonly mode: 'exact' | 'free';
  /** θ as a double. */
  readonly radians: number;
  /** θ in degrees: exact (a multiple of 15) in exact mode, a double otherwise. */
  readonly degrees: { readonly exact: boolean; readonly value: number };
  /** θ written as a multiple of π (exact mode only). */
  readonly piMultiple: PiMultiple | null;
  /** (cos θ, sin θ) as drawn. */
  readonly point: Point;
  readonly cos: TrigValue;
  readonly sin: TrigValue;
  readonly cos2: TrigValue;
  readonly sin2: TrigValue;
  /** cos²θ + sin²θ: exactly 1 in exact mode (the table pairs sum to 1); the double sum otherwise. */
  readonly pythagorean: { readonly exact: boolean; readonly value: number };
  readonly location: Location;
  readonly cosSign: -1 | 0 | 1;
  readonly sinSign: -1 | 0 | 1;
  /** The reduced angle in [0, 2π) in exact mode (twelfths) or the reduced double. */
  readonly reduced: AngleResult;
  /** sin(θ + 2π) and cos(θ + 2π): the same exact value in exact mode; doubles otherwise. */
  readonly sinPlusTurn: TrigValue;
  readonly cosPlusTurn: TrigValue;
  readonly arcsinOfSin: AngleResult & { readonly returnsTheta: boolean };
  readonly atan2OfComponents: AngleResult & { readonly returnsTheta: boolean };
  readonly reference: { readonly exact: boolean; readonly index: number | null };
}

const TWO_PI = 2 * Math.PI;
const quadrantOf = (radians: number): Location => {
  const r = ((radians % TWO_PI) + TWO_PI) % TWO_PI;
  if (radians === 0) return { kind: 'axis', axis: '+x' };
  return r < Math.PI / 2 ? { kind: 'quadrant', quadrant: 'I' } : r < Math.PI ? { kind: 'quadrant', quadrant: 'II' } : r < 1.5 * Math.PI ? { kind: 'quadrant', quadrant: 'III' } : { kind: 'quadrant', quadrant: 'IV' };
};
const signOf = (v: number): -1 | 0 | 1 => (v > 0 ? 1 : v < 0 ? -1 : 0);

export function deriveCircle(state: CircleState): CircleDerived {
  if (state.mode === 'exact') {
    const k = state.twelfths;
    const t = exactTrig(k);
    const radians = (k * Math.PI) / 12;
    const ex = (form: TrigForm): TrigValue => ({ kind: 'exact', form });
    return {
      state, mode: 'exact', radians,
      degrees: { exact: true, value: k * 15 + 0 },
      piMultiple: piMultiple(k),
      point: { x: t.cos.numeric + 0, y: t.sin.numeric + 0 },
      cos: ex(t.cos), sin: ex(t.sin), cos2: ex(t.cos2), sin2: ex(t.sin2),
      pythagorean: { exact: true, value: 1 },
      location: t.reduction.location, cosSign: t.reduction.cosSign, sinSign: t.reduction.sinSign,
      reduced: { kind: 'exact', twelfths: t.reduction.reduced },
      sinPlusTurn: ex(t.sin), cosPlusTurn: ex(t.cos),
      arcsinOfSin: { kind: 'exact', twelfths: arcsinRepresentative(k), returnsTheta: Math.abs(k) <= 6 },
      atan2OfComponents: { kind: 'exact', twelfths: atan2Representative(k), returnsTheta: k > -12 && k <= 12 },
      reference: { exact: true, index: t.reduction.referenceIndex },
    };
  }
  const radians = state.radians;
  const c = radians === 0 ? 1 : Math.cos(radians);
  const s = radians === 0 ? 0 : Math.sin(radians);
  const reducedRadians = ((radians % TWO_PI) + TWO_PI) % TWO_PI;
  const num = (value: number): TrigValue => ({ kind: 'numeric', value });
  return {
    state, mode: 'free', radians,
    degrees: { exact: false, value: (radians * 180) / Math.PI },
    piMultiple: null,
    point: { x: c, y: s },
    cos: radians === 0 ? { kind: 'exact', form: SIN_REF[6]! } : num(c),
    sin: radians === 0 ? { kind: 'exact', form: SIN_REF[0]! } : num(s),
    cos2: num(c * c), sin2: num(s * s),
    pythagorean: { exact: false, value: c * c + s * s },
    location: quadrantOf(radians), cosSign: signOf(c), sinSign: signOf(s),
    reduced: { kind: 'numeric', radians: reducedRadians },
    sinPlusTurn: num(Math.sin(radians + TWO_PI)), cosPlusTurn: num(Math.cos(radians + TWO_PI)),
    arcsinOfSin: { kind: 'numeric', radians: Math.asin(s), returnsTheta: Math.abs(radians) <= Math.PI / 2 },
    atan2OfComponents: { kind: 'numeric', radians: Math.atan2(s, c), returnsTheta: radians > -Math.PI && radians <= Math.PI },
    reference: { exact: false, index: null },
  };
}

// ---------------------------------------------------------------------------------------------- input paths
/**
 * The state a pointer at world point `p` asks for. The angle is the direction of p (atan2), taken as the representative nearest to the
 * current angle inside [−2π, 2π], so dragging across the negative x-axis continues smoothly instead of jumping a full turn.
 * Returns `null` when p is the origin (it has no direction).
 */
export function angleTowards(current: CircleState, p: Point, snap: 'exact' | 'free'): CircleState | null {
  if (p.x === 0 && p.y === 0) return null;
  const now = deriveCircle(current).radians;
  const phi = Math.atan2(p.y, p.x);
  let best = phi;
  for (let m = -2; m <= 2; m++) {
    const cand = phi + m * TWO_PI;
    if (Math.abs(cand) <= TWO_PI && Math.abs(cand - now) < Math.abs(best - now)) best = cand;
  }
  if (Math.abs(best) > TWO_PI) best = Math.max(-TWO_PI, Math.min(TWO_PI, best));
  if (snap === 'exact') return exactAngle(Math.max(-TWELFTHS_LIMIT, Math.min(TWELFTHS_LIMIT, Math.round((best * 12) / Math.PI))));
  return freeAngle(Math.max(-RADIANS_LIMIT, Math.min(RADIANS_LIMIT, Number(best.toFixed(RADIAN_DECIMALS)))));
}

/** One keyboard step (direction +1 = counter-clockwise). Exact mode steps by π/12 (coarse: π/2); free mode by 0.01 rad (coarse: 0.05). */
export function stepAngle(state: CircleState, direction: -1 | 1, coarse: boolean): CircleState {
  if (state.mode === 'exact') return exactAngle(Math.max(-TWELFTHS_LIMIT, Math.min(TWELFTHS_LIMIT, state.twelfths + direction * (coarse ? 6 : 1))));
  const moved = state.radians + direction * (coarse ? 0.05 : 0.01);
  return freeAngle(Math.max(-RADIANS_LIMIT, Math.min(RADIANS_LIMIT, Number(moved.toFixed(RADIAN_DECIMALS)))));
}

/**
 * Change mode without moving the point: exact → free keeps the angle (rounded to the three places the free mode allows, clamped to
 * its limit); free → exact snaps to the nearest multiple of π/12.
 */
export function switchMode(state: CircleState, mode: 'exact' | 'free'): CircleState {
  if (state.mode === mode) return state;
  if (mode === 'free') {
    const radians = Number(((state.twelfths * Math.PI) / 12).toFixed(RADIAN_DECIMALS));
    return freeAngle(Math.max(-RADIANS_LIMIT, Math.min(RADIANS_LIMIT, radians)) + 0);
  }
  return exactAngle(Math.max(-TWELFTHS_LIMIT, Math.min(TWELFTHS_LIMIT, Math.round((state.radians * 12) / Math.PI))));
}
