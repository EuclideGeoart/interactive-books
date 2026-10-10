/**
 * Expressions, identities and the distributive law, for I.4.
 *
 * An EXPRESSION is a recipe for a number (no "="). An EQUATION states that two expressions have the same value and is a condition on x:
 * it is true for some x, for none, or for every x. An INEQUALITY is the same with an order in place of the "=". The kind of a statement is a
 * property of its solution set, so `classify` reads it from `solve`:
 *
 *     equation, every x       identity            2(x + 1) = 2x + 2
 *     equation, no x          contradiction       2(x + 1) = 2x + 1
 *     equation, one x         conditional         2(x + 1) = x + 5      (x = 3)
 *
 * The distributive law a(bx + c) = abx + ac is the identity the stage tests, next to the slip that multiplies only the first term,
 * a(bx + c) = abx + c, which is NOT an identity for general a and c.
 */
import { add, mul, sub, type Rational } from '../quantity/rational';
import { exact } from './balance';
import { holdsAt, linear, scaleLinear, solve, statement, type Linear, type SolutionSet, type Statement } from './linear';

export type StatementKind = 'identity' | 'contradiction' | 'conditional-equation' | 'always-true' | 'never-true' | 'conditional-inequality';

export function classify(s: Statement): StatementKind {
  const set = solve(s);
  if (s.rel === '=') return set.kind === 'all' ? 'identity' : set.kind === 'none' ? 'contradiction' : 'conditional-equation';
  return set.kind === 'all' ? 'always-true' : set.kind === 'none' ? 'never-true' : 'conditional-inequality';
}

export type DistributeForm = 'correct' | 'slip';

export interface DistributeState {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly x: number;
  readonly form: DistributeForm;
}

export interface DistributeDerived {
  readonly a: Rational;
  readonly b: Rational;
  readonly c: Rational;
  readonly x: Rational;
  readonly form: DistributeForm;
  /** bx + c at the chosen x. */
  readonly inner: Rational;
  /** a(bx + c): multiply the whole bracket (left side, evaluated as written). */
  readonly product: Rational;
  /** The two terms of the right-hand side at x: abx and (ac for the correct form, c for the slip). */
  readonly firstTerm: Rational;
  readonly secondTerm: Rational;
  readonly expanded: Rational;
  /** product − expanded: 0 exactly where the right-hand side agrees with the left at this x. */
  readonly gap: Rational;
  readonly agreesHere: boolean;
  readonly lhs: Linear;
  readonly rhs: Linear;
  readonly statement: Statement;
  readonly solution: SolutionSet;
  readonly kind: StatementKind;
}

export function deriveDistribute(state: DistributeState): DistributeDerived {
  const a = exact(state.a, 'a');
  const b = exact(state.b, 'b');
  const c = exact(state.c, 'c');
  const x = exact(state.x, 'x');
  const inner = add(mul(b, x), c);
  const product = mul(a, inner);
  const firstTerm = mul(mul(a, b), x);
  const secondTerm = state.form === 'correct' ? mul(a, c) : c;
  const expanded = add(firstTerm, secondTerm);
  const lhs = scaleLinear(linear(b, c), a);
  const rhs = linear(mul(a, b), state.form === 'correct' ? mul(a, c) : c);
  const st = statement(lhs, '=', rhs);
  return {
    a, b, c, x, form: state.form, inner, product, firstTerm, secondTerm, expanded,
    gap: sub(product, expanded),
    agreesHere: holdsAt(st, x),
    lhs, rhs, statement: st, solution: solve(st), kind: classify(st),
  };
}
