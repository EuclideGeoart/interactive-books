/**
 * Lesson views for the composition stage of I.5: two machines wired one after the other, in both orders. f ∘ g means "g first, then f".
 * The graph shows both composites and the two outputs at the chosen x; the domain of each composite is drawn on a number line.
 *
 *   CompositionDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 */
import { rationalForm } from '../../math/quantity/exactform';
import { toNumber } from '../../math/quantity/rational';
import { composeOps, fnOps, type CompositionDerived, type CompositionState, type FnId } from '../../math/functions/compose';
import { evaluateDouble, numValue, type Evaluation } from '../../math/functions/value';
import type { ParamSpec } from '../../platform/params';
import { sampleCurve, type Polyline } from '../../platform/geometry/curve';
import type { Point } from '../../platform/geometry/viewport';
import type { InspectorRowData } from '../../ui/Inspector';
import { aligned } from '../shared/format';
import { describeGiven, statement } from '../quantities/values';
import { describeNum, FN_LABEL, FN_SPOKEN, FN_TEX, fnApplyTex, numSpoken, numText, numTex, setSpoken, setText, setTex } from './format';
import { firstRefusal, cannot } from './function-lesson';

export const CANONICAL_COMPOSITION: CompositionState = Object.freeze({ f: 'sq', g: 'lin', x: 0 });
export const COMPOSITION_WINDOW = Object.freeze({ xMin: -6, xMax: 6, yMin: -6, yMax: 6 });
export const CX_SPEC: ParamSpec = {
  id: 'x', name: 'input x', symbolTex: 'x', symbolText: 'x', domain: { min: -6, max: 6 }, default: CANONICAL_COMPOSITION.x, step: 0.5, maxDecimals: 2, onInvalid: 'reject',
};

export interface CompositionPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: CompositionState }
const preset = (id: string, label: string, aria: string, state: CompositionState): CompositionPreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const COMPOSITION_PRESETS: readonly CompositionPreset[] = Object.freeze([
  preset('c-order', 'x² after 2x − 1, at 0', 'f is x squared and g is 2x minus 1, at x equals 0: the two orders give 1 and minus 1', { f: 'sq', g: 'lin', x: 0 }),
  preset('c-agree', 'x² after 2x − 1, at 1', 'f is x squared and g is 2x minus 1, at x equals 1: the two orders happen to agree', { f: 'sq', g: 'lin', x: 1 }),
  preset('c-refuse', '√x after 2x − 1, at 0', 'f is the square root and g is 2x minus 1, at x equals 0: one order refuses', { f: 'rt', g: 'lin', x: 0 }),
  preset('c-recip', '1/x after 2x − 1, at ½', 'f is 1 over x and g is 2x minus 1, at x equals one half: g gives 0 and f cannot divide by it', { f: 'rec', g: 'lin', x: 0.5 }),
  preset('c-radical', '2x − 1 after √x, at 3', 'f is 2x minus 1 and g is the square root, at x equals 3: the output is not a rational number', { f: 'lin', g: 'rt', x: 3 }),
  preset('c-undo', '1/x after 1/x, at 4', 'f and g are both 1 over x, at x equals 4: each undoes the other', { f: 'rec', g: 'rec', x: 4 }),
]);

// ---------------------------------------------------------------------------------------------- scene (curves memoised on f and g)
export interface CompositionCurves { readonly fg: Polyline[]; readonly gf: Polyline[] }
/** Where  outer(inner(x))  has a pole: 1/x after 2x − 1 divides by zero at ½; 1/x after the other three (or before anything) at 0. */
export function compositeBreaks(outer: FnId, inner: FnId): number[] {
  if (outer === 'rec') return inner === 'lin' ? [0.5] : [0];
  if (inner === 'rec') return [0];
  return [];
}
export function compositionCurves(f: FnId, g: FnId): CompositionCurves {
  const make = (outer: FnId, inner: FnId): Polyline[] => {
    const ops = composeOps(outer, inner);
    return sampleCurve(x => evaluateDouble(ops, x), COMPOSITION_WINDOW, { breaks: compositeBreaks(outer, inner), samples: 720 });
  };
  return { fg: make(f, g), gf: make(g, f) };
}

export interface CompositionScene {
  readonly fg: Point | null;
  readonly gf: Point | null;
  readonly fgClamped: boolean;
  readonly gfClamped: boolean;
  readonly x: number;
}
export function compositionScene(d: CompositionDerived): CompositionScene {
  const x = toNumber(d.x);
  const { yMin, yMax } = COMPOSITION_WINDOW;
  const place = (e: Evaluation): { p: Point | null; clamped: boolean } => {
    const y = numValue(e.output);
    if (y === null) return { p: null, clamped: false };
    const c = Math.max(yMin, Math.min(yMax, y));
    return { p: { x, y: c }, clamped: c !== y };
  };
  const a = place(d.fg);
  const b = place(d.gf);
  return { fg: a.p, gf: b.p, fgClamped: a.clamped, gfClamped: b.clamped, x };
}

// ---------------------------------------------------------------------------------------------- the tags above the pipeline boxes
/** Tags for the values of the f ∘ g pipeline: input, g(x) (after the last operation of g), output. */
export function tagsFor(outer: FnId, inner: FnId, outerName: string, innerName: string): string[] {
  const nInner = fnOps(inner).length;
  const nTotal = nInner + fnOps(outer).length;
  const tags: string[] = new Array(nTotal + 1).fill('');
  tags[0] = 'input x';
  tags[nInner] = `${innerName}(x)`;
  tags[nTotal] = `${outerName}(${innerName}(x))`;
  return tags;
}

// ---------------------------------------------------------------------------------------------- inspector
export function compositionRows(d: CompositionDerived): InspectorRowData[] {
  const innerG = d.fg.rows[fnOps(d.state.g).length - 1]!.after;
  const innerF = d.gf.rows[fnOps(d.state.f).length - 1]!.after;
  const rows: InspectorRowData[] = [
    { id: 'x', role: 'x', symbolTex: 'x', name: 'input', description: describeGiven(d.state.x) },
    { id: 'g-of-x', role: 'derived', symbolTex: 'g(x)', name: `g first: ${FN_LABEL[d.state.g]}`, description: describeNum(innerG), secondary: true },
    { id: 'fg', role: d.fgDefined ? 'primary' : 'caution', symbolTex: 'f(g(x))', name: 'f ∘ g: g first, then f', description: describeNum(d.fg.output) },
    { id: 'f-of-x', role: 'derived', symbolTex: 'f(x)', name: `f first: ${FN_LABEL[d.state.f]}`, description: describeNum(innerF), secondary: true },
    { id: 'gf', role: d.gfDefined ? 'y' : 'caution', symbolTex: 'g(f(x))', name: 'g ∘ f: f first, then g', description: describeNum(d.gf.output) },
    { id: 'dom-fg', role: 'ink', symbolTex: '\\text{dom}(f\\circ g)', name: 'inputs the composite f ∘ g accepts', description: statement(setText(d.fgDomain), setTex(d.fgDomain), setSpoken(d.fgDomain)) },
    { id: 'dom-gf', role: 'ink', symbolTex: '\\text{dom}(g\\circ f)', name: 'inputs the composite g ∘ f accepts', description: statement(setText(d.gfDomain), setTex(d.gfDomain), setSpoken(d.gfDomain)) },
  ];
  return rows;
}

// ---------------------------------------------------------------------------------------------- formulas
export function compositionFormulas(d: CompositionDerived): string[] {
  const { f, g } = d.state;
  const symbolic = aligned([
    `f(x)&=${FN_TEX[f]},\\quad g(x)=${FN_TEX[g]}`,
    `f(g(x))&=${fnApplyTex(f, FN_TEX[g])}`,
    `g(f(x))&=${fnApplyTex(g, FN_TEX[f])}`,
  ]);
  const x = rationalForm(d.x).tex;
  const gx = d.fg.rows[fnOps(g).length - 1]!.after;
  const fx = d.gf.rows[fnOps(f).length - 1]!.after;
  const line = (outer: string, inner: string, mid: typeof gx, out: typeof d.fg.output): string => (mid.kind === 'undefined'
    ? `${outer}\\left(${inner}\\left(${x}\\right)\\right)&=${outer}\\left(\\text{undefined}\\right)`
    : out.kind === 'undefined'
      ? `${outer}\\left(${inner}\\left(${x}\\right)\\right)&=${outer}\\left(${numTex(mid)}\\right)=\\text{undefined}`
      : `${outer}\\left(${inner}\\left(${x}\\right)\\right)&=${outer}\\left(${numTex(mid)}\\right)=${numTex(out)}`);
  const numeric = aligned([line('f', 'g', gx, d.fg.output), line('g', 'f', fx, d.gf.output)]);
  return [symbolic, numeric];
}
export const COMPOSITION_FORMULA_LABELS = Object.freeze(['The composites as formulas', 'The composites at this input']);

// ---------------------------------------------------------------------------------------------- verdict, speech, description
function refusalSentence(e: Evaluation, order: string): string {
  const r = firstRefusal(e);
  if (!r) return '';
  return `${order} refuses: it cannot ${cannot(r.op)} ${numText(r.before)}.`;
}

export function compositionVerdict(d: CompositionDerived): string {
  const x = rationalForm(d.x).text;
  const fg = numText(d.fg.output);
  const gf = numText(d.gf.output);
  if (d.fgDefined && d.gfDefined) {
    if (d.sameValue) {
      return `At x = ${x} both orders give ${fg}. That is a coincidence of this one input, not a law: composition is not commutative in general, so test another x before trusting it.`;
    }
    return `At x = ${x}, f(g(x)) = ${fg} but g(f(x)) = ${gf}. The order matters: f ∘ g sends x through g first, g ∘ f through f first. These are different machines.`;
  }
  if (!d.fgDefined && !d.gfDefined) {
    return `At x = ${x} both orders fail. ${refusalSentence(d.fg, 'f ∘ g')} ${refusalSentence(d.gf, 'g ∘ f')} x is outside both composite domains.`;
  }
  const bad = d.fgDefined ? 'g ∘ f' : 'f ∘ g';
  const badEval = d.fgDefined ? d.gf : d.fg;
  const goodValue = d.fgDefined ? fg : gf;
  const good = d.fgDefined ? 'f ∘ g' : 'g ∘ f';
  return `At x = ${x} one order works and the other fails. ${good} gives ${goodValue}. ${refusalSentence(badEval, bad)} The composite domain is smaller than the domain of its first machine whenever the second machine cannot accept some of what the first one produces.`;
}
export const compositionIsCaution = (d: CompositionDerived): boolean => !d.fgDefined || !d.gfDefined || !d.sameValue;

export function compositionSpoken(d: CompositionDerived): string {
  const x = rationalForm(d.x).spoken;
  return `x equals ${x}. f of g of x is ${numSpoken(d.fg.output)}. g of f of x is ${numSpoken(d.gf.output)}.`;
}

export function compositionDescription(d: CompositionDerived): string {
  const { f, g } = d.state;
  return `A graph with two curves: y equals f of g of x, which is ${FN_SPOKEN[f]} applied after ${FN_SPOKEN[g]}, and y equals g of f of x, the other order. At x equal to ${rationalForm(d.x).spoken} the heights are ${numSpoken(d.fg.output)} and ${numSpoken(d.gf.output)}.`;
}

export function domainLineDescription(name: string, set: CompositionDerived['fgDomain']): string {
  return `${name} accepts ${setSpoken(set)}.`;
}

