/**
 * Lesson views for the inverse stage of I.5: running a machine backwards. The graph of f and the graph of its inverse are mirror images in the
 * line y = x (swap the coordinates of every point). The square has no inverse on all of ℝ (x and −x give one output); restricted to x ≥ 0 it has one.
 *
 *   InverseDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 */
import { rationalForm } from '../../math/quantity/exactform';
import { toNumber } from '../../math/quantity/rational';
import { fnOps, restrictedDomain, type FnId, type InverseDerived, type InverseState } from '../../math/functions/compose';
import { evaluateDouble, numValue } from '../../math/functions/value';
import type { ParamSpec } from '../../platform/params';
import { sampleCurve, type Polyline } from '../../platform/geometry/curve';
import type { Point } from '../../platform/geometry/viewport';
import type { InspectorRowData } from '../../ui/Inspector';
import { aligned } from '../shared/format';
import { describeGiven, statement } from '../quantities/values';
import { describeNum, FN_LABEL, FN_SPOKEN, numSpoken, numText, numTex, setSpoken, setText, setTex } from './format';
import { COMPOSITION_WINDOW } from './composition-lesson';

export const CANONICAL_INVERSE: InverseState = Object.freeze({ fn: 'lin', x: 3, restrict: true });
export const INVERSE_WINDOW = COMPOSITION_WINDOW;
export const IX_SPEC: ParamSpec = {
  id: 'x', name: 'input x', symbolTex: 'x', symbolText: 'x', domain: { min: -6, max: 6 }, default: CANONICAL_INVERSE.x, step: 0.5, maxDecimals: 2, onInvalid: 'reject',
};

export interface InversePreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: InverseState }
const preset = (id: string, label: string, aria: string, state: InverseState): InversePreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const INVERSE_PRESETS: readonly InversePreset[] = Object.freeze([
  preset('i-lin', '2x − 1 at 3', '2x minus 1, at x equals 3: the inverse undoes it', { fn: 'lin', x: 3, restrict: true }),
  preset('i-sq', 'x² at 2, all of ℝ', 'x squared on all real numbers, at x equals 2: no inverse, because minus 2 gives the same output', { fn: 'sq', x: 2, restrict: false }),
  preset('i-sq-r', 'x² at 2, x ≥ 0 only', 'x squared restricted to x at least 0, at x equals 2: the square root undoes it', { fn: 'sq', x: 2, restrict: true }),
  preset('i-sq-out', 'x² restricted, at −2', 'x squared restricted to x at least 0, at x equals minus 2: outside the restricted domain', { fn: 'sq', x: -2, restrict: true }),
  preset('i-rt', '√x at 4', 'the square root, at x equals 4: squaring undoes it', { fn: 'rt', x: 4, restrict: true }),
  preset('i-rec', '1/x at 2', '1 over x, at x equals 2: it is its own inverse', { fn: 'rec', x: 2, restrict: true }),
]);

// ---------------------------------------------------------------------------------------------- curves (memoised on fn and the restriction)
export interface InverseCurves { readonly forward: Polyline[]; readonly mirror: Polyline[]; readonly diagonal: Polyline[] }
export function inverseCurves(fn: FnId, restrict: boolean): InverseCurves {
  const domain = restrictedDomain(fn, restrict);
  const ops = fnOps(fn);
  const allowed = (x: number): boolean => !(fn === 'sq' && restrict && x < 0) && domain.length > 0;
  const forward = sampleCurve(x => (allowed(x) ? evaluateDouble(ops, x) : null), INVERSE_WINDOW, { breaks: fn === 'rec' ? [0] : [], samples: 720 });
  // the mirror image: swap x and y of every sampled point. Its own break (a sideways pole) is the same split.
  const mirror = forward.map(line => line.map(p => ({ x: p.y, y: p.x })));
  const { xMin, xMax } = INVERSE_WINDOW;
  return { forward, mirror, diagonal: [[{ x: xMin, y: xMin }, { x: xMax, y: xMax }]] };
}

// ---------------------------------------------------------------------------------------------- scene
export interface InverseScene {
  readonly p: Point | null;
  readonly mirror: Point | null;
  readonly twin: Point | null;
  readonly twinMirror: Point | null;
  readonly clamped: boolean;
}
export function inverseScene(d: InverseDerived): InverseScene {
  const y = numValue(d.forward.output);
  const x = toNumber(d.x);
  if (y === null || !d.inDomain) return { p: null, mirror: null, twin: null, twinMirror: null, clamped: false };
  const { yMin, yMax, xMin, xMax } = INVERSE_WINDOW;
  const inside = y >= yMin && y <= yMax && y >= xMin && y <= xMax;
  const twin = d.twin ? { x: toNumber(d.twin), y } : null;
  return {
    p: { x, y }, mirror: { x: y, y: x }, twin, twinMirror: twin ? { x: y, y: twin.x } : null,
    clamped: !inside,
  };
}

// ---------------------------------------------------------------------------------------------- inspector
export function inverseRows(d: InverseDerived): InspectorRowData[] {
  const { fn, x, restrict } = d.state;
  const rows: InspectorRowData[] = [
    { id: 'x', role: 'x', symbolTex: 'x', name: 'input', description: describeGiven(x) },
  ];
  if (!d.inDomain) {
    rows.push({ id: 'y', role: 'caution', symbolTex: 'y', name: 'output', description: statement('not defined', '\\text{not defined}', 'the input is outside the domain of the restricted function', 'undefined', 'x is not in the domain of this function, so there is no output to undo.') });
  } else {
    rows.push({ id: 'y', role: 'y', symbolTex: 'y=f(x)', name: 'output', description: describeNum(d.forward.output) });
  }
  rows.push({
    id: 'has-inverse', role: d.hasInverse ? 'ink' : 'caution', symbolTex: 'f^{-1}', name: 'is there an inverse function?',
    description: d.hasInverse
      ? statement('yes', '\\text{yes}', 'yes: one input for every output')
      : statement('no', '\\text{no}', 'no: some output has two inputs', 'exact', 'x and −x give the same output, so running the machine backwards would have two answers.'),
  });
  if (d.backward) {
    rows.push({ id: 'back', role: 'primary', symbolTex: 'f^{-1}(y)', name: 'the inverse applied to the output', description: describeNum(d.backward.output) });
    rows.push({
      id: 'round-trip', role: d.roundTrip ? 'ink' : 'caution', symbolTex: 'f^{-1}(f(x))=x', name: 'the round trip returns the input',
      description: statement(d.roundTrip ? 'yes' : 'no', d.roundTrip ? '\\text{yes}' : '\\text{no}', d.roundTrip ? 'yes, exactly' : 'no'),
    });
  }
  if (d.twin) {
    rows.push({ id: 'twin', role: 'caution', symbolTex: '-x', name: 'a second input with the same output', description: describeGiven(toNumber(d.twin)) });
  }
  rows.push({ id: 'domain', role: 'ink', symbolTex: '\\text{domain}', name: fn === 'sq' && restrict ? 'domain, restricted' : 'domain of f', description: statement(setText(d.domain), setTex(d.domain), setSpoken(d.domain)) });
  rows.push({ id: 'image', role: 'ink', symbolTex: '\\text{image}', name: 'image of f (domain of the inverse)', description: statement(setText(d.image), setTex(d.image), setSpoken(d.image)) });
  return rows;
}

// ---------------------------------------------------------------------------------------------- formulas
const SOLVED: Readonly<Record<FnId, { forward: string; inverse: string }>> = Object.freeze({
  lin: { forward: 'y=2x-1', inverse: 'x=\\dfrac{y+1}{2}' },
  sq: { forward: 'y=x^{2}', inverse: 'x=\\sqrt{y}\\ \\ (x\\ge 0)' },
  rt: { forward: 'y=\\sqrt{x}', inverse: 'x=y^{2}' },
  rec: { forward: 'y=\\dfrac{1}{x}', inverse: 'x=\\dfrac{1}{y}' },
});

export function inverseFormulas(d: InverseDerived): string[] {
  const { fn, restrict } = d.state;
  const solve = fn === 'sq' && !restrict
    ? aligned([`&${SOLVED.sq.forward}`, '&x=\\pm\\sqrt{y}\\ \\text{two answers for every }y>0'])
    : aligned([`&${SOLVED[fn].forward}`, `&${SOLVED[fn].inverse}`]);
  const x = rationalForm(d.x).tex;
  let trip: string;
  if (!d.inDomain) trip = aligned([`${x}&\\notin ${setTex(d.domain)}`, '&\\text{no output to undo}']);
  else if (d.backward === null) {
    const y = numTex(d.forward.output);
    trip = aligned([`f\\left(${x}\\right)&=${y}`, `f\\left(${d.twin ? rationalForm(d.twin).tex : x}\\right)&=${y}`, '&\\text{one output, two inputs}']);
  } else {
    const y = numTex(d.forward.output);
    trip = aligned([`f\\left(${x}\\right)&=${y}`, `f^{-1}\\left(${y}\\right)&=${numTex(d.backward.output)}`]);
  }
  return [solve, trip];
}
export const INVERSE_FORMULA_LABELS = Object.freeze(['Solving y = f(x) for x', 'The round trip at this input']);

// ---------------------------------------------------------------------------------------------- verdict, speech, description
export function inverseVerdict(d: InverseDerived): string {
  const { fn, restrict } = d.state;
  const x = rationalForm(d.x).text;
  if (!d.inDomain) return `x = ${x} is not in the domain ${setText(d.domain)} of ${FN_LABEL[fn]}${fn === 'sq' ? ' restricted to x ≥ 0' : ''}, so there is no output y to run backwards from.`;
  const y = numText(d.forward.output);
  if (!d.hasInverse) {
    return `${FN_LABEL[fn]} sends both ${x} and ${d.twin ? rationalForm(d.twin).text : x} to ${y}. An inverse would have to take ${y} back to both of them, and a function gives only one output, so there is no inverse on all of ℝ. Restrict the inputs to x ≥ 0 and the square root works.`;
  }
  const back = d.backward ? numText(d.backward.output) : '';
  return `f(${x}) = ${y}, and the inverse sends ${y} back to ${back}. ${d.roundTrip ? `The round trip f⁻¹(f(x)) returns x = ${x} exactly.` : 'The round trip does not return the input.'} On the graph, (${x}, ${y}) and (${y}, ${x}) are mirror images in the line y = x${fn === 'sq' && restrict ? ', and the restriction x ≥ 0 is what makes the mirror image a function' : ''}.`;
}
export const inverseIsCaution = (d: InverseDerived): boolean => !d.inDomain || !d.hasInverse;

export function inverseSpoken(d: InverseDerived): string {
  const x = rationalForm(d.x).spoken;
  if (!d.inDomain) return `x equals ${x}: outside the domain.`;
  if (!d.hasInverse) return `x equals ${x}. No inverse: ${d.twin ? rationalForm(d.twin).spoken : x} gives the same output.`;
  return `x equals ${x}. f of x is ${numSpoken(d.forward.output)}. The inverse returns ${d.backward ? numSpoken(d.backward.output) : ''}.`;
}

export function inverseDescription(d: InverseDerived): string {
  const { fn, restrict } = d.state;
  const mirror = fn === 'sq' && !restrict ? 'The mirror image is a parabola lying on its side, which fails the vertical line test: it is not the graph of a function.' : 'The mirror image of the curve in the dashed line y equals x is the graph of the inverse.';
  const pts = d.inDomain && d.forward.output.kind !== 'undefined' ? ` The point x equal to ${rationalForm(d.x).spoken}, y equal to ${numSpoken(d.forward.output)} and its mirror image are marked.` : ' The input is outside the domain, so no point is marked.';
  return `A graph of y equals ${FN_SPOKEN[fn]}${fn === 'sq' && restrict ? ' for x at least 0' : ''}, the dashed line y equals x, and the mirror image of the curve in that line. ${mirror}${pts}`;
}
