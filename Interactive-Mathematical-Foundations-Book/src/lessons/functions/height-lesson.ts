/**
 * Lesson views for the domain / image stage of I.5: a horizontal line y = h is dragged up and down across the graph. Where it meets the graph,
 * those x are the INPUTS that give the output h. The set of x the machine accepts is highlighted on the x-axis (the domain) and the set of heights
 * the line can meet the graph at is highlighted on the y-axis (the image).
 *
 *   HeightDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 */
import { rationalForm } from '../../math/quantity/exactform';
import { div, int, mul, sign, toNumber } from '../../math/quantity/rational';
import { sumValue, type RadicalSum } from '../../math/algebra/extraneous';
import type { HeightDerived, HeightState } from '../../math/functions/rule';
import { exactNum } from '../../math/functions/value';
import type { ParamSpec } from '../../platform/params';
import type { Point } from '../../platform/geometry/viewport';
import type { InspectorRowData } from '../../ui/Inspector';
import { aligned } from '../shared/format';
import { describeGiven, rationalTex, statement } from '../quantities/values';
import { shiftTex } from '../algebra/format';
import { FUNCTION_WINDOW } from './function-lesson';
import { describeNum, paramName, ruleSpoken, ruleTex, ruleText, setSpoken, setText, setTex, sumForm } from './format';

export const CANONICAL_HEIGHT: HeightState = Object.freeze({ rule: 'shift', a: 2, h: 4 });
export const HEIGHT_WINDOW = FUNCTION_WINDOW;
/** The handle of the line sits near the right edge of the window and only moves up and down. */
export const HANDLE_X = 7;
export const HANDLE_X_SPEC: ParamSpec = { id: 'hx', name: 'handle position', symbolTex: 'x', symbolText: 'x', domain: { min: HANDLE_X, max: HANDLE_X }, default: HANDLE_X, step: 1, maxDecimals: 0, onInvalid: 'reject' };
export const H_SPEC: ParamSpec = {
  id: 'h', name: 'height of the line', symbolTex: 'h', symbolText: 'h', domain: { min: -6, max: 6 }, default: CANONICAL_HEIGHT.h, step: 0.5, maxDecimals: 2, onInvalid: 'reject',
};

export interface HeightPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: HeightState }
const preset = (id: string, label: string, aria: string, state: HeightState): HeightPreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const HEIGHT_PRESETS: readonly HeightPreset[] = Object.freeze([
  preset('h-two', '(x − 2)² = 4', 'the square of x minus 2, with the line at height 4: two inputs', { rule: 'shift', a: 2, h: 4 }),
  preset('h-one', '(x − 2)² = 0', 'the square of x minus 2, with the line at height 0: exactly one input', { rule: 'shift', a: 2, h: 0 }),
  preset('h-none', '(x − 2)² = −1', 'the square of x minus 2, with the line at height minus 1: no input', { rule: 'shift', a: 2, h: -1 }),
  preset('h-line', '2x = 3', 'twice x, with the line at height 3: exactly one input, and every height has one', { rule: 'line', a: 2, h: 3 }),
  preset('h-pole', '1/(x − 2) = 0', 'one over x minus 2, with the line at height 0: no input, because 1 divided by anything is never 0', { rule: 'pole', a: 2, h: 0 }),
  preset('h-root', '√(x + 3) = 2', 'the square root of x plus 3, with the line at height 2: one input', { rule: 'root', a: 3, h: 2 }),
]);

// ---------------------------------------------------------------------------------------------- scene
export interface HeightScene {
  /** The handle of the line, always at x = HANDLE_X. */
  readonly handle: Point;
  /** Where the line meets the graph, in world units; `inside` is false when the point is beyond the window. */
  readonly meets: readonly { readonly x: number; readonly y: number; readonly inside: boolean }[];
}
export function heightScene(d: HeightDerived): HeightScene {
  const h = toNumber(d.hRational);
  const { xMin, xMax } = HEIGHT_WINDOW;
  const meets = d.preimage.kind === 'points' ? d.preimage.xs.map(s => { const x = sumValue(s); return { x, y: h, inside: x >= xMin && x <= xMax }; }) : [];
  return { handle: { x: HANDLE_X, y: h }, meets };
}

// ---------------------------------------------------------------------------------------------- the inputs, in words
const pointForm = (s: RadicalSum) => sumForm(s);
const NTH = ['x₁', 'x₂'] as const;

export function countStatement(d: HeightDerived) {
  const c = d.count;
  if (c === 'all') return statement('every input', '\\text{every input}', 'every input gives this output');
  if (c === 0) return statement('no input', '\\text{none}', 'no input gives this output');
  return statement(c === 1 ? 'one input' : `${c} inputs`, c === 1 ? '\\text{one input}' : `\\text{${c} inputs}`, c === 1 ? 'exactly one input gives this output' : `${c} different inputs give this output`);
}

export function heightRows(d: HeightDerived): InspectorRowData[] {
  const { rule, a, h } = d.state;
  const rows: InspectorRowData[] = [
    { id: 'a', role: 'ink', symbolTex: 'a', name: paramName(rule), description: describeGiven(a), secondary: true },
    { id: 'h', role: 'y', symbolTex: 'h', name: 'height of the line (an output)', description: describeGiven(h) },
    { id: 'count', role: d.count === 0 ? 'caution' : 'primary', symbolTex: '\\#', name: 'how many inputs x give f(x) = h', description: countStatement(d) },
  ];
  if (d.preimage.kind === 'points') {
    d.preimage.xs.forEach((s, i) => {
      rows.push({ id: `x-${i + 1}`, role: 'x', symbolTex: `x_{${i + 1}}`, name: `input ${i + 1}`, description: describeNum(exactNum(s)) });
    });
  }
  rows.push({ id: 'domain', role: 'ink', symbolTex: '\\text{domain}', name: 'every input the machine accepts', description: statement(setText(d.domain), setTex(d.domain), setSpoken(d.domain)) });
  rows.push({ id: 'image', role: 'ink', symbolTex: '\\text{image}', name: 'every output it can give', description: statement(setText(d.image), setTex(d.image), setSpoken(d.image)) });
  rows.push({
    id: 'injective', role: 'ink', symbolTex: '\\text{1-1}', name: 'one-to-one: different inputs always give different outputs?',
    description: statement(d.injective ? 'yes' : 'no', d.injective ? '\\text{yes}' : '\\text{no}', d.injective ? 'yes' : 'no'),
  });
  rows.push({
    id: 'onto', role: 'ink', symbolTex: '\\text{onto }\\R', name: 'every real number is an output?',
    description: statement(d.onto ? 'yes' : 'no', d.onto ? '\\text{yes}' : '\\text{no}', d.onto ? 'yes: every real number is an output' : 'no: some real number is never an output'),
  });
  return rows;
}

// ---------------------------------------------------------------------------------------------- formulas
const hTex = (d: HeightDerived): string => rationalForm(d.hRational).tex;
const hBase = (d: HeightDerived): string => (sign(d.hRational) < 0 ? `\\left(${hTex(d)}\\right)` : hTex(d));
const pointsTex = (d: HeightDerived): string => (d.preimage.kind === 'points'
  ? d.preimage.xs.map((s, i) => `x_{${i + 1}}=${pointForm(s).tex}`).join(',\\ \\ ')
  : '');

/** The equation f(x) = h, solved the way a person solves it, with the numbers of the stage. The first line is the equation itself. */
export function solveFormulas(d: HeightDerived): string[] {
  const { rule, a } = d.state;
  const h = d.hRational;
  const H = hTex(d);
  const s = sign(h);
  const lines: string[] = [`${ruleTex(rule, a)}=${H}`];
  const never = (why: string) => lines.push(`\\text{${why}, so no real }x\\text{ works}`);
  const found = () => lines.push(pointsTex(d));
  const constant = () => lines.push(s === 0 ? '0=0\\ \\text{ for every }x' : `0=${H}\\ \\text{ is false for every }x`);
  switch (rule) {
    case 'line':
      if (a === 0) constant();
      else { lines.push(`x=\\frac{${H}}{${a}}`); found(); }
      break;
    case 'stretch': {
      if (a === 0) { constant(); break; }
      const t = div(h, int(a));
      lines.push(`x^{2}=\\frac{${H}}{${a}}=${rationalTex(t)}`);
      if (sign(t) < 0) never('a square is never negative');
      else { lines.push(sign(t) === 0 ? 'x=0' : `x=\\pm\\sqrt{${rationalTex(t)}}`); found(); }
      break;
    }
    case 'shift':
      if (s < 0) never('a square is never negative');
      else { lines.push(`${shiftTex(-a)}=${s === 0 ? '0' : `\\pm\\sqrt{${H}}`}`); found(); }
      break;
    case 'abs':
      if (s < 0) never('an absolute value is never negative');
      else { lines.push(`${shiftTex(-a)}=${s === 0 ? '0' : `\\pm ${H}`}`); found(); }
      break;
    case 'root':
      if (s < 0) never('a square root is never negative');
      else { lines.push(`${shiftTex(a)}=${hBase(d)}^{2}=${rationalTex(mul(h, h))}`); found(); }
      break;
    case 'pole':
      if (s === 0) never('1 divided by a number is never 0');
      else { lines.push(`${shiftTex(-a)}=\\frac{1}{${H}}`); found(); }
      break;
  }
  return lines;
}

export function heightFormulas(d: HeightDerived): string[] {
  const solve = solveFormulas(d);
  return [
    aligned(solve.map((tex, i) => (i === 0 ? `&${tex}` : `&\\Rightarrow\\ ${tex}`))),
    aligned([`\\text{domain}&=${setTex(d.domain)}`, `\\text{image}&=${setTex(d.image)}`]),
  ];
}
export const HEIGHT_FORMULA_LABELS = Object.freeze(['Solving f(x) = h', 'The domain and the image']);

// ---------------------------------------------------------------------------------------------- verdict, speech, description
export function heightVerdict(d: HeightDerived): string {
  const { rule, a } = d.state;
  const h = rationalForm(d.hRational).text;
  const f = ruleText(rule, a);
  const notOnto = d.onto ? '' : ` The image of f is ${setText(d.image)}, not all of ℝ, so f is not onto ℝ.`;
  if (d.preimage.kind === 'all') return `f(x) = ${f} gives ${h} for EVERY x: the graph is the line y = ${h} itself. All inputs share this one output, so f is not one-to-one.`;
  if (d.preimage.kind === 'none') {
    return `The line y = ${h} never meets the graph of f(x) = ${f}: no input gives the output ${h}. ${h} is not in the image ${setText(d.image)}.${notOnto}`;
  }
  const xs = d.preimage.xs.map(s => pointForm(s).text);
  if (d.preimage.xs.length === 1) {
    return `The line y = ${h} meets the graph at exactly one point: the only input that gives ${h} is x = ${xs[0]}. ${d.injective ? 'This rule gives every output at most once, so f is one-to-one.' : 'Other heights have two inputs, so f is not one-to-one.'}${notOnto}`;
  }
  return `The line y = ${h} meets the graph at two points: the inputs ${xs.map((x, i) => `${NTH[i]} = ${x}`).join(' and ')} both give the output ${h}. A function may send two inputs to one output (never one input to two outputs), but then it is not one-to-one.${notOnto}`;
}
export const heightIsCaution = (d: HeightDerived): boolean => d.count === 0;

export function heightLabel(d: HeightDerived): string {
  return `Height of the line, h equals ${rationalForm(d.hRational).spoken}. ${d.count === 0 ? 'No input gives this output.' : d.count === 'all' ? 'Every input gives this output.' : `${d.count} ${d.count === 1 ? 'input gives' : 'inputs give'} this output.`}`;
}
export function heightSpoken(d: HeightDerived): string {
  const h = rationalForm(d.hRational).spoken;
  if (d.preimage.kind === 'none') return `h equals ${h}. No input gives this output.`;
  if (d.preimage.kind === 'all') return `h equals ${h}. Every input gives this output.`;
  return `h equals ${h}. ${d.preimage.xs.length === 1 ? 'One input' : 'Two inputs'}: ${d.preimage.xs.map(s => pointForm(s).spoken).join(' and ')}.`;
}
export function heightDescription(d: HeightDerived): string {
  const f = ruleSpoken(d.state.rule, d.state.a);
  const h = rationalForm(d.hRational).spoken;
  const hits = d.preimage.kind === 'none' ? 'The line does not meet the curve.' : d.preimage.kind === 'all' ? 'The line lies on the whole graph.' : `The line meets the curve at ${d.preimage.xs.length} ${d.preimage.xs.length === 1 ? 'point' : 'points'}.`;
  return `A graph of y equals ${f}, with a horizontal line at height ${h}. ${hits} The part of the x-axis the machine accepts is ${setSpoken(d.domain)}; the part of the y-axis it reaches is ${setSpoken(d.image)}.`;
}

