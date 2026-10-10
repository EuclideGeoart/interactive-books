/**
 * Lesson views for the number-line stage of I.2: two points a and b on a line, the signed difference b − a (which way and how far),
 * the distance |b − a| (how far, no direction), the midpoint, and the trap |a| + |b|.
 *
 *   LineDerived  →  { inspector rows, formulas, verdict, world-space scene, spoken text }
 */
import { rationalForm } from '../../math/quantity/exactform';
import { toNumber } from '../../math/quantity/rational';
import type { LineDerived, LineState } from '../../math/coordinates/numberline';
import type { InspectorRowData } from '../../ui/Inspector';
import type { ParamSpec } from '../../platform/params';
import { aligned } from '../shared/format';
import { baseTex, describeGiven, describeRational, rationalTex } from '../quantities/values';

export const LINE_LIMIT = 7;
export const CANONICAL_LINE: LineState = Object.freeze({ a: -3, b: 5 });
/** The visible stretch of the line; the handles live in ±7. */
export const LINE_WINDOW = Object.freeze({ xMin: -8, xMax: 8 });

const spec = (id: 'a' | 'b', value: number): ParamSpec => ({
  id, name: `point ${id}`, symbolTex: id, symbolText: id, domain: { min: -LINE_LIMIT, max: LINE_LIMIT }, default: value, step: 1, maxDecimals: 2, onInvalid: 'reject',
});
export const A_SPEC: ParamSpec = spec('a', CANONICAL_LINE.a);
export const B_SPEC: ParamSpec = spec('b', CANONICAL_LINE.b);
/** The handles move along the line only: their world y is fixed at 0. */
export const LINE_Y_SPEC: ParamSpec = { id: 'y', name: 'height', symbolTex: 'y', symbolText: 'y', domain: { min: 0, max: 0 }, default: 0, step: 1, onInvalid: 'reject' };

export interface LinePreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: LineState }
const fmt = (n: number): string => String(n).replace('-', '−');
const preset = (id: string, a: number, b: number, aria: string): LinePreset => Object.freeze({ id, label: `${fmt(a)} → ${fmt(b)}`, aria, state: Object.freeze({ a, b }) });
export const LINE_PRESETS: readonly LinePreset[] = Object.freeze([
  preset('l-3-5', -3, 5, 'from minus 3 to 5'),
  preset('l5-3', 5, -3, 'from 5 to minus 3: the opposite direction'),
  preset('l2-7', 2, 7, 'from 2 to 7: both on the same side of zero'),
  preset('l-6-2', -6, -2, 'from minus 6 to minus 2'),
  preset('l0-4', 0, -4, 'from 0 to minus 4'),
  preset('l4-4', 4, 4, 'from 4 to 4: the same point'),
]);

// ---------------------------------------------------------------------------------------------- inspector
export function lineRows(d: LineDerived, state: LineState): InspectorRowData[] {
  return [
    { id: 'a', role: 'ink', symbolTex: 'a', name: 'point a', description: describeGiven(state.a) },
    { id: 'b', role: 'primary', symbolTex: 'b', name: 'point b', description: describeGiven(state.b) },
    { id: 'forward', role: 'derived', symbolTex: 'b-a', name: 'signed step from a to b', description: describeRational(d.forward) },
    { id: 'backward', role: 'derived', symbolTex: 'a-b', name: 'signed step from b to a', description: describeRational(d.backward), secondary: true },
    { id: 'distance', role: 'x', symbolTex: '\\lvert b-a\\rvert', name: 'distance (no direction)', description: describeRational(d.distance) },
    { id: 'midpoint', role: 'y', symbolTex: '\\frac{a+b}{2}', name: 'midpoint', description: describeRational(d.midpoint) },
    { id: 'via-zero', role: 'caution', symbolTex: '\\lvert a\\rvert+\\lvert b\\rvert', name: 'distance through 0', description: describeRational(d.viaZero), secondary: true },
  ];
}

// ---------------------------------------------------------------------------------------------- formulas
export function lineFormulas(d: LineDerived): string[] {
  const a = baseTex(d.a);
  const b = baseTex(d.b);
  return [
    aligned([
      `b-a&=${b}-${a}=${rationalTex(d.forward)}`,
      `a-b&=${a}-${b}=${rationalTex(d.backward)}=-(b-a)`,
    ]),
    aligned([
      `\\lvert b-a\\rvert&=\\lvert ${rationalTex(d.forward)}\\rvert=${rationalTex(d.distance)}=\\lvert a-b\\rvert`,
      `\\tfrac{a+b}{2}&=\\tfrac{${rationalTex(d.a)}${d.b.num < 0n ? '' : '+'}${rationalTex(d.b)}}{2}=${rationalTex(d.midpoint)}`,
    ]),
  ];
}

// ---------------------------------------------------------------------------------------------- verdict
export function lineVerdict(d: LineDerived): string {
  const f = rationalForm(d.forward).text;
  const g = rationalForm(d.backward).text;
  const dist = rationalForm(d.distance).text;
  const via = rationalForm(d.viaZero).text;
  if (d.order === 'same') return 'a and b are the same point: the signed step is 0, the distance is 0, and neither is to the left of the other.';
  const side = d.order === 'a-left' ? 'b is to the right of a' : 'b is to the left of a';
  const sentence = `${side}, so b − a = ${f} (the sign says which way) while a − b = ${g}: the same two points, the opposite direction. The distance |b − a| = ${dist} has no direction, so it is the same both ways.`;
  const detour = d.sameSide
    ? ` |a| + |b| = ${via} is NOT the distance here: both points are on the same side of 0, so going through 0 is a detour.`
    : ` |a| + |b| = ${via} happens to equal the distance, because 0 is between the points (or is one of them).`;
  return sentence + detour;
}

/** `data-agree` of the verdict: false when the "distance through 0" shortcut would give a wrong answer. */
export const verdictIsCaution = (d: LineDerived): boolean => d.sameSide && d.order !== 'same';

// ---------------------------------------------------------------------------------------------- scene
export interface LineScene {
  readonly a: number;
  readonly b: number;
}
export const lineScene = (d: LineDerived): LineScene => ({ a: toNumber(d.a), b: toNumber(d.b) });

// ---------------------------------------------------------------------------------------------- text alternatives
export function lineDescription(d: LineDerived): string {
  const order = d.order === 'same' ? 'The two points coincide.' : d.order === 'a-left' ? 'Point a is to the left of point b.' : 'Point a is to the right of point b.';
  return `A number line from minus 8 to 8. Point a is at ${rationalForm(d.a).spoken} and point b is at ${rationalForm(d.b).spoken}. ${order} The signed step from a to b is ${rationalForm(d.forward).spoken}, and the distance between them is ${rationalForm(d.distance).spoken}.`;
}

export function lineSpoken(d: LineDerived): string {
  return `a is ${rationalForm(d.a).spoken}, b is ${rationalForm(d.b).spoken}. b minus a is ${rationalForm(d.forward).spoken}. The distance is ${rationalForm(d.distance).spoken}.`;
}

