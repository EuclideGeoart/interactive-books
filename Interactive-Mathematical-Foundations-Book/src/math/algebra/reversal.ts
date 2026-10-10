/**
 * The inequality-reversal model of I.4: a true inequality `p ⟨rel⟩ q` between two numbers, multiplied on both sides by k.
 *
 *   k > 0   p < q  ⇒  kp < kq            the order is kept
 *   k < 0   p < q  ⇒  kp > kq            the order is REVERSED (multiplying by k < 0 reflects the line through 0 and stretches it by |k|)
 *   k = 0   p < q  ⇒  0 = 0              the strict inequality is destroyed, and nothing can be divided back out of 0: the step is rejected
 *
 * The "counterexample" is concrete: with k < 0, the relation `kp < kq` (the one you would write if you forgot to reverse) is FALSE for these
 * very numbers, and the model says so by evaluating it.
 */
import { cmp, eq, mul, sign, type Rational } from '../quantity/rational';
import { exact } from './balance';

export interface ReversalState {
  readonly p: number;
  readonly q: number;
  readonly k: number;
}
export type Order = 'less' | 'equal' | 'greater';
const orderOf = (u: Rational, v: Rational): Order => (cmp(u, v) < 0 ? 'less' : cmp(u, v) > 0 ? 'greater' : 'equal');
export const flip = (o: Order): Order => (o === 'less' ? 'greater' : o === 'greater' ? 'less' : 'equal');

export type Rule = 'keeps' | 'reverses' | 'rejected';

export interface ReversalDerived {
  readonly p: Rational;
  readonly q: Rational;
  readonly k: Rational;
  readonly kp: Rational;
  readonly kq: Rational;
  readonly before: Order;
  /** The true order between kp and kq. */
  readonly after: Order;
  readonly rule: Rule;
  /** After multiplying: does the SAME relation as before still hold between kp and kq? (False for k < 0 and p ≠ q: the counterexample.) */
  readonly sameRelationHolds: boolean;
  /** Does the REVERSED relation hold between kp and kq? */
  readonly reversedRelationHolds: boolean;
  /** p and q are equal, so there is no strict order to keep or reverse. */
  readonly degenerate: boolean;
}

export function deriveReversal(state: ReversalState): ReversalDerived {
  const p = exact(state.p, 'p');
  const q = exact(state.q, 'q');
  const k = exact(state.k, 'k');
  const kp = mul(k, p);
  const kq = mul(k, q);
  const before = orderOf(p, q);
  const after = orderOf(kp, kq);
  const rule: Rule = sign(k) > 0 ? 'keeps' : sign(k) < 0 ? 'reverses' : 'rejected';
  return {
    p, q, k, kp, kq, before, after, rule,
    sameRelationHolds: after === before,
    reversedRelationHolds: after === flip(before),
    degenerate: eq(p, q),
  };
}
