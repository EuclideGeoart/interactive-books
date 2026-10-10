/**
 * The logarithm identities that later chapters need, CHECKED rather than asserted (master plan §3.5, §4 I.6).
 *
 *   product         ln(ab) = ln a + ln b              (a, b > 0)
 *   power           ln(a^k) = k · ln a                (a > 0, k real)
 *   change of base  b^(ln a / ln b) = a, i.e. log_b a = ln a / ln b      (a > 0, b > 0, b ≠ 1)
 *   bits and nats   log₂ a = ln a / ln 2              (a > 0)
 *
 * Each identity is an exact equality in mathematics. A computer rounds every intermediate value, so the checker evaluates both
 * sides from the model, shows their DIFFERENCE, and compares it with an explicit tolerance:
 *
 *       |lhs − rhs| ≤ 8 · 2⁻⁵² · scale,     scale = max(1, |lhs|, |rhs|, every logarithm that was computed)
 *
 * — a few units in the last place of the largest number involved. (Change of base exponentiates a rounded quotient, which multiplies its
 * rounding error by |ln a|, so that one check's tolerance is multiplied by 1 + |ln a|.) It never claims the difference is exactly zero. Outside the domain
 * (a ≤ 0 or b ≤ 0, or base 1) there is nothing to compare and the state is `undefined` with the reason.
 */
import { exactDecimal, toNumber } from './rational';

export interface IdentityState {
  readonly a: number;
  readonly b: number;
  readonly k: number;
}
export const CANONICAL_IDENTITY: IdentityState = Object.freeze({ a: 6, b: 4, k: 3 });
export const IDENTITY_DECIMALS = 2;
export const IDENTITY_TOLERANCE_FACTOR = 8;
const EPSILON = 2 ** -52;

export type IdentityId = 'product' | 'power' | 'change-of-base' | 'bits-nats';

export interface IdentityCheck {
  readonly id: IdentityId;
  /** The statement, as LaTeX, with symbols (not numbers). */
  readonly statementTex: string;
  readonly lhsTex: string;
  readonly rhsTex: string;
  readonly status: 'checked' | 'undefined';
  readonly reason: string | null;
  readonly lhs: number | null;
  readonly rhs: number | null;
  /** lhs − rhs, as computed. */
  readonly difference: number | null;
  readonly tolerance: number | null;
  readonly within: boolean | null;
}

/** A double that is zero, infinite or subnormal keeps too few significant bits for a comparison to mean anything. */
const NORMAL_MIN = 2.2250738585072014e-308;
const isNormal = (v: number): boolean => Number.isFinite(v) && Math.abs(v) >= NORMAL_MIN;
const OUT_OF_RANGE = 'A number in this check (a·b or aᵏ) is too large or too small for a double to hold with full precision, so the two sides cannot be compared. The identity itself still holds for these numbers.';

const NO_A = 'ln a needs a > 0.';
const NO_B = 'ln b needs b > 0.';
const NO_AB = 'This identity needs a > 0 and b > 0 (a logarithm of a non-positive number does not exist).';

/**
 * `amplify` ≥ 1 is for a side that EXPONENTIATES a rounded number: the relative rounding error ε of the exponent becomes a relative
 * error of ε·|exponent·ln b| in the result (change of base: the exponent is ln a / ln b and the base is b, so the factor is 1 + |ln a|).
 */
function checked(id: IdentityId, statementTex: string, lhsTex: string, rhsTex: string, lhs: number, rhs: number, logs: readonly number[], amplify = 1): IdentityCheck {
  if (![lhs, rhs, ...logs].every(Number.isFinite)) {
    return undefinedCheck(id, statementTex, lhsTex, rhsTex, 'A value in this check is larger or smaller than a double can hold, so it cannot be compared. The identity itself still holds for these numbers.');
  }
  const scale = Math.max(1, Math.abs(lhs), Math.abs(rhs), ...logs.map(Math.abs));
  const tolerance = IDENTITY_TOLERANCE_FACTOR * EPSILON * scale * amplify;
  const difference = lhs - rhs;
  return { id, statementTex, lhsTex, rhsTex, status: 'checked', reason: null, lhs, rhs, difference, tolerance, within: Math.abs(difference) <= tolerance };
}
function undefinedCheck(id: IdentityId, statementTex: string, lhsTex: string, rhsTex: string, reason: string): IdentityCheck {
  return { id, statementTex, lhsTex, rhsTex, status: 'undefined', reason, lhs: null, rhs: null, difference: null, tolerance: null, within: null };
}

export interface IdentityDerived {
  readonly state: IdentityState;
  readonly checks: readonly IdentityCheck[];
}

export function deriveIdentities(state: IdentityState): IdentityDerived {
  const a = toNumber(exactDecimal(state.a, IDENTITY_DECIMALS));
  const b = toNumber(exactDecimal(state.b, IDENTITY_DECIMALS));
  const k = toNumber(exactDecimal(state.k, IDENTITY_DECIMALS));
  const positiveA = a > 0;
  const positiveB = b > 0;

  const product = positiveA && positiveB && !isNormal(a * b)
    ? undefinedCheck('product', '\\ln(ab)=\\ln a+\\ln b', '\\ln(ab)', '\\ln a+\\ln b', OUT_OF_RANGE)
    : positiveA && positiveB
    ? checked('product', '\\ln(ab)=\\ln a+\\ln b', '\\ln(ab)', '\\ln a+\\ln b', Math.log(a * b), Math.log(a) + Math.log(b), [Math.log(a), Math.log(b)])
    : undefinedCheck('product', '\\ln(ab)=\\ln a+\\ln b', '\\ln(ab)', '\\ln a+\\ln b', positiveA ? NO_B : positiveB ? NO_A : NO_AB);

  const power = positiveA && !isNormal(Math.pow(a, k))
    ? undefinedCheck('power', '\\ln(a^{k})=k\\ln a', '\\ln(a^{k})', 'k\\ln a', OUT_OF_RANGE)
    : positiveA
    ? checked('power', '\\ln(a^{k})=k\\ln a', '\\ln(a^{k})', 'k\\ln a', Math.log(Math.pow(a, k)), k * Math.log(a), [Math.log(a), k * Math.log(a)])
    : undefinedCheck('power', '\\ln(a^{k})=k\\ln a', '\\ln(a^{k})', 'k\\ln a', NO_A);

  const changeTex = '\\log_b a=\\dfrac{\\ln a}{\\ln b}';
  const change = !positiveA || !positiveB
    ? undefinedCheck('change-of-base', changeTex, 'a', 'b^{\\ln a/\\ln b}', positiveA ? NO_B : positiveB ? NO_A : NO_AB)
    : b === 1
      ? undefinedCheck('change-of-base', changeTex, 'a', 'b^{\\ln a/\\ln b}', 'ln 1 = 0, so ln a / ln b would divide by zero: log base 1 does not exist.')
      : checked('change-of-base', changeTex, 'a', 'b^{\\ln a/\\ln b}', a, Math.pow(b, Math.log(a) / Math.log(b)), [Math.log(a) / Math.log(b)], 1 + Math.abs(Math.log(a)));

  const bits = positiveA
    ? checked('bits-nats', '\\log_2 a=\\dfrac{\\ln a}{\\ln 2}', '\\log_2 a', '\\dfrac{\\ln a}{\\ln 2}', Math.log2(a), Math.log(a) / Math.LN2, [Math.log(a)])
    : undefinedCheck('bits-nats', '\\log_2 a=\\dfrac{\\ln a}{\\ln 2}', '\\log_2 a', '\\dfrac{\\ln a}{\\ln 2}', NO_A);

  return { state, checks: [product, power, change, bits] };
}
