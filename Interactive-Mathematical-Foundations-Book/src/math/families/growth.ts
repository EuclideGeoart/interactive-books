/**
 * Exponentials and logarithms with a chosen base b > 0 (master plan §4 I.6; §3.5: `log` is the natural log, bits use log₂ explicitly).
 *
 *   growth  b > 1: b^x increases, doubles every  log_b 2 = ln 2 / ln b  units of x
 *   decay   0 < b < 1: b^x decreases, halves every  −log_b 2 = ln 2 / |ln b|  units
 *   b = 1   is NOT an exponential family: 1^x = 1 for all x (not invertible) and log₁ does not exist
 *
 * The base is a preset (1/2, 2, e, 10) or a custom decimal with at most two places. b^x is an exact rational when b is a rational preset
 * or decimal and x is a small integer; otherwise a double ("≈"). log_b y is computed as ln y / ln b (the change-of-base rule), with the
 * exact cases log_b 1 = 0 and log_b b = 1.
 */
import { sampleCurve, type CurveWindow, type Polyline } from '../../platform/geometry/curve';
import { sampleFamily, type FamilyValue } from './families';
import { ONE, ZERO, div, equals, exactDecimal, isInteger, mul, rat, sign, toNumber, type Rat } from './rational';

export type BasePreset = 'half' | 'two' | 'e' | 'ten' | 'custom';
export interface GrowthState {
  readonly preset: BasePreset;
  /** The custom base (used when preset = 'custom'); at most two decimals. */
  readonly custom: number;
  /** The exponent / the input of the logarithm. At most two decimals. */
  readonly x: number;
}
export const GROWTH_DECIMALS = 2;
export const CANONICAL_GROWTH: GrowthState = Object.freeze({ preset: 'two', custom: 3, x: 2 });
export const BASE_LABELS: Readonly<Record<BasePreset, { text: string; tex: string }>> = {
  half: { text: '1/2', tex: '\\tfrac12' },
  two: { text: '2', tex: '2' },
  e: { text: 'e', tex: 'e' },
  ten: { text: '10', tex: '10' },
  custom: { text: 'custom', tex: 'b' },
};

export type Kind = 'growth' | 'decay' | 'constant';
export interface GrowthDerived {
  readonly state: GrowthState;
  /** The base as a rational, or `null` for e (irrational). */
  readonly baseExact: Rat | null;
  readonly base: number;
  readonly kind: Kind;
  readonly power: FamilyValue;
  readonly lnBase: FamilyValue;
  readonly logAtX: FamilyValue;
  /** The x-distance over which b^x doubles (growth) or halves (decay); none for b = 1. */
  readonly period: { readonly kind: 'doubling' | 'halving'; readonly value: FamilyValue } | { readonly kind: 'none'; readonly reason: string };
  /** log₂ x computed as ln x / ln 2 (bits) and ln x (nats) at the same x. */
  readonly bits: FamilyValue;
  readonly nats: FamilyValue;
}

export const NO_LOG_BASE_1 = 'log base 1 does not exist: 1 raised to any power is 1, so no exponent produces any other number.';
export const NO_LOG_X = 'A logarithm needs a positive input: no power of a positive base is zero or negative.';

/** b^n for a rational b and a small integer n, exactly. */
function powExact(b: Rat, n: number): Rat {
  let out = ONE;
  const magnitude = Math.abs(n);
  for (let i = 0; i < magnitude; i++) out = mul(out, b);
  return n >= 0 ? out : div(ONE, out);
}

/** The integer n (|n| ≤ 64, n ≠ 0) with b^n = x exactly, if there is one: log_b x is then an exact integer ("log₂ 8 = 3"). */
export function exactLog(b: Rat, x: Rat): Rat | null {
  if (sign(b) <= 0 || equals(b, ONE) || sign(x) <= 0) return null;
  if (equals(x, ONE)) return ZERO;
  let up = ONE;
  let down = ONE;
  for (let n = 1; n <= 64; n++) {
    up = mul(up, b);
    down = div(down, b);
    if (equals(up, x)) return rat(n);
    if (equals(down, x)) return rat(-n);
  }
  return null;
}

/** If b = 2^m for a non-zero integer m (|m| ≤ 40), return m. */
function binaryExponent(b: Rat): number | null {
  if (sign(b) <= 0 || equals(b, ONE)) return null;
  for (let m = 1; m <= 40; m++) {
    const p = rat(2n ** BigInt(m));
    if (equals(b, p)) return m;
    if (equals(b, div(ONE, p))) return -m;
  }
  return null;
}

export function baseOf(state: GrowthState): { exact: Rat | null; value: number } {
  switch (state.preset) {
    case 'half': return { exact: rat(1, 2), value: 0.5 };
    case 'two': return { exact: rat(2), value: 2 };
    case 'ten': return { exact: rat(10), value: 10 };
    case 'e': return { exact: null, value: Math.E };
    case 'custom': return { exact: exactDecimal(state.custom, GROWTH_DECIMALS), value: state.custom };
  }
}

export function deriveGrowth(state: GrowthState): GrowthDerived {
  if (state.preset === 'custom' && !(state.custom > 0)) throw new RangeError('The base of an exponential function must be positive.');
  const { exact: baseExact, value: base } = baseOf(state);
  const x = exactDecimal(state.x, GROWTH_DECIMALS);
  const xn = toNumber(x);
  const isE = state.preset === 'e';
  const one = baseExact !== null && equals(baseExact, ONE);
  const xIsOne = x.num === 1n && x.den === 1n;
  const kind: Kind = one ? 'constant' : base > 1 ? 'growth' : 'decay';

  const power: FamilyValue = ((): FamilyValue => {
    if (baseExact && isInteger(x) && Math.abs(xn) <= 20) return { kind: 'exact', value: powExact(baseExact, xn) };
    if (isE && sign(x) === 0) return { kind: 'exact', value: ONE };
    const v = Math.pow(base, xn);
    return Number.isFinite(v) ? { kind: 'numeric', value: v } : { kind: 'overflow' };
  })();
  const lnBase: FamilyValue = isE ? { kind: 'exact', value: ONE } : one ? { kind: 'exact', value: ZERO } : { kind: 'numeric', value: Math.log(base) };

  const logAtX: FamilyValue = ((): FamilyValue => {
    if (one) return { kind: 'undefined', reason: NO_LOG_BASE_1 };
    if (sign(x) <= 0) return { kind: 'undefined', reason: NO_LOG_X };
    if (xIsOne) return { kind: 'exact', value: ZERO };
    const whole = baseExact ? exactLog(baseExact, x) : null;
    if (whole) return { kind: 'exact', value: whole };
    return { kind: 'numeric', value: Math.log(xn) / Math.log(base) };
  })();

  const period: GrowthDerived['period'] = ((): GrowthDerived['period'] => {
    if (one) return { kind: 'none', reason: 'b = 1 neither grows nor decays.' };
    const m = baseExact ? binaryExponent(baseExact) : null;
    const value: FamilyValue = m !== null ? { kind: 'exact', value: rat(1, Math.abs(m)) } : { kind: 'numeric', value: Math.LN2 / Math.abs(Math.log(base)) };
    return { kind: base > 1 ? 'doubling' : 'halving', value };
  })();

  const nonPositive: FamilyValue = { kind: 'undefined', reason: NO_LOG_X };
  const bitsWhole = sign(x) > 0 ? exactLog(rat(2), x) : null;
  const bits: FamilyValue = sign(x) <= 0 ? nonPositive : bitsWhole ? { kind: 'exact', value: bitsWhole } : { kind: 'numeric', value: Math.log(xn) / Math.LN2 };
  const nats: FamilyValue = sign(x) <= 0 ? nonPositive : xIsOne ? { kind: 'exact', value: ZERO } : { kind: 'numeric', value: Math.log(xn) };
  return { state, baseExact, base, kind, power, lnBase, logAtX, period, bits, nats };
}

/** The graph of b^x and of log_b x. Depends on the base only (never on x). The logarithm curve is empty when b = 1. */
export function sampleBase(base: number, window: CurveWindow, samples = 480): { readonly exponential: Polyline[]; readonly logarithm: Polyline[] } {
  const exponential = sampleCurve(x => Math.pow(base, x), window, { samples });
  if (base === 1) return { exponential, logarithm: [] };
  // log_b x = ln x / ln b: the natural-log curve scaled by 1 / ln b
  return { exponential, logarithm: sampleFamily('ln', 1 / Math.log(base), 0, window, samples) };
}
