/**
 * Linear statements `a₁x + b₁  ⟨rel⟩  a₂x + b₂` with exact rational coefficients, their exact solution sets, and the balanced operations.
 *
 * This is deliberately NOT a computer-algebra system. The only expression type is the linear form `a·x + b`; the only statements are an
 * equation or an inequality between two of them. Everything is exact (BigInt rationals from the Quantities chapter), so "the same operation
 * on both sides preserves the solution set" can be CHECKED, not assumed.
 *
 * Solution sets. Write the statement as `m·x ⟨rel⟩ c` with `m = a₁ − a₂` and `c = b₂ − b₁`.
 *   m = 0  : the statement says `0 ⟨rel⟩ c`, which does not involve x: it is true for every x or for none.
 *   m > 0  : divide by m, the relation is kept:      x ⟨rel⟩ c/m.
 *   m < 0  : divide by m, the relation is REVERSED:  x ⟨rel'⟩ c/m.
 * For an equation the relation is "=" and reversal does nothing: one point, no solution, or every number.
 */
import { add, cmp, div, eq, int, isZero, mul, neg, sign, sub, type Rational } from '../quantity/rational';

/** `a·x + b`. */
export interface Linear {
  readonly a: Rational;
  readonly b: Rational;
}
export const linear = (a: Rational, b: Rational): Linear => ({ a, b });
export const evalLinear = (l: Linear, x: Rational): Rational => add(mul(l.a, x), l.b);
export const addLinear = (l: Linear, m: Linear): Linear => linear(add(l.a, m.a), add(l.b, m.b));
export const subLinear = (l: Linear, m: Linear): Linear => linear(sub(l.a, m.a), sub(l.b, m.b));
export const scaleLinear = (l: Linear, k: Rational): Linear => linear(mul(l.a, k), mul(l.b, k));
/** `l / k`; the caller has already rejected k = 0. */
export const divideLinear = (l: Linear, k: Rational): Linear => linear(div(l.a, k), div(l.b, k));
export const negLinear = (l: Linear): Linear => linear(neg(l.a), neg(l.b));
export const eqLinear = (l: Linear, m: Linear): boolean => eq(l.a, m.a) && eq(l.b, m.b);

export type Relation = '=' | '<' | '≤' | '>' | '≥';
export const RELATIONS: readonly Relation[] = Object.freeze(['=', '<', '≤', '>', '≥'] as const);

/** Reversal of an inequality: what the relation becomes when both sides are multiplied by a negative number. */
export const reverse = (rel: Relation): Relation => ({ '=': '=', '<': '>', '≤': '≥', '>': '<', '≥': '≤' } as const)[rel];
/** Does `u ⟨rel⟩ v` hold, for exact rationals? */
export function relationHolds(rel: Relation, u: Rational, v: Rational): boolean {
  const c = cmp(u, v);
  switch (rel) {
    case '=': return c === 0;
    case '<': return c < 0;
    case '≤': return c <= 0;
    case '>': return c > 0;
    case '≥': return c >= 0;
  }
}

export interface Statement {
  readonly l: Linear;
  readonly rel: Relation;
  readonly r: Linear;
}
export const statement = (l: Linear, rel: Relation, r: Linear): Statement => ({ l, rel, r });
/** Is the statement true at the exact value x? */
export const holdsAt = (s: Statement, x: Rational): boolean => relationHolds(s.rel, evalLinear(s.l, x), evalLinear(s.r, x));
/** `L(x) − R(x)`: the quantity the balance picture draws. */
export const imbalance = (s: Statement, x: Rational): Rational => sub(evalLinear(s.l, x), evalLinear(s.r, x));

// ----------------------------------------------------------------------------------------------------- solution sets
export type SolutionSet =
  | { readonly kind: 'none' }
  | { readonly kind: 'all' }
  /** An equation with exactly one solution. */
  | { readonly kind: 'point'; readonly x: Rational }
  /** An inequality: every x below (or above) `bound`; `closed` says whether `bound` itself belongs. */
  | { readonly kind: 'ray'; readonly side: 'below' | 'above'; readonly bound: Rational; readonly closed: boolean };

export const sameSolutionSet = (s: SolutionSet, t: SolutionSet): boolean => {
  if (s.kind !== t.kind) return false;
  if (s.kind === 'point' && t.kind === 'point') return eq(s.x, t.x);
  if (s.kind === 'ray' && t.kind === 'ray') return s.side === t.side && s.closed === t.closed && eq(s.bound, t.bound);
  return true;
};

export function solve(s: Statement): SolutionSet {
  const m = sub(s.l.a, s.r.a);
  const c = sub(s.r.b, s.l.b);
  if (isZero(m)) return relationHolds(s.rel, int(0), c) ? { kind: 'all' } : { kind: 'none' };
  const bound = div(c, m);
  if (s.rel === '=') return { kind: 'point', x: bound };
  const rel = sign(m) > 0 ? s.rel : reverse(s.rel);
  return { kind: 'ray', side: rel === '<' || rel === '≤' ? 'below' : 'above', bound, closed: rel === '≤' || rel === '≥' };
}

/** Is x in the solution set? (an independent route to the same answer as `holdsAt`; the tests check that they agree.) */
export function inSolutionSet(set: SolutionSet, x: Rational): boolean {
  switch (set.kind) {
    case 'none': return false;
    case 'all': return true;
    case 'point': return eq(set.x, x);
    case 'ray': {
      const c = cmp(x, set.bound);
      return set.side === 'below' ? c < 0 || (set.closed && c === 0) : c > 0 || (set.closed && c === 0);
    }
  }
}

// ----------------------------------------------------------------------------------------------------- balanced operations
/**
 * An operation applied to BOTH sides.
 *   add     add the linear term `a·x + b` to both sides (a negative term is "subtract")
 *   scale   multiply both sides by k
 *   divide  divide both sides by k
 */
export type Operation =
  | { readonly kind: 'add'; readonly term: Linear }
  | { readonly kind: 'scale'; readonly k: Rational }
  | { readonly kind: 'divide'; readonly k: Rational };

export type OperationResult =
  | { readonly kind: 'ok'; readonly next: Statement; /** true when an inequality's relation was reversed by a negative factor */ readonly reversed: boolean }
  | { readonly kind: 'rejected'; readonly reason: string };

export function applyOperation(s: Statement, op: Operation): OperationResult {
  if (op.kind === 'add') {
    return { kind: 'ok', reversed: false, next: statement(addLinear(s.l, op.term), s.rel, addLinear(s.r, op.term)) };
  }
  if (isZero(op.k)) {
    if (op.kind === 'divide') return { kind: 'rejected', reason: 'Division by 0 is undefined. A "balanced" operation must be reversible, and nothing can be un-divided by 0.' };
    return {
      kind: 'rejected',
      reason: s.rel === '='
        ? 'Multiplying both sides by 0 is not allowed. It turns every equation into 0 = 0, which is true for every x, so the solution set changes, and the step cannot be reversed (nothing can be divided back out of 0).'
        : 'Multiplying both sides by 0 is not allowed. It turns the inequality into 0 ' + s.rel + ' 0, which no longer depends on x (and a strict inequality becomes false), so the solution set changes and the step cannot be reversed.',
    };
  }
  const f = op.kind === 'scale' ? (l: Linear) => scaleLinear(l, op.k) : (l: Linear) => divideLinear(l, op.k);
  const reversed = s.rel !== '=' && sign(op.k) < 0;
  return { kind: 'ok', reversed, next: statement(f(s.l), reversed ? reverse(s.rel) : s.rel, f(s.r)) };
}

// ----------------------------------------------------------------------------------------------------- the recorded history
export interface BalanceFrame {
  readonly statement: Statement;
  /** The operation that produced this statement from the previous one (absent on the first frame). */
  readonly op?: Operation;
  readonly reversed: boolean;
  /** The statement with the operation written out on both sides but not yet simplified, e.g. `3x + 1 − 2x`: kept as the two sides' forms before and after. */
  readonly before?: Statement;
}

/**
 * The full history from an initial statement and a list of operations. Operations that would be rejected are NOT in a valid history (the stage
 * refuses them when they are typed); if one is passed anyway this throws, so a bad history can never be displayed.
 */
export function deriveHistory(initial: Statement, ops: readonly Operation[]): BalanceFrame[] {
  const frames: BalanceFrame[] = [{ statement: initial, reversed: false }];
  let current = initial;
  for (const op of ops) {
    const result = applyOperation(current, op);
    if (result.kind === 'rejected') throw new RangeError(result.reason);
    frames.push({ statement: result.next, op, reversed: result.reversed, before: current });
    current = result.next;
  }
  return frames;
}
