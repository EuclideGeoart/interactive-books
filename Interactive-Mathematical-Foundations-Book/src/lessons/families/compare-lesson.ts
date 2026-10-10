/**
 * Lesson views for the function-family comparison (I.6 hero stage).
 *
 *   CompareState → deriveCompare → { curves, markers, inspector rows, formulas, facts, verdict, spoken text }
 *
 * Every value comes from `CompareDerived` / `FamilyFacts`; the strings here only arrange them.
 */
import type { Polyline } from '../../platform/geometry/curve';
import type { Point } from '../../platform/geometry/viewport';
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { describeValue } from '../../platform/numeric/quantity';
import {
  FAMILY_IDS, PARAM_DECIMALS, curveFn, deriveCompare, factsOf, familyMeta, numberOf, sampleFamily, visibleFamilies, zerosIn,
  type CompareDerived, type CompareState, type FamilyFacts, type FamilyId,
} from '../../math/families/families';
import { toNumber, sign, isZero, type Rat } from '../../math/families/rational';
import { given, SPOKEN_FORMAT, aligned } from '../shared/format';
import { describeFamily, intervalText, num, ratText, ratTex, ratSpoken } from './view';
import type { Role } from '../../ui/plane/primitives';

export const COMPARE_WINDOW = Object.freeze({ xMin: -7, xMax: 7, yMin: -7, yMax: 7 });

export const A_PARAM: ParamSpec = { id: 'a', name: 'vertical scale', symbolTex: 'a', symbolText: 'a', domain: { min: -3, max: 3 }, default: 1, step: 0.5, maxDecimals: PARAM_DECIMALS, onInvalid: 'reject' };
export const H_PARAM: ParamSpec = { id: 'h', name: 'horizontal shift', symbolTex: 'h', symbolText: 'h', domain: { min: -4, max: 4 }, default: 0, step: 0.5, maxDecimals: PARAM_DECIMALS, onInvalid: 'reject' };
export const CX_PARAM: ParamSpec = { id: 'x', name: 'input', symbolTex: 'x', symbolText: 'x', domain: { min: -6, max: 6 }, default: 1, step: 0.5, maxDecimals: PARAM_DECIMALS, onInvalid: 'reject' };
/** The x-handle moves along the x-axis only: a degenerate y domain pins it there. */
export const AXIS_Y_PARAM: ParamSpec = { id: 'axis-y', name: 'height of the handle', symbolTex: 'y', symbolText: 'y', domain: { min: 0, max: 0 }, default: 0, step: 0.5, onInvalid: 'reject' };

export const FAMILY_ROLE: Readonly<Record<FamilyId, Role>> = Object.freeze({ linear: 'ink', square: 'ink', exp: 'primary', ln: 'derived', sin: 'y', cos: 'x' });
/** The plain-text label drawn next to a curve and used as the family's button label. */
export const FAMILY_LABEL: Readonly<Record<FamilyId, string>> = Object.freeze({ linear: 'x', square: 'x²', exp: 'eˣ', ln: 'ln x', sin: 'sin x', cos: 'cos x' });
const SHIFTED: Readonly<Record<FamilyId, { text: string; symbolTex: string }>> = {
  linear: { text: 'a(x − h)', symbolTex: 'y_{\\mathrm{lin}}' },
  square: { text: 'a(x − h)²', symbolTex: 'y_{\\mathrm{sq}}' },
  exp: { text: 'a·e^(x − h)', symbolTex: 'y_{\\exp}' },
  ln: { text: 'a·ln(x − h)', symbolTex: 'y_{\\ln}' },
  sin: { text: 'a·sin(x − h)', symbolTex: 'y_{\\sin}' },
  cos: { text: 'a·cos(x − h)', symbolTex: 'y_{\\cos}' },
};

export interface ComparePreset { readonly id: string; readonly label: string; readonly aria: string; readonly on: readonly FamilyId[] }
export const COMPARE_PRESETS: readonly ComparePreset[] = Object.freeze(([
  { id: 'inverse', label: 'eˣ and ln', aria: 'the exponential and its inverse, the logarithm', on: ['exp', 'ln'] },
  { id: 'waves', label: 'sin and cos', aria: 'sine and cosine', on: ['sin', 'cos'] },
  { id: 'polynomials', label: 'x and x²', aria: 'the line and the parabola', on: ['linear', 'square'] },
  { id: 'growth', label: 'who wins?', aria: 'the line, the parabola and the exponential', on: ['linear', 'square', 'exp'] },
  { id: 'all', label: 'all six', aria: 'all six families', on: [...FAMILY_IDS] },
] as ComparePreset[]).map(p => Object.freeze(p)));

export const withFamilies = (s: CompareState, on: readonly FamilyId[]): CompareState =>
  ({ ...s, linear: on.includes('linear'), square: on.includes('square'), exp: on.includes('exp'), ln: on.includes('ln'), sin: on.includes('sin'), cos: on.includes('cos') });
export const toggled = (s: CompareState, id: FamilyId): CompareState => ({ ...s, [id]: !s[id] });

// ---------------------------------------------------------------------------------------------- curves (depend on the visible set, a and h only)
export interface CurveLabel { readonly at: Point; readonly dx: number; readonly dy: number; readonly anchor: 'start' | 'middle' | 'end' }
export interface CurveScene {
  readonly id: FamilyId;
  readonly role: Role;
  readonly label: string;
  readonly lines: readonly Polyline[];
  readonly labelAt: CurveLabel | null;
}

/** Candidate abscissae for a direct label, in order of preference (the first whose point is comfortably inside the window wins). */
function labelCandidates(id: FamilyId, a: number, h: number): number[] {
  switch (id) {
    case 'linear': return a === 0 ? [5.6, -5.6] : [5.6, -5.6, 4, -4, 2.5, h + 4 / a, h - 4 / a, h + 2 / a, h - 2 / a, h + 1 / a];
    case 'square': return [2.5, -2.5, 2, -2, 1.5, -1.5, 1, -1, 0.5].map(o => h + o);
    case 'exp': return [h + 1.6, h + 1.2, h + 0.8, h + 0.4, h - 0.5, h + 2.2, h - 1.5];
    case 'ln': return [h + 5.4, h + 4.2, h + 3, h + 1.8, h + 0.8, h + 0.3];
    case 'sin': return [h + Math.PI / 2, h + Math.PI / 2 + 2 * Math.PI, h + Math.PI / 2 - 2 * Math.PI, h + 3 * Math.PI / 2, h - Math.PI / 2];
    case 'cos': return [h + 2 * Math.PI, h, h - 2 * Math.PI, h + Math.PI, h - Math.PI];
  }
}

export function labelFor(id: FamilyId, a: number, h: number, w = COMPARE_WINDOW): CurveLabel | null {
  const f = curveFn(id, a, h);
  const margin = 1;
  for (const x of labelCandidates(id, a, h)) {
    const y = f(x);
    if (y === null || !Number.isFinite(y)) continue;
    if (x < w.xMin + margin || x > w.xMax - margin || y < w.yMin + margin || y > w.yMax - margin) continue;
    // away from the axis the curve is heading to: above a crest, below a trough, otherwise above-left of the point
    const up = y >= 0;
    return { at: { x, y }, dx: x > 0 ? -4 : 4, dy: up ? -17 : 17, anchor: x > 0 ? 'end' : 'start' };
  }
  return null;
}

export function compareCurves(state: Pick<CompareState, FamilyId | 'a' | 'h'>): CurveScene[] {
  return FAMILY_IDS.filter(id => state[id]).map(id => ({
    id,
    role: FAMILY_ROLE[id],
    label: FAMILY_LABEL[id],
    lines: sampleFamily(id, state.a, state.h, COMPARE_WINDOW),
    labelAt: labelFor(id, state.a, state.h),
  }));
}

/** A cache key: the curves are re-sampled exactly when this changes, never when only x does. */
export const curveKey = (s: CompareState): string => `${FAMILY_IDS.filter(id => s[id]).join(',')}|${s.a}|${s.h}`;

// ---------------------------------------------------------------------------------------------- markers (depend on x too)
export interface Marker { readonly id: FamilyId; readonly role: Role; readonly at: Point }
export function compareMarkers(d: CompareDerived, w = COMPARE_WINDOW): Marker[] {
  const out: Marker[] = [];
  for (const id of d.visible) {
    const y = numberOf(d.values[id]);
    const x = toNumber(d.x);
    if (y !== null && y >= w.yMin && y <= w.yMax) out.push({ id, role: FAMILY_ROLE[id], at: { x, y } });
  }
  return out;
}
/** Where ln is not defined on the x-axis (x ≤ h), as a segment to flag, when ln is shown. */
export function lnGap(d: CompareDerived, w = COMPARE_WINDOW): { from: Point; to: Point } | null {
  if (!d.state.ln) return null;
  const h = toNumber(d.h);
  if (!(h > w.xMin)) return null;
  return { from: { x: w.xMin, y: 0 }, to: { x: Math.min(h, w.xMax), y: 0 } };
}

// ---------------------------------------------------------------------------------------------- inspector
export function compareRows(d: CompareDerived): InspectorRowData[] {
  const rows: InspectorRowData[] = [
    { id: 'x', role: 'ink', symbolTex: 'x', name: 'input', description: describeValue({ kind: 'given', value: d.state.x }, SPOKEN_FORMAT) },
    { id: 'u', role: 'ink', symbolTex: 'x-h', name: 'shifted input x − h', description: describeFamily({ kind: 'exact', value: d.u }), secondary: true },
  ];
  for (const id of d.visible) {
    rows.push({ id: `value-${id}`, role: FAMILY_ROLE[id], symbolTex: SHIFTED[id].symbolTex, name: SHIFTED[id].text, description: describeFamily(d.values[id]) });
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------- text
const sci = (n: number): string => num(n);
function undefinedFamilies(d: CompareDerived): FamilyId[] { return d.visible.filter(id => d.values[id].kind === 'undefined'); }

export function compareVerdict(d: CompareDerived): { text: string; caution: boolean } {
  if (d.visible.length === 0) return { text: 'No family is drawn. Switch one on to see its graph.', caution: false };
  const bad = undefinedFamilies(d);
  if (bad.length > 0) {
    return { text: `ln has no value here: x − h = ${ratText(d.u)} is not positive, and no power of e is zero or negative. The other curves keep going.`, caution: true };
  }
  const nums = d.visible.map(id => ({ id, value: numberOf(d.values[id]) as number }));
  if (nums.length === 1) return { text: `At x = ${ratText(d.x)}, ${SHIFTED[nums[0]!.id].text} is ${describeFamily(d.values[nums[0]!.id]).lines.map(l => `${l.relation} ${l.text}`).join(', ')}.`, caution: false };
  const top = nums.reduce((p, q) => (q.value > p.value ? q : p));
  const bottom = nums.reduce((p, q) => (q.value < p.value ? q : p));
  const t = FAMILY_LABEL[top.id];
  const b = FAMILY_LABEL[bottom.id];
  return top.value === bottom.value
    ? { text: `At x = ${ratText(d.x)} all the drawn curves have the same value, ${sci(top.value)}.`, caution: false }
    : { text: `At x = ${ratText(d.x)} the highest curve is ${t} (${sci(top.value)}) and the lowest is ${b} (${sci(bottom.value)}).`, caution: false };
}

export function compareSpoken(d: CompareDerived): string {
  const parts = d.visible.map(id => `${familyMeta(id).spokenName} scaled and shifted is ${describeFamily(d.values[id], SPOKEN_FORMAT).spoken}`);
  return `x equals ${ratSpoken(d.x)}, a equals ${ratSpoken(d.a)}, h equals ${ratSpoken(d.h)}. ${parts.length ? parts.join('. ') : 'No family is drawn'}.`;
}

export function compareDescription(d: CompareDerived): string {
  const names = d.visible.map(id => familyMeta(id).spokenName);
  const drawn = names.length === 0 ? 'No curve is drawn.' : `The drawn curves are y equals a times g of x minus h for ${names.join(', ')}.`;
  const marked = d.visible.map(id => `${familyMeta(id).spokenName}: ${describeFamily(d.values[id], SPOKEN_FORMAT).spoken}`).join('; ');
  return `Coordinate plane from −7 to 7 on both axes. Vertical scale a is ${ratText(d.a)} and horizontal shift h is ${ratText(d.h)}. ${drawn} A vertical dashed line marks the input x = ${ratText(d.x)}.${marked ? ` Values at that input: ${marked}.` : ''}`;
}

// ---------------------------------------------------------------------------------------------- formulas
const paren = (n: number): string => (n < 0 ? `(${given(n)})` : given(n));
const subTex = (x: number, h: number): string => `${given(x)}-${paren(h)}`;
/** One aligned display block per visible family: the formula, the substituted numbers, the result. */
export function compareFormulas(d: CompareDerived): { id: FamilyId; tex: string }[] {
  return d.visible.map(id => {
    const base = familyMeta(id).g;
    const g = (arg: string): string => (id === 'linear' ? `(${arg})` : base(arg));
    const value = d.values[id];
    const head = `y&=a\\,${g('x-h')}`;
    const sub = `&=${paren(d.state.a)}\\cdot ${g(subTex(d.state.x, d.state.h))}`;
    const sub2 = `&=${paren(d.state.a)}\\cdot ${g(ratTex(d.u))}`;
    const res = ((): string => {
      switch (value.kind) {
        case 'exact': return `&=${ratTex(value.value)}`;
        case 'numeric': return `&\\approx ${num(value.value)}`;
        case 'undefined': return `&\\text{undefined: } x-h\\le 0`;
        case 'overflow': return '&\\text{larger than the largest double}';
      }
    })();
    return { id, tex: aligned([head, sub, sub2, res]) };
  });
}

// ---------------------------------------------------------------------------------------------- facts
export interface FactCard { readonly id: FamilyId; readonly name: string; readonly rows: readonly { readonly label: string; readonly text: string }[] }

function zerosText(f: FamilyFacts, h: Rat): string {
  const z = f.zeros;
  const hs = ratText(h);
  switch (z.kind) {
    case 'none': return 'none';
    case 'everywhere': return 'every x (a = 0 makes the function the constant 0)';
    case 'single': return `x = ${ratText(z.at)}${z.touches ? ' (the graph touches the axis and turns back)' : ''}`;
    case 'periodic': {
      const base = isZero(h) ? '' : `${hs} + `;
      return z.offsetHalfPi === 0 ? `x = ${base}kπ for every integer k` : `x = ${base}π/2 + kπ for every integer k`;
    }
  }
}
function asymptoteText(f: FamilyFacts): string {
  const s = f.asymptote;
  switch (s.kind) {
    case 'none': return 'none';
    case 'vertical': return `the vertical line x = ${ratText(s.x)}`;
    case 'horizontal': return 'the x-axis (y = 0), approached as x goes to −∞';
  }
}
function symmetryText(f: FamilyFacts, h: Rat): string {
  const c = ratText(h);
  switch (f.symmetry.kind) {
    case 'even': return `mirror image in the vertical line x = ${c}`;
    case 'odd': return `turned half a turn about the point (${c}, 0)`;
    case 'none': return 'none';
  }
}
function behaviourText(id: FamilyId, f: FamilyFacts, a: Rat, h: Rat): string {
  const s = sign(a);
  if (s === 0) return 'constant (a = 0)';
  const hs = ratText(h);
  const up = s > 0;
  switch (id) {
    case 'linear': return up ? 'increasing everywhere' : 'decreasing everywhere';
    case 'square': return up ? `decreasing for x < ${hs}, increasing for x > ${hs}` : `increasing for x < ${hs}, decreasing for x > ${hs}`;
    case 'exp': return up ? 'increasing everywhere, faster and faster' : 'decreasing everywhere';
    case 'ln': return up ? 'increasing, but ever more slowly' : 'decreasing, but ever more slowly';
    case 'sin':
    case 'cos': return `oscillates between ${ratText(f.range.lo as Rat)} and ${ratText(f.range.hi as Rat)}, repeating every 2π`;
  }
}

export function compareFacts(d: CompareDerived): FactCard[] {
  return d.visible.map(id => {
    const f = factsOf(id, d.a, d.h);
    const domain = f.domain === 'all' ? 'all real numbers' : `x > ${ratText(d.h)}`;
    return {
      id,
      name: SHIFTED[id].text,
      rows: [
        { label: 'Domain', text: domain },
        { label: 'Range', text: intervalText(f.range.lo, f.range.hi, f.range.loOpen, f.range.hiOpen) },
        { label: 'Zeros', text: zerosText(f, d.h) },
        { label: 'Asymptote', text: asymptoteText(f) },
        { label: 'Behaviour', text: behaviourText(id, f, d.a, d.h) },
        { label: 'Symmetry', text: symmetryText(f, d.h) },
      ],
    };
  });
}

/** Markers for the zeros that fall in the window (drawn as small open circles on the axis). */
export function zeroMarkers(d: CompareDerived, w = COMPARE_WINDOW): { id: FamilyId; role: Role; x: number }[] {
  const out: { id: FamilyId; role: Role; x: number }[] = [];
  for (const id of d.visible) {
    for (const x of zerosIn(factsOf(id, d.a, d.h), d.h, w.xMin + 0.2, w.xMax - 0.2)) out.push({ id, role: FAMILY_ROLE[id], x });
  }
  return out;
}

export { deriveCompare, visibleFamilies };
