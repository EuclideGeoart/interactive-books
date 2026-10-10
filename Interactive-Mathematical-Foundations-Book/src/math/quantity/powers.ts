/**
 * Integer powers and the rules that make them a system (master plan §4 I.1).
 *
 * For a base `b` (a rational with at most one decimal place in the stage) and integer exponents `m`, `n`:
 *
 *     bᵐ · bⁿ = bᵐ⁺ⁿ          (bᵐ)ⁿ = bᵐⁿ          b⁰ = 1 (b ≠ 0)          b⁻ⁿ = 1/bⁿ (b ≠ 0)
 *
 * Every rule below is CHECKED, not assumed: the two sides are computed by independent routes in exact rational arithmetic and compared.
 * A rule "applies" only when BOTH of its sides are defined. For b = 0 that is where the rules stop making claims (0⁻¹ is undefined, so
 * (0⁻¹)⁻¹ is undefined although 0¹ = 0 is not): the model reports it instead of hiding it. Whenever a rule applies, it holds — for every base.
 */
import { eq, mul, power, ONE, div, isZero, type PowerResult, type Rational } from './rational';

export const EXPONENT_MIN = -3;
export const EXPONENT_MAX = 6;

export type RuleId = 'product' | 'power-of-power' | 'zero' | 'negative';

export interface RuleCheck {
  readonly id: RuleId;
  /** Both sides are defined, so the rule is being asked a real question. */
  readonly applies: boolean;
  readonly left: PowerResult;
  readonly right: PowerResult;
  /** Both sides defined and exactly equal. For a rule that applies this must be true; it is computed, not assumed. */
  readonly equal: boolean;
  /** Why the rule makes no claim (only when `applies` is false). */
  readonly note?: string;
}

export interface PowersDerived {
  readonly base: Rational;
  readonly m: number;
  readonly n: number;
  readonly ladder: readonly { readonly k: number; readonly result: PowerResult }[];
  readonly rules: readonly RuleCheck[];
}

const value = (r: Rational): PowerResult => ({ kind: 'value', value: r });
const undef = (reason: string): PowerResult => ({ kind: 'undefined', reason });

/** `x · y` where either factor may be undefined. */
function times(x: PowerResult, y: PowerResult): PowerResult {
  if (x.kind === 'undefined') return x;
  if (y.kind === 'undefined') return y;
  return value(mul(x.value, y.value));
}
function reciprocal(x: PowerResult): PowerResult {
  if (x.kind === 'undefined') return x;
  return isZero(x.value) ? undef('1/0 is division by zero.') : value(div(ONE, x.value));
}

const equalResults = (l: PowerResult, r: PowerResult): boolean => l.kind === 'value' && r.kind === 'value' && eq(l.value, r.value);

/** A rule is asked a real question only when BOTH sides are defined; for b = 0 that is exactly where it can fail to be asked. */
function check(id: RuleId, left: PowerResult, right: PowerResult): RuleCheck {
  const applies = left.kind === 'value' && right.kind === 'value';
  return { id, applies, left, right, equal: equalResults(left, right), ...(applies ? {} : { note: 'At least one side is undefined for this base, so the rule makes no claim here. (It is a rule about non-zero bases.)' }) };
}

export function derivePowers(base: Rational, m: number, n: number): PowersDerived {
  const bm = power(base, m);
  const bn = power(base, n);
  // (bᵐ)ⁿ: the outer power is taken of the VALUE bᵐ, so an undefined inner power makes the whole left side undefined.
  const outer: PowerResult = bm.kind === 'undefined' ? bm : power(bm.value, n);
  const rules: RuleCheck[] = [
    check('product', times(bm, bn), power(base, m + n)),
    check('power-of-power', outer, power(base, m * n)),
    check('zero', power(base, 0), value(ONE)),
    check('negative', power(base, -n), reciprocal(power(base, n))),
  ];
  const ladder: { k: number; result: PowerResult }[] = [];
  for (let k = EXPONENT_MIN; k <= EXPONENT_MAX; k++) ladder.push({ k, result: power(base, k) });
  return { base, m, n, ladder, rules };
}
