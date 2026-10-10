/**
 * Lesson views for the extraneous-roots stage of I.4: the equation √(x + p) = x + q, its squared form, and each root of the squared form
 * substituted back into the ORIGINAL equation. The curve y = √(x + p) (solid), the other sign y = −√(x + p) (dashed) and the line y = x + q
 * are drawn; every root of the squared equation sits on the line, on one branch or the other.
 *
 *   ExtraneousDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 */
import { rationalForm } from '../../math/quantity/exactform';
import { abs, sign, type Rational } from '../../math/quantity/rational';
import { lineAt, lowerBranch, upperBranch, type ExtraneousDerived, type ExtraneousRoot, type ExtraneousState, type RadicalSum } from '../../math/algebra/extraneous';
import { MINUS } from '../../platform/numeric/format';
import type { ExactForm } from '../../platform/numeric/quantity';
import { describeValue } from '../../platform/numeric/quantity';
import type { ParamSpec } from '../../platform/params';
import { sampleCurve, type Polyline } from '../../platform/geometry/curve';
import type { InspectorRowData } from '../../ui/Inspector';
import { FORMAT, aligned } from '../shared/format';
import { describeGiven, statement } from '../quantities/values';
import { shiftText as shifted } from './format';

export const CANONICAL_EXTRANEOUS: ExtraneousState = Object.freeze({ p: 2, q: 0 });
export const EXTRANEOUS_WINDOW = Object.freeze({ xMin: -8, xMax: 12, yMin: -10, yMax: 10 });

const spec = (id: 'p' | 'q', value: number): ParamSpec => ({
  id, name: id === 'p' ? 'shift under the root' : 'shift of the line', symbolTex: id, symbolText: id, domain: { min: -6, max: 6 }, default: value, step: 1, maxDecimals: 0, onInvalid: 'reject',
});
export const EP_SPEC: ParamSpec = spec('p', CANONICAL_EXTRANEOUS.p);
export const EQ_SPEC: ParamSpec = spec('q', CANONICAL_EXTRANEOUS.q);

export interface ExtraneousPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: ExtraneousState }
const preset = (id: string, p: number, q: number, aria: string): ExtraneousPreset => {
  const f = (n: number): string => (n === 0 ? '' : n > 0 ? ` + ${n}` : ` ${MINUS} ${-n}`);
  return Object.freeze({ id, label: `√(x${f(p)}) = x${f(q)}`, aria, state: Object.freeze({ p, q }) });
};
export const EXTRANEOUS_PRESETS: readonly ExtraneousPreset[] = Object.freeze([
  preset('x-2-0', 2, 0, 'the square root of x plus 2 equals x: one valid root and one extraneous'),
  preset('x-1-0', 1, 0, 'the square root of x plus 1 equals x: the roots involve the square root of 5'),
  preset('x-5-m1', 5, -1, 'the square root of x plus 5 equals x minus 1: one valid root and one extraneous'),
  preset('x-0-0', 0, 0, 'the square root of x equals x: both roots are valid'),
  preset('x-0-1', 0, 1, 'the square root of x equals x plus 1: no real root at all'),
  preset('x-6-m6', 6, -6, 'the square root of x plus 6 equals x minus 6: the root 3 is extraneous'),
]);

// ---------------------------------------------------------------------------------------------- exact forms of u + v√b
/** 2r, which is a whole number for the roots of this family. */
const bi = (r: Rational): bigint => (r.num * 2n) / r.den;

/** The exact form of a root `u + v√b` as a half-integer combination, `(N + A√b)/2`; a rational root is written by `rationalForm`. */
export function sumForm(s: RadicalSum): ExactForm {
  if (s.b === 1n) return rationalForm(s.u);
  if (s.u.den > 2n || s.v.den > 2n) throw new RangeError('roots of this family have denominator 1 or 2');
  const N = bi(s.u);
  const A = bi(s.v);
  const a = A < 0n ? -A : A;
  const op = A < 0n ? '-' : '+';
  const coef = a === 1n ? '' : a.toString();
  const n = N.toString();
  return {
    text: `(${n.replace('-', MINUS)} ${A < 0n ? MINUS : '+'} ${coef}√${s.b})/2`,
    tex: `\\frac{${n}${op}${coef}\\sqrt{${s.b}}}{2}`,
    spoken: `the fraction ${n.replace('-', 'minus ')} ${A < 0n ? 'minus' : 'plus'} ${a === 1n ? '' : `${a} times `}the square root of ${s.b}, over 2`,
    integer: false,
    irrational: true,
  };
}
const approxOf = (s: RadicalSum): number => Number(s.u.num) / Number(s.u.den) + (Number(s.v.num) / Number(s.v.den)) * Math.sqrt(Number(s.b));

export const describeSum = (s: RadicalSum, approx: number) => describeValue({ kind: 'exact', exact: sumForm(s), approx }, FORMAT);

// ---------------------------------------------------------------------------------------------- the squared equation
const coefText = (r: Rational): string => rationalForm(r).text;
/** x² + (2q − 1)x + (q² − p) = 0, written with the actual numbers. */
export function squaredText(d: ExtraneousDerived): string {
  const l = d.squared.linear;
  const c = d.squared.constant;
  const lin = l.num === 0n ? '' : ` ${sign(l) < 0 ? MINUS : '+'} ${abs(l).num === 1n ? '' : coefText(abs(l))}x`;
  const con = c.num === 0n ? '' : ` ${sign(c) < 0 ? MINUS : '+'} ${coefText(abs(c))}`;
  return `x²${lin}${con} = 0`;
}
export function squaredTex(d: ExtraneousDerived): string {
  const l = d.squared.linear;
  const c = d.squared.constant;
  const lin = l.num === 0n ? '' : `${sign(l) < 0 ? '-' : '+'}${abs(l).num === 1n ? '' : rationalForm(abs(l)).tex}x`;
  const con = c.num === 0n ? '' : `${sign(c) < 0 ? '-' : '+'}${rationalForm(abs(c)).tex}`;
  return `x^{2}${lin}${con}=0`;
}

// ---------------------------------------------------------------------------------------------- inspector
const rootTexIdx = (i: number): string => String(i + 1);

export function extraneousRows(d: ExtraneousDerived, state: ExtraneousState): InspectorRowData[] {
  const rows: InspectorRowData[] = [
    { id: 'p', role: 'ink', symbolTex: 'p', name: 'shift under the root', description: describeGiven(state.p) },
    { id: 'q', role: 'primary', symbolTex: 'q', name: 'shift of the line', description: describeGiven(state.q) },
    { id: 'disc', role: 'derived', symbolTex: 'D', name: 'discriminant 4p − 4q + 1 of the squared equation', description: describeGiven(Number(d.discriminant)) },
  ];
  d.roots.forEach((r, i) => {
    rows.push({ id: `root-${i + 1}`, role: 'x', symbolTex: `x_{${rootTexIdx(i)}}`, name: `root ${i + 1} of the squared equation`, description: describeSum(r.x, r.approx) });
    rows.push({
      id: `status-${i + 1}`, role: r.status === 'valid' ? 'ink' : 'caution', symbolTex: `\\text{check}_{${rootTexIdx(i)}}`,
      name: `root ${i + 1} in the ORIGINAL equation`,
      description: statement(r.status, `\\text{${r.status}}`, r.status === 'valid' ? 'valid: it solves the original equation' : 'extraneous: it does not solve the original equation'),
    });
  });
  if (d.roots.length === 0) {
    rows.push({ id: 'roots', role: 'caution', symbolTex: 'x', name: 'roots of the squared equation', description: statement('none', '\\text{none}', 'the squared equation has no real root') });
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------- formulas
export function extraneousFormulas(d: ExtraneousDerived): string[] {
  const p = d.p;
  const q = d.q;
  const pTex = p === 0 ? '' : p > 0 ? `+${p}` : `-${-p}`;
  const qTex = q === 0 ? '' : q > 0 ? `+${q}` : `-${-q}`;
  const first = aligned([
    `\\sqrt{x${pTex}}&=x${qTex}`,
    `x${pTex}&=${q === 0 ? 'x^{2}' : `\\left(x${qTex}\\right)^{2}`}`,
    `&\\text{(squaring is not an equivalence)}`,
    `&\\Rightarrow\\ ${squaredTex(d)}`,
    `&D=4p-4q+1=${d.discriminant}`,
  ]);
  const checks = d.roots.length === 0
    ? aligned([`D&=${d.discriminant}<0`, `&\\text{no real root, so none to check}`])
    : aligned(d.roots.map((r, i) => {
      const x = sumForm(r.x).tex;
      const t = sumForm(r.t).tex;
      return `x_{${rootTexIdx(i)}}&=${x},\\quad \\text{right side}=${t}\\ ${r.tSign < 0 ? '<0\\ \\text{(extraneous)}' : '\\ge 0\\ \\text{(valid)}'}`;
    }));
  return [first, checks];
}
export const EXTRANEOUS_FORMULA_LABELS = Object.freeze(['Squaring both sides', 'Substituting back into the original equation']);

// ---------------------------------------------------------------------------------------------- verdict
function rootSentence(r: ExtraneousRoot, d: ExtraneousDerived, i: number): string {
  const x = sumForm(r.x).text;
  const t = sumForm(r.t).text;
  const approx = r.x.b === 1n ? '' : ` (≈ ${approxOf(r.x).toFixed(6).replace('-', MINUS)}…)`;
  const qPart = shifted(d.q);
  const rad = shifted(d.p);
  if (r.status === 'valid') {
    const squared = /[ /]/.test(t) ? `(${t})²` : `${t}²`;
    if (r.t.b === 1n) {
      const value = rationalForm({ num: r.t.u.num * r.t.u.num, den: r.t.u.den * r.t.u.den } as Rational).text;
      return `Root ${i + 1}, x = ${x}${approx}: the right-hand side ${qPart} equals ${t}, which is not negative, and the radicand ${rad} equals ${value} = ${squared}, so √${value} = ${t}. Valid.`;
    }
    return `Root ${i + 1}, x = ${x}${approx}: the right-hand side ${qPart} equals ${t}, which is not negative, and ${squared} equals the radicand ${rad} at this x (that is what the squared equation says), so √(${squared}) = ${t}. Valid.`;
  }
  return `Root ${i + 1}, x = ${x}${approx}: the right-hand side ${qPart} equals ${t}, which is negative, and a square root is never negative. This x solves −√(${rad}) = ${qPart} instead. Extraneous.`;
}

export function extraneousVerdict(d: ExtraneousDerived): string {
  if (d.roots.length === 0) return `D = ${String(d.discriminant).replace('-', MINUS)} is negative, so the squared equation has no real root and the original equation has none either. Squaring cannot create roots out of nothing.`;
  const all = d.roots.map((r, i) => rootSentence(r, d, i)).join(' ');
  const tail = d.extraneousCount === 0
    ? ' Here both roots survive the check; you only know that by checking.'
    : ` Squaring produced ${d.roots.length} candidates but only ${d.validCount} solves the original equation.`;
  return `${all}${tail}`;
}
/** A caution verdict when squaring produced a root that does not belong, or no root at all. */
export const extraneousIsCaution = (d: ExtraneousDerived): boolean => d.extraneousCount > 0 || d.roots.length === 0;

export function extraneousSpoken(d: ExtraneousDerived): string {
  if (d.roots.length === 0) return `No real root: the discriminant is ${d.discriminant}, which is negative.`;
  return d.roots.map((r, i) => `Root ${i + 1} is ${sumForm(r.x).spoken}: ${r.status}.`).join(' ');
}

// ---------------------------------------------------------------------------------------------- scene
export interface ExtraneousScene {
  readonly upper: readonly Polyline[];
  readonly lower: readonly Polyline[];
  readonly line: readonly Polyline[];
  readonly marks: readonly { readonly at: { readonly x: number; readonly y: number }; readonly valid: boolean }[];
}

/** The curves depend on (p, q) and the window only. */
export function extraneousCurves(p: number, q: number): Pick<ExtraneousScene, 'upper' | 'lower' | 'line'> {
  const up = upperBranch(p);
  const low = lowerBranch(p);
  const ln = lineAt(q);
  return {
    upper: sampleCurve(x => (x + p < 0 ? null : up(x)), EXTRANEOUS_WINDOW, { samples: 400 }),
    lower: sampleCurve(x => (x + p < 0 ? null : low(x)), EXTRANEOUS_WINDOW, { samples: 400 }),
    line: sampleCurve(ln, EXTRANEOUS_WINDOW, { samples: 40 }),
  };
}
export function extraneousMarks(d: ExtraneousDerived): ExtraneousScene['marks'] {
  return d.roots.map(r => ({ at: { x: approxOf(r.x), y: approxOf(r.t) }, valid: r.status === 'valid' }));
}

export function extraneousDescription(d: ExtraneousDerived): string {
  const roots = d.roots.length === 0
    ? 'The line and the curves do not meet.'
    : d.roots.map((r, i) => `Root ${i + 1} is at x equal to ${sumForm(r.x).spoken}, on the ${r.status === 'valid' ? 'upper, solid' : 'lower, dashed'} branch: ${r.status}.`).join(' ');
  return `A coordinate plane. The solid curve is y equals the square root of ${shifted(d.p).replace('−','minus').replace('+','plus')}, the dashed curve is y equals minus that square root, and the straight line is y equals ${shifted(d.q).replace('−','minus').replace('+','plus')}. ${roots}`;
}
