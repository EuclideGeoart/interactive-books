/**
 * Lesson views for the hero stage of I.4: a statement, a recorded history of balanced operations, and a beam at a trial value of x.
 *
 *   BalanceDerived  →  { trace frames, inspector rows, formulas, verdict, beam drawing, spoken text }
 *
 * Nothing here decides anything mathematical: every set, relation, value and "reversed" flag was produced by `src/math/algebra`.
 * The only arithmetic is placing the beam on the page (`beamScene`), a pure function of the beam reading.
 */
import type { BalanceDerived, BalanceState, BeamReading, StatementSpec, StepSpec } from '../../math/algebra/balance';
import { operationOf } from '../../math/algebra/balance';
import type { BalanceFrame, SolutionSet } from '../../math/algebra/linear';
import { rationalForm } from '../../math/quantity/exactform';
import { isZero, toNumber } from '../../math/quantity/rational';
import type { ParamSpec } from '../../platform/params';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import type { InspectorRowData } from '../../ui/Inspector';
import { aligned } from '../shared/format';
import { describeGiven, describeRational, statement as describeStatement } from '../quantities/values';
import {
  appliedTex, conditionSpoken, conditionText, conditionTex, describeSet, intervalTex, linearTex, operationSpoken, operationText, relTex, statementSpoken,
  statementText, statementTex, substitutedTex,
} from './format';

// ---------------------------------------------------------------------------------------------- canonical state and presets
export interface BalancePreset { readonly id: string; readonly label: string; readonly aria: string; readonly spec: StatementSpec }
const preset = (id: string, label: string, aria: string, spec: StatementSpec): BalancePreset => Object.freeze({ id, label, aria, spec: Object.freeze(spec) });
export const BALANCE_PRESETS: readonly BalancePreset[] = Object.freeze([
  preset('b-one', '3x + 2 = x + 10', 'the equation 3x plus 2 equals x plus 10: one solution', { a1: 3, b1: 2, rel: '=', a2: 1, b2: 10 }),
  preset('b-frac', '4x + 1 = x + 3', 'the equation 4x plus 1 equals x plus 3: a solution that is not a whole number', { a1: 4, b1: 1, rel: '=', a2: 1, b2: 3 }),
  preset('b-none', '2x + 3 = 2x + 7', 'the equation 2x plus 3 equals 2x plus 7: no solution', { a1: 2, b1: 3, rel: '=', a2: 2, b2: 7 }),
  preset('b-all', '2x + 3 = 2x + 3', 'the equation 2x plus 3 equals 2x plus 3: true for every x', { a1: 2, b1: 3, rel: '=', a2: 2, b2: 3 }),
  preset('b-ge', '5x − 1 ≥ 2x + 8', 'the inequality 5x minus 1 is at least 2x plus 8', { a1: 5, b1: -1, rel: '≥', a2: 2, b2: 8 }),
  preset('b-neg', '4 − 2x < x + 10', 'the inequality 4 minus 2x is less than x plus 10: dividing by a negative number reverses it', { a1: -2, b1: 4, rel: '<', a2: 1, b2: 10 }),
]);
const NO_STEPS: readonly StepSpec[] = Object.freeze([]);
export const balanceStateFor = (p: BalancePreset): BalanceState => Object.freeze({ initial: p.spec, steps: NO_STEPS, trial: 0 });
export const CANONICAL_BALANCE: BalanceState = balanceStateFor(BALANCE_PRESETS[0]!);

export const TRIAL_SPEC: ParamSpec = { id: 'trial', name: 'trial value of x', symbolTex: 'x', symbolText: 'x', domain: { min: -10, max: 10 }, default: 0, step: 1, maxDecimals: 2, onInvalid: 'reject' };
export const AMOUNT_SPEC: ParamSpec = { id: 'amount', name: 'amount', symbolTex: 'k', symbolText: 'the amount', domain: { min: -12, max: 12 }, default: 2, step: 1, maxDecimals: 2, onInvalid: 'reject' };
/** The trial handle moves along the line only. */
export const LINE_Y_SPEC: ParamSpec = { id: 'y', name: 'height', symbolTex: 'y', symbolText: 'y', domain: { min: 0, max: 0 }, default: 0, step: 1, onInvalid: 'reject' };
/** The visible stretch of the line under the beam; the trial handle lives in ±10. */
export const BALANCE_LINE_WINDOW = Object.freeze({ xMin: -11, xMax: 11 });

export interface OpOption { readonly id: StepSpec['op']; readonly label: string }
export const OP_OPTIONS: readonly OpOption[] = Object.freeze([
  { id: 'add', label: 'add a number' },
  { id: 'add-x', label: 'add a multiple of x' },
  { id: 'scale', label: 'multiply by' },
  { id: 'divide', label: 'divide by' },
]);

/** The label of the Apply button: what pressing it would do, in words ("Subtract 2x from both sides"). */
export const applyLabel = (step: StepSpec): string => operationText(operationOf(step));

// ---------------------------------------------------------------------------------------------- the trace
export interface FrameView {
  /** Display-math: the operation written on both sides (unsimplified), then the simplified statement. */
  readonly tex: string;
  readonly caption: string;
  /** The statement as plain text, for the step slider's value text. */
  readonly text: string;
}

const hasNoX = (f: BalanceFrame): boolean => isZero(f.statement.l.a) && isZero(f.statement.r.a);

function frameCaption(d: BalanceDerived, i: number): string {
  const f = d.frames[i]!;
  const set = d.solutions[i]!;
  const when = conditionText(set);
  if (i === 0) return `The starting statement. It is true exactly when ${when}. Each operation is applied to both sides, and the set of solutions never changes.`;
  const reversal = f.reversed ? ' The factor is negative, so the relation turns around. This is the one place where an inequality behaves differently from an equation.' : '';
  const noX = hasNoX(f) ? ` The x terms have cancelled: ${statementText(f.statement)} does not involve x, so it is true for ${set.kind === 'all' ? 'every x' : 'no x'}.` : '';
  return `${operationText(f.op!)}.${reversal}${noX} Still true exactly when ${when}.`;
}

export function balanceFrames(d: BalanceDerived): readonly TraceFrame<FrameView>[] {
  return traceFrom<FrameView>(d.frames.map((f, i) => ({
    state: {
      tex: i === 0
        ? statementTex(f.statement)
        : aligned([
          `${appliedTex(f.before!.l, f.op!)}&${relTex(f.statement.rel)}${appliedTex(f.before!.r, f.op!)}`,
          `${linearTex(f.statement.l)}&${relTex(f.statement.rel)}${linearTex(f.statement.r)}`,
        ]),
      caption: frameCaption(d, i),
      text: statementText(f.statement),
    },
  })));
}

// ---------------------------------------------------------------------------------------------- inspector
export function balanceRows(d: BalanceDerived, i: number, state: BalanceState): InspectorRowData[] {
  const f = d.frames[i]!;
  const beam = d.beams[i]!;
  const verdict = beam.holds ? 'true' : 'false';
  return [
    { id: 'trial', role: 'primary', symbolTex: 'x', name: 'trial value of x', description: describeGiven(state.trial) },
    { id: 'left', role: 'x', symbolTex: '\\text{left}', name: 'left side at this x', description: describeRational(beam.left) },
    { id: 'right', role: 'y', symbolTex: '\\text{right}', name: 'right side at this x', description: describeRational(beam.right) },
    { id: 'diff', role: 'derived', symbolTex: '\\text{left}-\\text{right}', name: 'left minus right (what tilts the beam)', description: describeRational(beam.diff) },
    { id: 'holds', role: beam.holds ? 'ink' : 'caution', symbolTex: relTex(f.statement.rel), name: `is "${statementText(f.statement)}" true at this x?`, description: describeStatement(verdict, `\\text{${verdict}}`, verdict) },
    { id: 'solution', role: 'x', symbolTex: 'S', name: 'solution set of this statement', description: describeSet(d.solutions[i]!) },
  ];
}

// ---------------------------------------------------------------------------------------------- the beam drawing
export const BEAM_VIEW = Object.freeze({ width: 360, height: 214, pivotX: 180, pivotY: 62, half: 128, maxTiltDeg: 15 });

export interface BeamScene {
  /** Beam tilt in degrees: positive when the LEFT end is lower. Exactly 0 when the two sides are equal. */
  readonly tiltDeg: number;
  readonly left: { readonly x: number; readonly y: number };
  readonly right: { readonly x: number; readonly y: number };
}

/**
 * Where the beam sits. The tilt grows with |left − right| but saturates (|d| / (|d| + 4) of the maximum), so it is monotone, exactly zero at
 * equality, and never leaves the picture. The figure is SCHEMATIC about how far it tilts; the inspector has the numbers.
 */
export function beamScene(beam: BeamReading): BeamScene {
  const { pivotX, pivotY, half, maxTiltDeg } = BEAM_VIEW;
  const d = Math.abs(toNumber(beam.diff));
  const magnitude = isZero(beam.diff) ? 0 : maxTiltDeg * (d / (d + 4));
  const tiltDeg = beam.lower === 'left' ? magnitude : beam.lower === 'right' ? -magnitude : 0;
  const t = (tiltDeg * Math.PI) / 180;
  return {
    tiltDeg,
    left: { x: pivotX - half * Math.cos(t), y: pivotY + half * Math.sin(t) },
    right: { x: pivotX + half * Math.cos(t), y: pivotY - half * Math.sin(t) },
  };
}

export function beamDescription(d: BalanceDerived, i: number): string {
  const b = d.beams[i]!;
  const level = b.lower === 'level' ? 'The beam is level.' : `The ${b.lower} pan is lower.`;
  return `A balance beam, drawn schematically. At x equal to ${rationalForm(d.trial).spoken}, the left pan holds ${rationalForm(b.left).spoken} `
    + `and the right pan holds ${rationalForm(b.right).spoken}. ${level} The tilt shows which side is larger, not by how much.`;
}

// ---------------------------------------------------------------------------------------------- the solution set on the line
export interface SetScene {
  readonly kind: SolutionSet['kind'];
  readonly point?: number;
  readonly bound?: number;
  readonly side?: 'below' | 'above';
  readonly closed?: boolean;
}
export function setScene(set: SolutionSet): SetScene {
  switch (set.kind) {
    case 'point': return { kind: 'point', point: toNumber(set.x) };
    case 'ray': return { kind: 'ray', bound: toNumber(set.bound), side: set.side, closed: set.closed };
    default: return { kind: set.kind };
  }
}

// ---------------------------------------------------------------------------------------------- formulas
export function balanceFormulas(d: BalanceDerived, i: number): string[] {
  const f = d.frames[i]!;
  const b = d.beams[i]!;
  const s = f.statement;
  const set = d.solutions[i]!;
  return [
    aligned([`${linearTex(s.l)}&${relTex(s.rel)}${linearTex(s.r)}`, `&\\iff\\ ${conditionTex(set)}\\quad\\bigl(S=${intervalTex(set)}\\bigr)`]),
    aligned([
      `\\text{left}&=${substitutedTex(s.l, d.trial)}=${rationalForm(b.left).tex}`,
      `\\text{right}&=${substitutedTex(s.r, d.trial)}=${rationalForm(b.right).tex}`,
      `\\text{left}-\\text{right}&=${rationalForm(b.diff).tex}`,
    ]),
  ];
}
export const FORMULA_LABELS = Object.freeze(['The statement and its solution set', 'The two sides at the trial value of x']);

// ---------------------------------------------------------------------------------------------- verdict
function beamSentence(f: BalanceFrame, b: BeamReading, trial: string): string {
  const l = rationalForm(b.left).text;
  const r = rationalForm(b.right).text;
  const rel = f.statement.rel;
  if (rel === '=') {
    return b.lower === 'level'
      ? `At x = ${trial} both sides are ${l}: the beam is level, so x = ${trial} is a solution.`
      : `At x = ${trial} the left side is ${l} and the right side is ${r}: the ${b.lower} pan is lower, so x = ${trial} is not a solution.`;
  }
  const tilt = b.lower === 'level' ? 'the beam is level' : `the ${b.lower} pan is lower`;
  return `At x = ${trial} the sides are ${l} and ${r} (${tilt}), so "${l} ${rel} ${r}" is ${b.holds ? 'true' : 'false'} and x = ${trial} ${b.holds ? 'is' : 'is not'} a solution.`;
}

export function balanceVerdict(d: BalanceDerived, i: number): string {
  const when = conditionText(d.solutions[i]!);
  const first = beamSentence(d.frames[i]!, d.beams[i]!, rationalForm(d.trial).text);
  const kept = i === 0 ? `The statement is true exactly when ${when}.` : `This statement is true exactly when ${when}, the same as the starting statement.`;
  return `${first} ${kept}`;
}

/** The verdict is a caution when the selected statement has no solution at all. */
export const verdictIsCaution = (d: BalanceDerived, i: number): boolean => d.solutions[i]!.kind === 'none';

// ---------------------------------------------------------------------------------------------- spoken
export function balanceSpoken(d: BalanceDerived, i: number): string {
  const f = d.frames[i]!;
  const prefix = i === 0 || !f.op ? 'Starting statement. ' : `${operationSpoken(f.op)}. ${f.reversed ? 'The relation is reversed. ' : ''}`;
  return `${prefix}${statementSpoken(f.statement)}. True when ${conditionSpoken(d.solutions[i]!)}.`;
}

export function balanceDescription(d: BalanceDerived, i: number): string {
  const f = d.frames[i]!;
  return `A number line from minus 11 to 11 with the trial value x at ${rationalForm(d.trial).spoken}. The statement ${statementSpoken(f.statement)} is true when ${conditionSpoken(d.solutions[i]!)}; those values are marked on the line.`;
}
