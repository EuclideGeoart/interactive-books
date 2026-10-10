/**
 * Lesson views for the hero stage of I.5: one input goes through a machine of one or two operations and one output comes out. The same state
 * {rule, a, x} drives the pipeline boxes, the graph (a draggable point on the curve), the table of inputs and outputs, the substitution lines and
 * the inspector. The curve is memoised on (rule, a) ONLY, so dragging x never re-samples it.
 *
 *   FunctionDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 */
import { toNumber, type Rational, int } from '../../math/quantity/rational';
import { rationalForm } from '../../math/quantity/exactform';
import { breaksOf, deriveFunction, rulesDouble, type FunctionDerived, type FunctionState, type RuleId } from '../../math/functions/rule';
import { evaluate, numValue, type Evaluation, type Num, type Op } from '../../math/functions/value';
import type { ParamSpec } from '../../platform/params';
import { sampleCurve, type Polyline } from '../../platform/geometry/curve';
import type { Point } from '../../platform/geometry/viewport';
import type { InspectorRowData } from '../../ui/Inspector';
import { aligned } from '../shared/format';
import { describeGiven, statement } from '../quantities/values';
import {
  describeNum, numBaseTex, numSpoken, numText, numTex, opApplyTex, opWords, paramName, ruleSpoken, ruleTex, ruleText, setSpoken, setText, setTex,
} from './format';

export const CANONICAL_FUNCTION: FunctionState = Object.freeze({ rule: 'shift', a: 2, x: 4 });
export const FUNCTION_WINDOW = Object.freeze({ xMin: -8, xMax: 8, yMin: -8, yMax: 8 });

export const aSpec = (rule: RuleId, value = CANONICAL_FUNCTION.a): ParamSpec => ({
  id: 'a', name: paramName(rule), symbolTex: 'a', symbolText: 'a', domain: { min: -5, max: 5 }, default: value, step: 1, maxDecimals: 0, onInvalid: 'reject',
});
export const FX_SPEC: ParamSpec = {
  id: 'x', name: 'input x', symbolTex: 'x', symbolText: 'x', domain: { min: -6, max: 6 }, default: CANONICAL_FUNCTION.x, step: 0.5, maxDecimals: 2, onInvalid: 'reject',
};
/** The y coordinate of the draggable handle is never edited: its y spec has no room to move. */
export const HANDLE_Y_SPEC: ParamSpec = { id: 'y', name: 'output', symbolTex: 'y', symbolText: 'y', domain: { min: 0, max: 0 }, default: 0, step: 1, maxDecimals: 2, onInvalid: 'reject' };

export interface FunctionPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: FunctionState }
const preset = (id: string, label: string, aria: string, state: FunctionState): FunctionPreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const FUNCTION_PRESETS: readonly FunctionPreset[] = Object.freeze([
  preset('p-shift', '(x − 2)² at 4', 'subtract 2 then square, at x equals 4', { rule: 'shift', a: 2, x: 4 }),
  preset('p-same', '(x − 2)² at 0', 'subtract 2 then square, at x equals 0: the same output as x equals 4', { rule: 'shift', a: 2, x: 0 }),
  preset('p-root', '√(x + 3) at 6', 'add 3 then take the square root, at x equals 6: the output is exactly 3', { rule: 'root', a: 3, x: 6 }),
  preset('p-root-out', '√(x + 3) at −4', 'add 3 then take the square root, at x equals minus 4: outside the domain', { rule: 'root', a: 3, x: -4 }),
  preset('p-pole', '1/(x − 2) at 2', 'subtract 2 then take the reciprocal, at x equals 2: the machine divides by zero', { rule: 'pole', a: 2, x: 2 }),
  preset('p-stretch', '−2x² at 3', 'square then multiply by minus 2, at x equals 3', { rule: 'stretch', a: -2, x: 3 }),
]);

// ---------------------------------------------------------------------------------------------- the curve (memoised on rule and a)
export function functionCurve(rule: RuleId, a: number): Polyline[] {
  return sampleCurve(rulesDouble(rule, a), FUNCTION_WINDOW, { breaks: breaksOf(rule, a), samples: 640 });
}

// ---------------------------------------------------------------------------------------------- scene
export interface FunctionScene {
  /** Where the handle is drawn: on the curve when the machine answers, on the x-axis when it refuses. */
  readonly handle: Point;
  readonly defined: boolean;
  /** The output is outside the visible window, so the handle is held at the edge. */
  readonly clamped: boolean;
  /** x of the vertical asymptote of the pole rule, or `null`. */
  readonly asymptote: number | null;
  /** The left end of the root rule: the curve starts here, with a filled end point. */
  readonly start: Point | null;
}
export function functionScene(d: FunctionDerived): FunctionScene {
  const x = toNumber(d.xRational);
  const y = numValue(d.output);
  const { yMin, yMax } = FUNCTION_WINDOW;
  const rule = d.state.rule;
  const asymptote = rule === 'pole' ? d.state.a : null;
  const start = rule === 'root' ? { x: -d.state.a, y: 0 } : null;
  if (y === null) return { handle: { x, y: 0 }, defined: false, clamped: false, asymptote, start };
  const clampedY = Math.max(yMin, Math.min(yMax, y));
  return { handle: { x, y: clampedY }, defined: true, clamped: clampedY !== y, asymptote, start };
}

// ---------------------------------------------------------------------------------------------- the trace in words
/** The first row where the machine refuses, if any. */
export const firstRefusal = (e: Evaluation): { index: number; op: Op; before: Num; reason: string } | null => {
  const i = e.rows.findIndex(r => r.after.kind === 'undefined');
  if (i < 0) return null;
  const row = e.rows[i]!;
  return { index: i, op: row.op, before: row.before, reason: row.after.kind === 'undefined' ? row.after.reason : '' };
};

/** What the machine could not do, up to the value it was given. */
export const cannot = (op: Op): string => (op.op === 'sqrt' ? 'take the square root of' : op.op === 'recip' ? 'take the reciprocal of' : `${opWords(op)} of`);

const xText = (r: Rational): string => rationalForm(r).text;

/** "subtracts 2 to get 2, then squares it to get 4": the steps of an evaluation in a sentence. */
export function stepsSentence(e: Evaluation): string {
  const words = (op: Op): string => {
    switch (op.op) {
      case 'add': return op.c.num < 0n ? `subtracts ${rationalForm({ num: -op.c.num, den: op.c.den }).text}` : `adds ${rationalForm(op.c).text}`;
      case 'mul': return `multiplies by ${rationalForm(op.c).text}`;
      case 'square': return 'squares it';
      case 'sqrt': return 'takes the square root';
      case 'recip': return 'takes the reciprocal';
      case 'abs': return 'takes the absolute value';
    }
  };
  const parts: string[] = [];
  for (const r of e.rows) {
    if (r.after.kind === 'undefined') break;
    parts.push(`${words(r.op)} to get ${numText(r.after)}`);
  }
  return parts.join(', then ');
}

// ---------------------------------------------------------------------------------------------- formulas
/** Wrap an expression the way the next operation needs it: square, add and multiply parenthesise a compound argument. */
const wrapFor = (op: Op, inner: string, compound: boolean): string => (compound && (op.op === 'square' || op.op === 'add' || op.op === 'mul') ? `\\left(${inner}\\right)` : inner);

/**
 * E₀ = o_n(…o_1(v₀)), E₁ = o_n(…o_2(v₁)), … , Eₙ = vₙ: the machine's substitution, one finished operation per step. Stops at the first refusal.
 */
export function substitutionChain(ops: readonly Op[], e: Evaluation): string[] {
  const values: Num[] = [e.input, ...e.rows.map(r => r.after)];
  const chain: string[] = [];
  const refusal = e.rows.findIndex(r => r.after.kind === 'undefined');
  const last = refusal < 0 ? ops.length : refusal; // index of the last k with a defined E_k we can write
  for (let k = 0; k <= last; k++) {
    const needsParens = k < ops.length && (ops[k]!.op === 'square' || ops[k]!.op === 'add' || ops[k]!.op === 'mul');
    let expr = k === ops.length ? numTex(values[k]!) : needsParens ? numBaseTex(values[k]!) : numTex(values[k]!);
    let compound = false;
    for (let j = k; j < ops.length; j++) {
      expr = opApplyTex(ops[j]!, wrapFor(ops[j]!, expr, compound));
      compound = true;
    }
    if (chain[chain.length - 1] !== expr) chain.push(expr); // \sqrt{5} then the value \sqrt{5}: one line, not two
  }
  if (refusal >= 0) chain.push('\\text{undefined}');
  return chain;
}

export function functionFormulas(d: FunctionDerived): string[] {
  const { rule, a } = d.state;
  const chain = substitutionChain(d.ops, d.evaluation);
  const lines = chain.map((tex, i) => (i === 0 ? `f\\left(${numTex(d.evaluation.input)}\\right)&=${tex}` : `&=${tex}`));
  return [aligned([`f(x)&=${ruleTex(rule, a)}`]), aligned(lines)];
}
export const FUNCTION_FORMULA_LABELS = Object.freeze(['The rule', 'The rule at this input']);

// ---------------------------------------------------------------------------------------------- inspector
export function functionRows(d: FunctionDerived): InspectorRowData[] {
  const { rule, a, x } = d.state;
  const rows: InspectorRowData[] = [
    { id: 'a', role: 'ink', symbolTex: 'a', name: paramName(rule), description: describeGiven(a), secondary: true },
    { id: 'x', role: 'x', symbolTex: 'x', name: 'input', description: describeGiven(x) },
  ];
  d.evaluation.rows.forEach((r, i) => {
    rows.push({ id: `step-${i + 1}`, role: 'derived', symbolTex: `u_{${i + 1}}`, name: `after step ${i + 1}: ${opWords(r.op)}`, description: describeNum(r.after), secondary: true });
  });
  const defined = d.output.kind !== 'undefined';
  rows.push({ id: 'y', role: defined ? 'y' : 'caution', symbolTex: 'f(x)', name: 'output', description: describeNum(d.output) });
  rows.push({ id: 'domain', role: 'ink', symbolTex: '\\text{domain}', name: 'every input the machine accepts', description: statement(setText(d.domain), setTex(d.domain), setSpoken(d.domain)) });
  rows.push({ id: 'image', role: 'ink', symbolTex: '\\text{image}', name: 'every output it can give', description: statement(setText(d.image), setTex(d.image), setSpoken(d.image)) });
  rows.push({
    id: 'injective', role: 'ink', symbolTex: '\\text{1-1}', name: 'one-to-one: different inputs always give different outputs?',
    description: statement(d.injective ? 'yes' : 'no', d.injective ? '\\text{yes}' : '\\text{no}', d.injective ? 'yes: no two inputs share an output' : 'no: some outputs come from two inputs or more'),
  });
  return rows;
}

// ---------------------------------------------------------------------------------------------- verdict, label, description, speech
export function functionVerdict(d: FunctionDerived): string {
  const x = xText(d.xRational);
  const f = ruleText(d.state.rule, d.state.a);
  const refusal = firstRefusal(d.evaluation);
  if (refusal) {
    const done = stepsSentence({ ...d.evaluation, rows: d.evaluation.rows.slice(0, refusal.index) });
    const start = done ? `First it ${done}. ` : '';
    return `At x = ${x} the machine refuses. ${start}It cannot ${cannot(refusal.op)} ${numText(refusal.before)}. ${refusal.reason} So ${x} is not in the domain ${setText(d.domain)}, f(${x}) does not exist and the graph has no point above it.`;
  }
  const steps = stepsSentence(d.evaluation);
  const scene = functionScene(d);
  const off = scene.clamped ? ' This output is off the edge of the graph, so the marker waits at the border.' : '';
  return `With f(x) = ${f}, the machine takes x = ${x} and ${steps}. The output is f(${x}) = ${numText(d.output)}: exactly one output for this one input.${off}`;
}
export const functionIsCaution = (d: FunctionDerived): boolean => d.output.kind === 'undefined';

export function functionLabel(d: FunctionDerived): string {
  const x = rationalForm(d.xRational).spoken;
  return d.output.kind === 'undefined'
    ? `Input point, x equals ${x}. The machine refuses this input, so the marker sits on the x-axis.`
    : `Input point, x equals ${x}, on the graph. The output is ${numSpoken(d.output)}.`;
}

export function functionSpoken(d: FunctionDerived): string {
  const x = rationalForm(d.xRational).spoken;
  return d.output.kind === 'undefined' ? `x equals ${x}. The machine refuses this input: it is not in the domain.` : `x equals ${x}. f of x equals ${numSpoken(d.output)}.`;
}

export function functionDescription(d: FunctionDerived): string {
  const f = ruleSpoken(d.state.rule, d.state.a);
  const x = rationalForm(d.xRational).spoken;
  const where = d.output.kind === 'undefined'
    ? `At x equal to ${x} the machine has no output, so the marker rests on the x-axis and the curve has no point above it.`
    : `The marker at x equal to ${x} has height ${numSpoken(d.output)}.`;
  return `A graph of y equals ${f}, drawn as a curve over the x-axis. The inputs the machine accepts are ${setSpoken(d.domain)}; the outputs it can give are ${setSpoken(d.image)}. ${where}`;
}

// ---------------------------------------------------------------------------------------------- the table of inputs and outputs
export const TABLE_INPUTS: readonly number[] = Object.freeze([-3, -2, -1, 0, 1, 2, 3]);
export interface TableRow { readonly x: Rational; readonly y: Num; readonly current: boolean }
/** Seven fixed inputs and the current one (inserted in order, marked). */
export function functionTable(state: FunctionState): TableRow[] {
  const d = deriveFunction(state);
  const rows: TableRow[] = [];
  const fixed = TABLE_INPUTS.map(n => int(n));
  const all = [...fixed.filter(r => toNumber(r) !== toNumber(d.xRational)), d.xRational].sort((p, q) => toNumber(p) - toNumber(q));
  const ops = d.ops;
  for (const x of all) rows.push({ x, y: evaluate(ops, x).output, current: toNumber(x) === toNumber(d.xRational) });
  return rows;
}
