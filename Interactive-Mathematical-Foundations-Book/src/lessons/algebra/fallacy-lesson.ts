/**
 * Lesson views for the division stage of I.4: x(x − c) = m(x − c). Dividing both sides by (x − c) gives x = m and silently loses x = c,
 * where both sides are 0. The two sides are drawn as a parabola and a line; they meet at every solution.
 *
 *   FallacyDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 */
import { rationalForm } from '../../math/quantity/exactform';
import { toNumber, type Rational } from '../../math/quantity/rational';
import type { FallacyDerived, FallacyState } from '../../math/algebra/fallacy';
import type { ParamSpec } from '../../platform/params';
import { sampleCurve, type Polyline } from '../../platform/geometry/curve';
import type { InspectorRowData } from '../../ui/Inspector';
import { aligned } from '../shared/format';
import { baseTex, describeGiven, describeRational, rationalTex, statement } from '../quantities/values';
import { intText, shiftTex, shiftText } from './format';

export const CANONICAL_FALLACY: FallacyState = Object.freeze({ c: 2, m: 3 });
export const FALLACY_WINDOW = Object.freeze({ xMin: -8, xMax: 8, yMin: -10, yMax: 14 });

const spec = (id: 'c' | 'm', name: string, value: number): ParamSpec => ({ id, name, symbolTex: id, symbolText: id, domain: { min: -6, max: 6 }, default: value, step: 1, maxDecimals: 0, onInvalid: 'reject' });
export const FC_SPEC: ParamSpec = spec('c', 'the zero of the factor', CANONICAL_FALLACY.c);
export const FM_SPEC: ParamSpec = spec('m', 'the number on the right', CANONICAL_FALLACY.m);

export interface FallacyPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: FallacyState }
const preset = (id: string, label: string, aria: string, state: FallacyState): FallacyPreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const FALLACY_PRESETS: readonly FallacyPreset[] = Object.freeze([
  preset('f-2-3', 'x(x − 2) = 3(x − 2)', 'x times x minus 2 equals 3 times x minus 2: dividing loses the root 2', { c: 2, m: 3 }),
  preset('f-m1-4', 'x(x + 1) = 4(x + 1)', 'x times x plus 1 equals 4 times x plus 1: dividing loses the root minus 1', { c: -1, m: 4 }),
  preset('f-0-2', 'x · x = 2x', 'x times x equals 2 times x: dividing by x loses the root 0', { c: 0, m: 2 }),
  preset('f-3-3', 'x(x − 3) = 3(x − 3)', 'x times x minus 3 equals 3 times x minus 3: a double root, nothing is lost', { c: 3, m: 3 }),
  preset('f-2-m2', 'x(x − 2) = −2(x − 2)', 'x times x minus 2 equals minus 2 times x minus 2: dividing loses the root 2', { c: 2, m: -2 }),
]);

// ---------------------------------------------------------------------------------------------- writing the equation
/** "x(x − 2) = 3(x − 2)", with the c = 0 case written "x · x = 3x" so no bracket reads "(x − 0)". */
export function fallacyText(d: FallacyDerived): string {
  const c = Number(d.c.num);
  const m = Number(d.m.num);
  if (c === 0) return `x · x = ${m === 1 ? '' : m === -1 ? '−' : intText(m)}x`;
  return `x(${shiftText(-c)}) = ${intText(m)}(${shiftText(-c)})`;
}
export function fallacyTex(d: FallacyDerived): string {
  const c = Number(d.c.num);
  const m = Number(d.m.num);
  if (c === 0) return `x\\cdot x=${m === 1 ? '' : m === -1 ? '-' : m}x`;
  return `x\\left(${shiftTex(-c)}\\right)=${baseTex(d.m)}\\left(${shiftTex(-c)}\\right)`;
}
const setText = (xs: readonly Rational[]): string => `{${xs.map(x => rationalForm(x).text).join(', ')}}`;
const setTex = (xs: readonly Rational[]): string => `\\{${xs.map(x => rationalForm(x).tex).join(',\\ ')}\\}`;

// ---------------------------------------------------------------------------------------------- inspector
export function fallacyRows(d: FallacyDerived, state: FallacyState): InspectorRowData[] {
  const lost = d.lost !== null;
  return [
    { id: 'c', role: 'ink', symbolTex: 'c', name: 'the zero of the factor', description: describeGiven(state.c) },
    { id: 'm', role: 'primary', symbolTex: 'm', name: 'the number on the right', description: describeGiven(state.m) },
    { id: 'solutions', role: 'x', symbolTex: 'S', name: 'all solutions', description: statement(setText(d.solutions), setTex(d.solutions), `the solutions are ${d.solutions.map(x => rationalForm(x).spoken).join(' and ')}`) },
    { id: 'divided', role: 'derived', symbolTex: '\\text{after }\\div(x-c)', name: 'what the division concludes', description: statement(`x = ${rationalForm(d.afterDividing).text}`, `x=${rationalTex(d.afterDividing)}`, `x equals ${rationalForm(d.afterDividing).spoken}`) },
    {
      id: 'lost', role: lost ? 'caution' : 'ink', symbolTex: '\\text{lost}', name: 'the solution the division loses',
      description: d.lost === null ? statement('none', '\\text{none}', 'nothing is lost: c equals m') : statement(`x = ${rationalForm(d.lost).text}`, `x=${rationalTex(d.lost)}`, `x equals ${rationalForm(d.lost).spoken}`),
    },
    { id: 'left-at-c', role: 'y', symbolTex: 'x(x-c)\\ \\text{at } c', name: 'left side at x = c', description: describeRational(d.atC.left) },
    { id: 'right-at-c', role: 'y', symbolTex: 'm(x-c)\\ \\text{at } c', name: 'right side at x = c', description: describeRational(d.atC.right) },
  ];
}

// ---------------------------------------------------------------------------------------------- formulas
export function fallacyFormulas(d: FallacyDerived): string[] {
  const c = Number(d.c.num);
  const factor = shiftTex(-c);
  return [
    aligned([
      `${fallacyTex(d)}&`,
      `\\iff\\ \\left(${factor}\\right)\\left(${shiftTex(-Number(d.m.num))}\\right)&=0`,
      `\\iff\\ x=${rationalTex(d.c)}\\ \\text{or}\\ x=${rationalTex(d.m)}&`,
    ]),
    d.lost === null
      ? aligned([`c=m=${rationalTex(d.c)}&`, `\\text{dividing by }(${factor})\\text{ gives }x=${rationalTex(d.m)}&\\text{, the same single solution}`])
      : aligned([
        `\\text{divide by }(${factor}):\\ x&=${rationalTex(d.m)}`,
        `\\text{but at }x=${rationalTex(d.c)}:\\ ${factor}&=0`,
        `\\text{so the division was by }0\\text{ and }x=${rationalTex(d.c)}\\text{ was lost}&`,
      ]),
  ];
}
export const FALLACY_FORMULA_LABELS = Object.freeze(['The factored equation', 'What the division does']);

// ---------------------------------------------------------------------------------------------- verdict
export function fallacyVerdict(d: FallacyDerived): string {
  const eq = fallacyText(d);
  const c = rationalForm(d.c).text;
  const m = rationalForm(d.m).text;
  const factor = shiftText(-Number(d.c.num));
  if (d.lost === null) {
    return `${eq} has the single solution x = ${c}. Here c = m, so dividing by (${factor}) gives x = ${m}, the same value. Nothing is lost, but the division was still only allowed for x other than ${c}: it happened to be harmless.`;
  }
  return `${eq} has two solutions, ${setText(d.solutions)}. Dividing both sides by (${factor}) is allowed only where ${factor} is not 0, that is for x other than ${c}. It leaves x = ${m} and silently throws away x = ${c}, where both sides equal 0 (${rationalForm(d.atC.left).text} = ${rationalForm(d.atC.right).text}). Move everything to one side and factor instead.`;
}
export const fallacyIsCaution = (d: FallacyDerived): boolean => d.lost !== null;

export function fallacySpoken(d: FallacyDerived): string {
  return `The solutions are ${d.solutions.map(x => rationalForm(x).spoken).join(' and ')}. Dividing gives only x equals ${rationalForm(d.afterDividing).spoken}${d.lost === null ? '.' : `, and loses x equals ${rationalForm(d.lost).spoken}.`}`;
}

// ---------------------------------------------------------------------------------------------- scene
export interface FallacyScene {
  readonly left: readonly Polyline[];
  readonly right: readonly Polyline[];
  readonly marks: readonly { readonly at: { readonly x: number; readonly y: number }; readonly lost: boolean }[];
}
/** The curves depend on (c, m) and the window only. */
export function fallacyCurves(c: number, m: number): Pick<FallacyScene, 'left' | 'right'> {
  return {
    left: sampleCurve(x => x * (x - c), FALLACY_WINDOW, { samples: 320 }),
    right: sampleCurve(x => m * (x - c), FALLACY_WINDOW, { samples: 16 }),
  };
}
export function fallacyMarks(d: FallacyDerived): FallacyScene['marks'] {
  return d.solutions.map(x => ({ at: { x: toNumber(x), y: toNumber(d.m) * (toNumber(x) - toNumber(d.c)) + 0 }, lost: d.lost !== null && x.num === d.lost.num && x.den === d.lost.den }));
}

export function fallacyDescription(d: FallacyDerived): string {
  const hits = d.solutions.map(x => rationalForm(x).spoken).join(' and ');
  return `A coordinate plane with a parabola, the left side, and a straight line, the right side. They cross where the equation is true, at x equal to ${hits}. `
    + `${d.lost === null ? 'The line just touches the parabola at one point.' : `The crossing at x equal to ${rationalForm(d.c).spoken} is the one that dividing by the factor throws away.`}`;
}
