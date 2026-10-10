/**
 * Lesson views for the expressions stage of I.4: the distributive law a(bx + c) = abx + ac checked at one x, next to the slip a(bx + c) = abx + c.
 * The two sides are drawn as two lines. Where they coincide the equation is an identity; where they are parallel and apart it is a contradiction.
 *
 *   DistributeDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 */
import { rationalForm } from '../../math/quantity/exactform';
import { toNumber, sign, abs, type Rational } from '../../math/quantity/rational';
import type { DistributeDerived, DistributeForm, DistributeState, StatementKind } from '../../math/algebra/expression';
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { aligned } from '../shared/format';
import { baseTex, describeGiven, describeRational, rationalTex, statement } from '../quantities/values';
import { linearText } from './format';

export const CANONICAL_DISTRIBUTE: DistributeState = Object.freeze({ a: 2, b: 1, c: 3, x: 2, form: 'correct' });
export const DISTRIBUTE_WINDOW = Object.freeze({ xMin: -6, xMax: 6, yMin: -12, yMax: 12 });

const spec = (id: 'a' | 'b' | 'c' | 'x', name: string, limit: number, value: number): ParamSpec => ({
  id, name, symbolTex: id, symbolText: id, domain: { min: -limit, max: limit }, default: value, step: 1, maxDecimals: id === 'x' ? 2 : 0, onInvalid: 'reject',
});
export const DA_SPEC: ParamSpec = spec('a', 'outer factor', 3, CANONICAL_DISTRIBUTE.a);
export const DB_SPEC: ParamSpec = spec('b', 'coefficient of x inside', 3, CANONICAL_DISTRIBUTE.b);
export const DC_SPEC: ParamSpec = spec('c', 'constant inside', 5, CANONICAL_DISTRIBUTE.c);
export const DX_SPEC: ParamSpec = spec('x', 'value of x', 6, CANONICAL_DISTRIBUTE.x);

export const FORM_OPTIONS: readonly { readonly id: DistributeForm; readonly label: string }[] = Object.freeze([
  { id: 'correct', label: 'multiply every term: abx + ac' },
  { id: 'slip', label: 'multiply the first term only: abx + c' },
]);

export interface DistributePreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: DistributeState }
const preset = (id: string, label: string, aria: string, state: DistributeState): DistributePreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const DISTRIBUTE_PRESETS: readonly DistributePreset[] = Object.freeze([
  preset('d-id', '2(x + 3)', '2 times x plus 3, expanded correctly: an identity', { a: 2, b: 1, c: 3, x: 2, form: 'correct' }),
  preset('d-slip', '2(x + 3) slip', '2 times x plus 3, with the slip that multiplies only the first term', { a: 2, b: 1, c: 3, x: 2, form: 'slip' }),
  preset('d-neg', '−3(2x − 1)', 'minus 3 times 2x minus 1, expanded correctly', { a: -3, b: 2, c: -1, x: 1, form: 'correct' }),
  preset('d-neg-slip', '−3(2x − 1) slip', 'minus 3 times 2x minus 1, with the slip: a sign error as well', { a: -3, b: 2, c: -1, x: 1, form: 'slip' }),
  preset('d-harmless', '1(x + 3) slip', '1 times x plus 3: the slip happens to be harmless because the outer factor is 1', { a: 1, b: 1, c: 3, x: 2, form: 'slip' }),
]);

// ---------------------------------------------------------------------------------------------- kinds, in words
export const KIND_LABEL: Readonly<Record<StatementKind, string>> = Object.freeze({
  identity: 'an identity (true for every x)',
  contradiction: 'a contradiction (true for no x)',
  'conditional-equation': 'a conditional equation (true for some x)',
  'always-true': 'an inequality true for every x',
  'never-true': 'an inequality true for no x',
  'conditional-inequality': 'an inequality true for some x',
});

const plus = (r: Rational): string => (sign(r) < 0 ? `-${rationalTex(abs(r))}` : `+${rationalTex(r)}`);

// ---------------------------------------------------------------------------------------------- inspector
export function distributeRows(d: DistributeDerived, state: DistributeState): InspectorRowData[] {
  const agree = d.agreesHere;
  return [
    { id: 'a', role: 'ink', symbolTex: 'a', name: 'outer factor', description: describeGiven(state.a) },
    { id: 'b', role: 'ink', symbolTex: 'b', name: 'coefficient of x inside', description: describeGiven(state.b), secondary: true },
    { id: 'c', role: 'ink', symbolTex: 'c', name: 'constant inside', description: describeGiven(state.c), secondary: true },
    { id: 'x', role: 'primary', symbolTex: 'x', name: 'value of x', description: describeGiven(state.x) },
    { id: 'inner', role: 'derived', symbolTex: 'bx+c', name: 'the bracket at this x', description: describeRational(d.inner) },
    { id: 'product', role: 'x', symbolTex: 'a(bx+c)', name: 'the product, bracket first', description: describeRational(d.product) },
    { id: 'expanded', role: 'y', symbolTex: d.form === 'correct' ? 'abx+ac' : 'abx+c', name: d.form === 'correct' ? 'every term multiplied' : 'only the first term multiplied', description: describeRational(d.expanded) },
    { id: 'gap', role: agree ? 'ink' : 'caution', symbolTex: '\\text{gap}', name: 'product minus expansion', description: describeRational(d.gap) },
    { id: 'kind', role: 'derived', symbolTex: '\\text{type}', name: 'what kind of statement is the equation?', description: statement(kindWord(d.kind), `\\text{${kindWord(d.kind)}}`, KIND_LABEL[d.kind]) },
  ];
}
const kindWord = (k: StatementKind): string => (k === 'identity' ? 'identity' : k === 'contradiction' ? 'contradiction' : 'conditional');

// ---------------------------------------------------------------------------------------------- formulas
export function distributeFormulas(d: DistributeDerived): string[] {
  const x = baseTex(d.x);
  const left = aligned([
    `a(bx+c)&=${baseTex(d.a)}\\left(${baseTex(d.b)}\\cdot ${x}${plus(d.c)}\\right)=${baseTex(d.a)}\\cdot ${baseTex(d.inner)}=${rationalTex(d.product)}`,
  ]);
  const second = d.form === 'correct' ? `${baseTex(d.a)}\\cdot ${baseTex(d.c)}` : baseTex(d.c);
  const rightTex = `${baseTex(d.a)}\\cdot ${baseTex(d.b)}\\cdot ${x}+${second}=${rationalTex(d.firstTerm)}${plus(d.secondTerm)}=${rationalTex(d.expanded)}`;
  const right = aligned([`${d.form === 'correct' ? 'abx+ac' : 'abx+c'}&=${rightTex}`]);
  return [left, right];
}
export const DISTRIBUTE_FORMULA_LABELS = Object.freeze(['The bracket, multiplied out as written', 'The expansion at this x']);

// ---------------------------------------------------------------------------------------------- verdict
export function distributeVerdict(d: DistributeDerived): string {
  const lhs = linearText(d.lhs);
  const rhs = linearText(d.rhs);
  const at = rationalForm(d.x).text;
  const p = rationalForm(d.product).text;
  const e = rationalForm(d.expanded).text;
  const g = rationalForm(d.gap).text;
  if (d.form === 'correct') {
    return `At x = ${at} the bracket gives ${p} and the expansion gives ${e}. They agree, and not by luck: both simplify to ${lhs}, so the equation ${lhs} = ${rhs} is true for every x. It is an identity: the distributive law.`;
  }
  if (d.kind === 'identity') {
    return `At x = ${at} both sides are ${p}. This slip is harmless here only because a = 1 or c = 0, so that ac = c. In general a(bx + c) is ${lhs} and the slip writes ${rhs}.`;
  }
  const hereOrNot = d.agreesHere ? 'They agree here' : `They differ at x = ${at}: ${p} against ${e}, a gap of ${g}`;
  return `${hereOrNot}. The x-terms match, so the two sides differ by the same constant at EVERY x: ${lhs} = ${rhs} is a contradiction (true for no x). The slip left a·c uncounted: the second term must be multiplied by ${rationalForm(d.a).text} as well.`;
}
/** A caution when the written expansion does not equal the product at the chosen x. */
export const distributeIsCaution = (d: DistributeDerived): boolean => !d.agreesHere;

export function distributeSpoken(d: DistributeDerived): string {
  return `At x equals ${rationalForm(d.x).spoken}, the bracket gives ${rationalForm(d.product).spoken} and the expansion gives ${rationalForm(d.expanded).spoken}. ${d.agreesHere ? 'They agree.' : `They differ by ${rationalForm(d.gap).spoken}.`}`;
}

// ---------------------------------------------------------------------------------------------- scene
export interface DistributeScene {
  readonly x: number;
  readonly product: number;
  readonly expanded: number;
  readonly lhs: { readonly slope: number; readonly intercept: number };
  readonly rhs: { readonly slope: number; readonly intercept: number };
}
export const distributeScene = (d: DistributeDerived): DistributeScene => ({
  x: toNumber(d.x), product: toNumber(d.product), expanded: toNumber(d.expanded),
  lhs: { slope: toNumber(d.lhs.a), intercept: toNumber(d.lhs.b) },
  rhs: { slope: toNumber(d.rhs.a), intercept: toNumber(d.rhs.b) },
});

export function distributeDescription(d: DistributeDerived): string {
  const relation = d.kind === 'identity' ? 'The two lines coincide: they are the same function of x.' : 'The two lines are parallel and a constant distance apart.';
  return `A coordinate plane with two straight lines: y equals ${linearText(d.lhs).replace(/−/g, 'minus ')}, the bracket as written, and y equals ${linearText(d.rhs).replace(/−/g, 'minus ')}, its expansion. ${relation} At x equal to ${rationalForm(d.x).spoken} the heights are ${rationalForm(d.product).spoken} and ${rationalForm(d.expanded).spoken}.`;
}
