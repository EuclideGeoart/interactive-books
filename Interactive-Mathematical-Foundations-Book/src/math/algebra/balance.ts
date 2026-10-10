/**
 * The balance model of I.4: a linear equation or inequality, a recorded history of balanced operations, and the beam at a trial value of x.
 *
 *   state (flat, serializable)  →  deriveBalance  →  { frames (one statement per step), the solution set before and after, the beam at a trial x }
 *
 * Everything the learner types is a decimal with at most `DECIMALS` places and is read EXACTLY (`fromDecimal`), never rounded. The history is a
 * list of steps; a step that would be rejected (×0, ÷0) is never stored, so `deriveBalance` can throw on one without that being reachable from
 * the interface.
 */
import { fromDecimal, int, isZero, neg, sign, sub, toNumber, type Rational } from '../quantity/rational';
import {
  applyOperation, deriveHistory, evalLinear, holdsAt, imbalance, inSolutionSet, linear, sameSolutionSet, solve, statement,
  type BalanceFrame, type Linear, type Operation, type Relation, type SolutionSet, type Statement,
} from './linear';

export const DECIMALS = 2;

export const exact = (value: number, name = 'value'): Rational => {
  const r = fromDecimal(value, DECIMALS);
  if (!r) throw new RangeError(`${name} = ${value} is not a finite number with at most ${DECIMALS} decimal places`);
  return r;
};

/** The initial statement, as plain numbers: `a1·x + b1  ⟨rel⟩  a2·x + b2`. */
export interface StatementSpec {
  readonly a1: number;
  readonly b1: number;
  readonly rel: Relation;
  readonly a2: number;
  readonly b2: number;
}
export const statementOf = (s: StatementSpec): Statement =>
  statement(linear(exact(s.a1, 'a₁'), exact(s.b1, 'b₁')), s.rel, linear(exact(s.a2, 'a₂'), exact(s.b2, 'b₂')));

/**
 * One recorded operation, as the learner entered it.
 *   add      add the number `value` to both sides            (a negative value is "subtract")
 *   add-x    add `value`·x to both sides                       (a negative value is "subtract")
 *   scale    multiply both sides by `value`
 *   divide   divide both sides by `value`
 */
export interface StepSpec {
  readonly op: 'add' | 'add-x' | 'scale' | 'divide';
  readonly value: number;
}
export const OP_KINDS: readonly StepSpec['op'][] = Object.freeze(['add', 'add-x', 'scale', 'divide'] as const);

export function operationOf(step: StepSpec): Operation {
  const v = exact(step.value, 'the operation value');
  switch (step.op) {
    case 'add': return { kind: 'add', term: linear(int(0), v) };
    case 'add-x': return { kind: 'add', term: linear(v, int(0)) };
    case 'scale': return { kind: 'scale', k: v };
    case 'divide': return { kind: 'divide', k: v };
  }
}

export interface BalanceState {
  readonly initial: StatementSpec;
  readonly steps: readonly StepSpec[];
  /** The trial value of x the beam is drawn at. */
  readonly trial: number;
}

/** What the beam shows at a trial x: both sides of one statement, evaluated exactly. */
export interface BeamReading {
  readonly left: Rational;
  readonly right: Rational;
  /** L(x) − R(x): zero exactly at equilibrium. */
  readonly diff: Rational;
  /** Which pan sits lower: the one holding the larger value. `level` exactly when L(x) = R(x). */
  readonly lower: 'left' | 'right' | 'level';
  /** Does the statement (with its relation) hold at the trial x? */
  readonly holds: boolean;
}

export function beamAt(s: Statement, trial: Rational): BeamReading {
  const left = evalLinear(s.l, trial);
  const right = evalLinear(s.r, trial);
  const diff = imbalance(s, trial);
  return { left, right, diff, lower: sign(diff) > 0 ? 'left' : sign(diff) < 0 ? 'right' : 'level', holds: holdsAt(s, trial) };
}

export interface BalanceDerived {
  readonly trial: Rational;
  readonly frames: readonly BalanceFrame[];
  readonly final: Statement;
  readonly initialSolution: SolutionSet;
  readonly finalSolution: SolutionSet;
  /** `solutions[i]` is the solution set of `frames[i].statement`, computed from that statement alone. */
  readonly solutions: readonly SolutionSet[];
  /** The solution sets of the first and the last statement are equal (they must be: every recorded step is reversible). */
  readonly preserved: boolean;
  /** `beam[i]` is the beam of `frames[i]` at the trial value. */
  readonly beams: readonly BeamReading[];
  /** Does the trial value belong to the solution set (decided from the set, an independent route to `beams[i].holds`)? */
  readonly trialInSolution: boolean;
}

export function deriveBalance(state: BalanceState): BalanceDerived {
  const initial = statementOf(state.initial);
  const frames = deriveHistory(initial, state.steps.map(operationOf));
  const final = frames[frames.length - 1]!.statement;
  const initialSolution = solve(initial);
  const finalSolution = solve(final);
  const trial = exact(state.trial, 'the trial value of x');
  return {
    trial, frames, final, initialSolution, finalSolution, solutions: frames.map(f => solve(f.statement)),
    preserved: sameSolutionSet(initialSolution, finalSolution),
    beams: frames.map(f => beamAt(f.statement, trial)),
    trialInSolution: inSolutionSet(initialSolution, trial),
  };
}

/**
 * Would this step be accepted on the LAST statement of the history? The stage calls this before storing a step, so a rejected step (×0, ÷0)
 * shows its reason instead of entering the history.
 */
export function tryStep(state: BalanceState, step: StepSpec): { ok: true; next: Statement; reversed: boolean } | { ok: false; reason: string } {
  const frames = deriveHistory(statementOf(state.initial), state.steps.map(operationOf));
  const last = frames[frames.length - 1]!.statement;
  const result = applyOperation(last, operationOf(step));
  return result.kind === 'ok' ? { ok: true, next: result.next, reversed: result.reversed } : { ok: false, reason: result.reason };
}

/**
 * A complete way to isolate the unknown, derived from the statement itself:
 *   1. move the x-terms to the left (subtract a₂·x from both sides) unless a₂ = 0;
 *   2. move the constants to the right (subtract b₁ from both sides) unless b₁ = 0;
 *   3. divide by what is left in front of x (m = a₁ − a₂), unless it is 0 or 1.
 * If m = 0 the work ends at `0 = c` ("0 ⟨rel⟩ c"), a statement about no x at all.
 */
export function solutionPath(spec: StatementSpec): StepSpec[] {
  const s = statementOf(spec);
  const steps: StepSpec[] = [];
  // every value below is a difference of numbers with at most DECIMALS places, so it has at most DECIMALS places itself
  if (!isZero(s.r.a)) steps.push({ op: 'add-x', value: toNumber(neg(s.r.a)) });
  if (!isZero(s.l.b)) steps.push({ op: 'add', value: toNumber(neg(s.l.b)) });
  const m = sub(s.l.a, s.r.a);
  if (!isZero(m) && !(m.num === 1n && m.den === 1n)) steps.push({ op: 'divide', value: toNumber(m) });
  return steps;
}

export type { BalanceFrame, Linear, Operation, Relation, SolutionSet, Statement };
