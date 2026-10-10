/**
 * Lesson views for n-th roots as intersections: where the horizontal line y = A meets the curve y = xⁿ.
 *
 *   NthRootDerived  →  { inspector rows, formulas, verdict, curve and markers in world coordinates, spoken text }
 *
 * The roots, the number of solutions and the exactness all come from `math/quantity/nthroot.ts` and `root.ts`; this file draws and words them.
 */
import { rationalForm, rootForm, radicalOfTex } from '../../math/quantity/exactform';
import type { NthRootDerived, NthRootState } from '../../math/quantity/nthroot';
import { rootName } from '../../math/quantity/root';
import { sampleCurve, type Polyline } from '../../platform/geometry/curve';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import { formatApprox } from '../../platform/numeric/format';
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { FORMULA_FORMAT, SPOKEN_FORMAT, aligned } from '../shared/format';
import { describeGiven, describeRational, describeRoot, rationalTex, statement } from './values';
import type { ValueDescription } from '../../platform/numeric/quantity';

export const A_LIMIT = 8;
export const CANONICAL_ROOT: NthRootState = Object.freeze({ A: 2, n: 2 });
export const ROOTS_WINDOW: WorldWindow = { xMin: -8.5, xMax: 8.5, yMin: -8.5, yMax: 8.5 };
export const ROOT_A_SPEC: ParamSpec = { id: 'A', name: 'value A', symbolTex: 'A', symbolText: 'A', domain: { min: -A_LIMIT, max: A_LIMIT }, default: 2, step: 0.5, maxDecimals: 2, onInvalid: 'reject' };
export const HANDLE_X_SPEC: ParamSpec = { id: 'x', name: 'x', symbolTex: 'x', symbolText: 'x', domain: { min: 0, max: 0 }, default: 0, step: 1, onInvalid: 'reject' };
export const INDEX_OPTIONS = [{ id: '2', label: '2' }, { id: '3', label: '3' }, { id: '4', label: '4' }, { id: '5', label: '5' }] as const;

export interface RootPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: NthRootState }
const preset = (id: string, label: string, aria: string, state: NthRootState): RootPreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const ROOT_PRESETS: readonly RootPreset[] = Object.freeze([
  preset('sqrt2', '√2', 'square root of 2', { A: 2, n: 2 }),
  preset('sqrt8', '√8', 'square root of 8', { A: 8, n: 2 }),
  preset('sqrt-half', '√0.5', 'square root of 0.5', { A: 0.5, n: 2 }),
  preset('sqrt1.44', '√1.44', 'square root of 1.44', { A: 1.44, n: 2 }),
  preset('sqrt-neg', '√(−4)', 'square root of minus 4', { A: -4, n: 2 }),
  preset('cbrt8', '∛8', 'cube root of 8', { A: 8, n: 3 }),
  preset('cbrt-8', '∛(−8)', 'cube root of minus 8', { A: -8, n: 3 }),
  preset('fourth-8', '∜8', 'fourth root of 8', { A: 8, n: 4 }),
  preset('fifth-neg', '⁵√(−1)', 'fifth root of minus 1', { A: -1, n: 5 }),
]);

/** The graph of y = xⁿ across the window. Depends on n and the window only: callers memoise it on n, never on the moving A. */
export function powerCurve(n: number): Polyline[] {
  return sampleCurve(x => Math.pow(x, n), { xMin: ROOTS_WINDOW.xMin, xMax: ROOTS_WINDOW.xMax, yMin: ROOTS_WINDOW.yMin, yMax: ROOTS_WINDOW.yMax }, { samples: 400 });
}

// ---------------------------------------------------------------------------------------------- scene
export interface RootsScene {
  readonly levelLine: { readonly from: Point; readonly to: Point };
  readonly handle: Point;
  readonly markers: readonly { readonly at: Point; readonly foot: Point; readonly label: string; readonly negative: boolean }[];
}
export function rootsScene(d: NthRootDerived, state: NthRootState): RootsScene {
  const text = d.result.kind === 'exact' ? rootForm(d.result.root).text : d.result.kind === 'numeric' ? `≈ ${formatApprox(d.result.approx, SPOKEN_FORMAT).text}` : '';
  const markers = d.solutionPositions.map(x => {
    const negative = d.solutions === 2 && x < 0;
    return { at: { x, y: state.A }, foot: { x, y: 0 }, label: negative ? `−${text}` : text, negative };
  });
  return { levelLine: { from: { x: ROOTS_WINDOW.xMin, y: state.A }, to: { x: ROOTS_WINDOW.xMax, y: state.A } }, handle: { x: 0, y: state.A }, markers };
}

// ---------------------------------------------------------------------------------------------- inspector
export function rootsRows(d: NthRootDerived, state: NthRootState): InspectorRowData[] {
  const radical = radicalOfTex(d.n, 'A');
  const back: ValueDescription = d.powerBack
    ? describeRational(d.powerBack)
    : d.result.kind === 'undefined' ? describeRoot(d.result) : statement('not computed', '\\text{not computed}', 'not computed', 'undefined', 'The exact form was not attempted for a number this large.');
  return [
    { id: 'A', role: 'x', symbolTex: 'A', name: 'the value', description: describeGiven(state.A) },
    { id: 'root', role: 'derived', symbolTex: radical, name: d.n === 2 ? 'square root' : rootName(d.n), description: describeRoot(d.result) },
    { id: 'power-back', role: 'primary', symbolTex: `\\left(${radical}\\right)^{${d.n}}`, name: 'the root, raised to the power again', description: back },
    { id: 'solutions', role: 'y', symbolTex: `x^{${d.n}}=A`, name: 'real solutions x', description: solutionsDescription(d) },
  ];
}

function solutionsDescription(d: NthRootDerived): ValueDescription {
  if (d.solutions === 0) return statement('none', '\\text{none}', 'no real solution', 'undefined', `An even power is never negative, so xⁿ = A has no real solution when n is even and A is negative.`);
  if (d.result.kind === 'undefined') return statement('none', '\\text{none}', 'none', 'undefined');
  if (d.solutions === 1) {
    const exact = d.result.kind === 'exact' ? rootForm(d.result.root) : null;
    return exact ? statement(exact.text, exact.tex, `exactly one: ${exact.spoken}`) : { status: 'approximate', lines: [{ relation: '≈', text: formatApprox(d.result.approx, FORMULA_FORMAT).text, tex: formatApprox(d.result.approx, FORMULA_FORMAT).tex }], spoken: 'one real solution' };
  }
  if (d.result.kind === 'exact') {
    const f = rootForm(d.result.root);
    return statement(`±${f.text}`, `\\pm ${f.tex}`, `plus or minus ${f.spoken}`);
  }
  const approx = formatApprox(d.result.approx, FORMULA_FORMAT);
  return { status: 'approximate', lines: [{ relation: '≈', text: `±${approx.text}`, tex: `\\pm ${approx.tex}` }], spoken: 'plus or minus the root' };
}

// ---------------------------------------------------------------------------------------------- formulas
export function rootsFormulas(d: NthRootDerived): string[] {
  const A = rationalTex(d.A);
  const n = d.n;
  const sym = radicalOfTex(n, 'A');
  const lines: string[] = [`${sym}&=${radicalOfTex(n, A)}`];
  if (d.result.kind === 'undefined') lines.push(`&\\text{no real value}`);
  else if (d.result.kind === 'numeric') lines.push(`&\\approx ${formatApprox(d.result.approx, FORMULA_FORMAT).tex}`);
  else {
    const exact = rootForm(d.result.root);
    lines.push(`&=${exact.tex}`);
    if (!exact.integer) lines.push(`&\\approx ${formatApprox(d.result.approx, FORMULA_FORMAT).tex}\\ldots`);
  }
  const second: string[] = [`x^{${n}}&=${A}`];
  if (d.solutions === 0) second.push(`&\\text{has no real solution: }x^{${n}}\\ge 0`);
  else if (d.result.kind === 'exact') {
    const exact = rootForm(d.result.root);
    second.push(`&\\Rightarrow x=${d.solutions === 2 ? '\\pm ' : ''}${exact.tex}`);
    second.push(`\\left(${exact.tex}\\right)^{${n}}&=${d.powerBack ? rationalTex(d.powerBack) : ''}`);
  } else second.push(`&\\Rightarrow x=${d.solutions === 2 ? '\\pm ' : ''}${radicalOfTex(n, A)}`);
  return [aligned(lines), aligned(second)];
}

// ---------------------------------------------------------------------------------------------- verdict
export function rootsVerdict(d: NthRootDerived): string {
  const A = rationalForm(d.A).text;
  const n = d.n;
  if (d.solutions === 0) return `No real number x has x${superscriptOf(n)} = ${A}: an even power is never negative, so the curve y = x${superscriptOf(n)} never reaches the level ${A}. (Complex numbers do have such roots, but that is a different number system.)`;
  if (d.result.kind === 'numeric') return `The root is ≈ ${formatApprox(d.result.approx, FORMULA_FORMAT).text}. This value is too large for an exact form to be attempted, so none is claimed.`;
  if (d.A.num === 0n) return 'The only number whose power is 0 is 0 itself, for every n.';
  const exact = d.result.kind === 'exact' ? rootForm(d.result.root) : null;
  if (n % 2 === 1 && d.A.num < 0n) return `An odd root of a negative number exists and is negative: the cube of a negative number is negative, and so is every odd power. ${exact?.text ?? ''} is the one real solution of x${superscriptOf(n)} = ${A}.`;
  if (n % 2 === 0) return `Two real numbers satisfy x${superscriptOf(n)} = ${A}: ${exact?.text ?? ''} and −${exact?.text ?? ''}. The root symbol means only the positive one; the line meets the curve in two places because even powers are symmetric.`;
  return `The one real solution of x${superscriptOf(n)} = ${A} is ${exact?.text ?? ''}${exact && !exact.integer ? `; the decimal ${formatApprox((d.result as { approx: number }).approx, FORMULA_FORMAT).text} is only a rounding of it` : ''}.`;
}
const SUPERSCRIPTS: Record<number, string> = { 2: '²', 3: '³', 4: '⁴', 5: '⁵' };
const superscriptOf = (n: number): string => SUPERSCRIPTS[n] ?? `^${n}`;

export const verdictIsCaution = (d: NthRootDerived): boolean => d.solutions === 0;

export function rootsDescription(d: NthRootDerived): string {
  const A = rationalForm(d.A).text;
  const n = d.n;
  const where = d.solutions === 0 ? `The line never meets the curve: no real solution.` : d.solutions === 2 ? `The line meets the curve at two points, plus and minus the root.` : `The line meets the curve at exactly one point.`;
  return `The graph of y equals x to the power ${n} and the horizontal line y equals ${A}. ${where} Drag the handle on the y-axis up or down to move the line.`;
}

export function rootsSpoken(d: NthRootDerived): string {
  const A = rationalForm(d.A).spoken;
  if (d.solutions === 0) return `Value ${A}, index ${d.n}. No real root: an even power is never negative.`;
  const root = d.result.kind === 'exact' ? `exactly ${rootForm(d.result.root).spoken}` : d.result.kind === 'numeric' ? `approximately ${formatApprox(d.result.approx, SPOKEN_FORMAT).spoken}` : '';
  return `Value ${A}, index ${d.n}. The ${rootName(d.n)} is ${root}. ${d.solutions === 2 ? 'Two real solutions: plus and minus the root.' : 'One real solution.'}`;
}
