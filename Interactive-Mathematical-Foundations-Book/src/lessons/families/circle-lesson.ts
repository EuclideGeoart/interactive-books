/**
 * Lesson views for the unit circle: sine and cosine as the coordinates of (cos θ, sin θ).
 *
 *   CircleState → deriveCircle → { ring, legs, arc, inspector rows, formulas, verdict, spoken text, graph markers }
 *
 * Exact mode shows the exact values from the model's table ("="); free mode shows doubles ("≈"). The view never decides which.
 */
import { sampleCurve, type Polyline } from '../../platform/geometry/curve';
import type { Point } from '../../platform/geometry/viewport';
import type { ParamSpec } from '../../platform/params';
import { describeValue, type ExactForm, type Unit, type Value } from '../../platform/numeric/quantity';
import type { InspectorRowData } from '../../ui/Inspector';
import {
  CANONICAL_CIRCLE, DEFAULT_RADIANS, RADIANS_LIMIT, TWELFTHS_LIMIT, deriveCircle, exactAngle, piMultiple,
  type AngleResult, type CircleDerived, type CircleState, type Location, type TrigForm, type TrigValue,
} from '../../math/families/circle';
import { FORMAT, num } from './view';
import { SPOKEN_FORMAT, aligned, given } from '../shared/format';

export { CANONICAL_CIRCLE, deriveCircle };

export const CIRCLE_WINDOW = Object.freeze({ xMin: -1.6, xMax: 1.6, yMin: -1.6, yMax: 1.6 });
export const RAD: Unit = { text: 'rad', tex: '\\mathrm{rad}', spoken: 'radians' };
export const DEG: Unit = { text: '°', tex: '^{\\circ}', spoken: 'degrees', attached: true };

export const TWELFTHS_PARAM: ParamSpec = { id: 'k', name: 'angle, in steps of π/12', symbolTex: 'k', symbolText: 'k', domain: { min: -TWELFTHS_LIMIT, max: TWELFTHS_LIMIT }, default: 2, step: 1, maxDecimals: 0, onInvalid: 'reject' };
export const RADIANS_PARAM: ParamSpec = { id: 'theta', name: 'angle in radians', symbolTex: '\\theta', symbolText: 'θ', unit: 'rad', domain: { min: -RADIANS_LIMIT, max: RADIANS_LIMIT }, default: DEFAULT_RADIANS, step: 0.01, maxDecimals: 3, onInvalid: 'reject' };

export const MODE_OPTIONS = [{ id: 'exact', label: 'exact angles' }, { id: 'free', label: 'any angle' }] as const;

export interface CirclePreset { readonly k: number; readonly label: string; readonly aria: string }
export const CIRCLE_PRESETS: readonly CirclePreset[] = Object.freeze([0, 2, 3, 4, 6, 8, 10, 12, 18, -3].map(k => {
  const p = piMultiple(k);
  return Object.freeze({ k, label: p.text, aria: `angle ${p.spoken} radians` });
}));

// ---------------------------------------------------------------------------------------------- scene
export interface CircleScene {
  readonly ring: readonly Polyline[];
  /** The 24 exact-angle positions kπ/12. */
  readonly ticks: readonly Point[];
  readonly point: Point;
  readonly cosFoot: Point;
  readonly arc: { readonly from: number; readonly to: number } | null;
}
const RING: Polyline = Object.freeze(Array.from({ length: 121 }, (_, i) => ({ x: Math.cos((2 * Math.PI * i) / 120), y: Math.sin((2 * Math.PI * i) / 120) })));
const TICKS: readonly Point[] = Object.freeze(Array.from({ length: 24 }, (_, k) => ({ x: Math.cos((k * Math.PI) / 12), y: Math.sin((k * Math.PI) / 12) })));
export function circleScene(d: CircleDerived): CircleScene {
  return {
    ring: [RING],
    ticks: TICKS,
    point: d.point,
    cosFoot: { x: d.point.x, y: 0 },
    arc: Math.abs(d.radians) < 0.05 ? null : { from: 0, to: d.radians },
  };
}

// ---------------------------------------------------------------------------------------------- the two graphs under the circle
export const GRAPH_RANGE = Object.freeze({ xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -1.2, yMax: 1.2 });
let graphCache: { sin: Polyline[]; cos: Polyline[] } | null = null;
/** The sine and cosine graphs over [−2π, 2π], sampled once. */
export function trigGraphs(): { sin: Polyline[]; cos: Polyline[] } {
  graphCache ??= { sin: sampleCurve(Math.sin, GRAPH_RANGE, { samples: 240 }), cos: sampleCurve(Math.cos, GRAPH_RANGE, { samples: 240 }) };
  return graphCache;
}
export interface GraphMarkers { readonly theta: number; readonly sin: Point; readonly cos: Point }
export const graphMarkers = (d: CircleDerived): GraphMarkers => ({ theta: d.radians, sin: { x: d.radians, y: d.point.y }, cos: { x: d.radians, y: d.point.x } });

// ---------------------------------------------------------------------------------------------- values
const exactFormOf = (f: TrigForm): ExactForm => ({ text: f.text, tex: f.tex, spoken: f.spoken, integer: f.kind === 'rational' && /^[−-]?[01]$/.test(f.text), irrational: f.kind === 'radical' });
const trigValue = (v: TrigValue): Value => (v.kind === 'exact' ? { kind: 'exact', exact: exactFormOf(v.form), approx: v.form.numeric } : { kind: 'numeric', value: v.value });
const angleValue = (a: AngleResult): Value => {
  if (a.kind === 'numeric') return { kind: 'numeric', value: a.radians };
  const p = piMultiple(a.twelfths);
  return { kind: 'exact', exact: { text: p.text, tex: p.tex, spoken: p.spoken, integer: a.twelfths === 0, irrational: a.twelfths !== 0 }, approx: (a.twelfths * Math.PI) / 12 };
};
const thetaValue = (d: CircleDerived): Value => {
  if (d.mode === 'free') return { kind: 'given', value: d.radians };
  const p = d.piMultiple!;
  const k = d.state.twelfths;
  return { kind: 'exact', exact: { text: p.text, tex: p.tex, spoken: p.spoken, integer: k === 0, irrational: k !== 0 }, approx: d.radians };
};

export function circleRows(d: CircleDerived): InspectorRowData[] {
  const degrees: Value = d.degrees.exact ? { kind: 'given', value: d.degrees.value } : { kind: 'numeric', value: d.degrees.value };
  const sumSquares: Value = d.pythagorean.exact ? { kind: 'exact', exact: { text: '1', tex: '1', spoken: '1', integer: true, irrational: false }, approx: 1 } : { kind: 'numeric', value: d.pythagorean.value };
  return [
    { id: 'theta', role: 'derived', symbolTex: '\\theta', name: 'angle', description: describeValue(thetaValue(d), FORMAT, RAD) },
    { id: 'degrees', role: 'derived', symbolTex: '\\theta^{\\circ}', name: 'the same angle in degrees', description: describeValue(degrees, FORMAT, DEG), secondary: true },
    { id: 'cos', role: 'x', symbolTex: '\\cos\\theta', name: 'cosine: the x-coordinate', description: describeValue(trigValue(d.cos), FORMAT) },
    { id: 'sin', role: 'y', symbolTex: '\\sin\\theta', name: 'sine: the y-coordinate', description: describeValue(trigValue(d.sin), FORMAT) },
    { id: 'pythagoras', role: 'ink', symbolTex: '\\cos^{2}\\theta+\\sin^{2}\\theta', name: 'sum of the squares', description: describeValue(sumSquares, FORMAT) },
    { id: 'turn', role: 'ink', symbolTex: '\\sin(\\theta+2\\pi)', name: 'sine one full turn later', description: describeValue(trigValue(d.sinPlusTurn), FORMAT), secondary: true },
    { id: 'arcsin', role: 'caution', symbolTex: '\\arcsin(\\sin\\theta)', name: 'arcsin of the sine', description: describeValue(angleValue(d.arcsinOfSin), FORMAT, RAD) },
    { id: 'atan2', role: 'caution', symbolTex: '\\atantwo(\\sin\\theta,\\cos\\theta)', name: 'atan2 of the coordinates', description: describeValue(angleValue(d.atan2OfComponents), FORMAT, RAD) },
  ];
}

// ---------------------------------------------------------------------------------------------- text
function locationText(l: Location): string {
  return l.kind === 'axis' ? `on the ${l.axis === '+x' ? 'positive x-axis' : l.axis === '+y' ? 'positive y-axis' : l.axis === '−x' ? 'negative x-axis' : 'negative y-axis'}` : `in quadrant ${l.quadrant}`;
}
const signText = (name: string, s: -1 | 0 | 1): string => `${name} ${s > 0 ? '> 0' : s < 0 ? '< 0' : '= 0'}`;
const angleText = (a: AngleResult): string => (a.kind === 'exact' ? piMultiple(a.twelfths).text : `${num(a.radians)}`);

export function circleVerdict(d: CircleDerived): string {
  const parts = [`The point is ${locationText(d.location)}: ${signText('cos θ', d.cosSign)} and ${signText('sin θ', d.sinSign)}.`];
  if (d.reference.exact && d.reference.index !== null) parts.push(`Its reference angle (the acute angle to the x-axis) is ${piMultiple(d.reference.index).text}.`);
  if (!d.arcsinOfSin.returnsTheta) parts.push(`arcsin(sin θ) = ${angleText(d.arcsinOfSin)}, not θ: arcsin only answers between −π/2 and π/2.`);
  else parts.push('arcsin(sin θ) = θ here, because θ lies between −π/2 and π/2.');
  if (!d.atan2OfComponents.returnsTheta) parts.push(`atan2(sin θ, cos θ) = ${angleText(d.atan2OfComponents)}, which is θ plus or minus whole turns: it answers between −π and π.`);
  else parts.push('atan2(sin θ, cos θ) = θ here, because θ lies in (−π, π].');
  return parts.join(' ');
}

export function circleSpoken(d: CircleDerived): string {
  const angle = d.mode === 'exact' ? `${d.piMultiple!.spoken} radians, ${d.degrees.value} degrees` : `${describeValue({ kind: 'given', value: d.radians }, SPOKEN_FORMAT).spoken} radians`;
  return `Angle ${angle}. Cosine ${describeValue(trigValue(d.cos), SPOKEN_FORMAT).spoken}. Sine ${describeValue(trigValue(d.sin), SPOKEN_FORMAT).spoken}. The point is ${locationText(d.location)}.`;
}

export function circleDescription(d: CircleDerived): string {
  const angle = d.mode === 'exact' ? `${d.piMultiple!.text} radians` : `${given(d.radians)} radians`;
  return `The unit circle in a plane from −1.6 to 1.6 on both axes. The point at angle ${angle} is ${locationText(d.location)}. Its x-coordinate is cosine and equals ${describeValue(trigValue(d.cos), SPOKEN_FORMAT).spoken}; its y-coordinate is sine and equals ${describeValue(trigValue(d.sin), SPOKEN_FORMAT).spoken}. A coloured horizontal segment shows the cosine and a vertical segment shows the sine.`;
}

export function graphDescription(d: CircleDerived): string {
  return `The graphs of sine and cosine from −2π to 2π radians. A vertical line marks the angle θ = ${d.mode === 'exact' ? d.piMultiple!.text : given(d.radians)}; the sine graph is at height ${describeValue(trigValue(d.sin), SPOKEN_FORMAT).spoken} and the cosine graph at height ${describeValue(trigValue(d.cos), SPOKEN_FORMAT).spoken}.`;
}

// ---------------------------------------------------------------------------------------------- formulas
const trigTex = (v: TrigValue): { rel: '=' | '\\approx'; tex: string } => (v.kind === 'exact' ? { rel: '=', tex: v.form.tex } : { rel: '\\approx', tex: num(v.value) });

export function circleFormulas(d: CircleDerived): string[] {
  const c = trigTex(d.cos);
  const s = trigTex(d.sin);
  const angleTex = d.mode === 'exact' ? d.piMultiple!.tex : num(d.radians);
  const degTex = d.degrees.exact ? String(d.degrees.value) : num(d.degrees.value);
  const lines = [
    `\\theta&=${angleTex}\\ \\mathrm{rad}${d.mode === 'exact' ? '=' : '\\approx'}${degTex}^{\\circ}`,
    `\\cos\\theta&${c.rel}${c.tex}`,
    `\\sin\\theta&${s.rel}${s.tex}`,
  ];
  const squares = d.mode === 'exact'
    ? aligned([`\\cos^{2}\\theta+\\sin^{2}\\theta&=${d.cos2.kind === 'exact' ? d.cos2.form.tex : ''}+${d.sin2.kind === 'exact' ? d.sin2.form.tex : ''}`, '&=1'])
    : aligned([`\\cos^{2}\\theta+\\sin^{2}\\theta&=\\left(${num(d.point.x)}\\right)^{2}+\\left(${num(d.point.y)}\\right)^{2}`, `&\\approx ${num(d.pythagorean.value)}`]);
  const arc = d.arcsinOfSin;
  const at = d.atan2OfComponents;
  const rep = (a: AngleResult): string => (a.kind === 'exact' ? piMultiple(a.twelfths).tex : num(a.radians));
  const inverse = aligned([
    `\\arcsin(\\sin\\theta)&${arc.kind === 'exact' ? '=' : '\\approx'}${rep(arc)}${arc.returnsTheta ? '=\\theta' : '\\neq\\theta'}`,
    `\\atantwo(\\sin\\theta,\\cos\\theta)&${at.kind === 'exact' ? '=' : '\\approx'}${rep(at)}${at.returnsTheta ? '=\\theta' : '\\neq\\theta'}`,
  ]);
  return [aligned(lines), squares, inverse];
}

export const CIRCLE_FORMULA_LABELS = ['Angle, cosine and sine', 'The Pythagorean identity', 'Going back from the coordinates'] as const;

export { exactAngle };
export type { CircleState };
