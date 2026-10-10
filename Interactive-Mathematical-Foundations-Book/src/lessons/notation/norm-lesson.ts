/**
 * Lesson views for the norm stage: a vector x = (x1, x2) in the plane and its three norms, exact. The ℓ1 ball is a diamond, the ℓ2 ball a circle
 * and the ℓ∞ ball a square; the ball of the chosen norm through x shows what "the same size" means for that norm.
 *
 *   NormLessonState → norms() → { exact norms · chain of inequalities · plane scene · inspector · formulas · Python }
 */
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { equals, form, mul, q } from '../../math/notation/rational';
import { decimalToQ } from '../../math/notation/gradient';
import { ballCorners, norms, radicalForm, radicalToNumber, type NormId, type NormsDerived } from '../../math/notation/norms';
import { qDescription, radicalDescription } from './view';

export interface NormLessonState { readonly x1: number; readonly x2: number; readonly norm: NormId }
export const CANONICAL_NORM: NormLessonState = Object.freeze({ x1: 3, x2: 4, norm: '2' });
export const NORM_WINDOW = Object.freeze({ xMin: -8, xMax: 8, yMin: -8, yMax: 8 });
export const COORD_MAX = 4;

const coord = (id: string, name: string, symbolTex: string, symbolText: string, def: number): ParamSpec => ({ id, name, symbolTex, symbolText, domain: { min: -COORD_MAX, max: COORD_MAX }, default: def, step: 0.5, maxDecimals: 2, onInvalid: 'reject' });
export const X1_SPEC = coord('x1', 'first entry', 'x_1', 'x1', 3);
export const X2_SPEC = coord('x2', 'second entry', 'x_2', 'x2', 4);

export const NORM_OPTIONS = Object.freeze([
  { id: '1', label: 'ℓ₁' },
  { id: '2', label: 'ℓ₂' },
  { id: 'inf', label: 'ℓ∞' },
] as const);

export interface NormPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: NormLessonState }
const P = (id: string, label: string, aria: string, s: Partial<NormLessonState>): NormPreset => Object.freeze({ id, label, aria, state: Object.freeze({ ...CANONICAL_NORM, ...s }) });
export const NORM_PRESETS: readonly NormPreset[] = Object.freeze([
  P('three-four', '(3, 4)', 'the vector three, four, whose norms are all whole numbers', {}),
  P('diagonal', '(1, 1)', 'the vector one, one, whose two-norm is an irrational number', { x1: 1, x2: 1 }),
  P('axis', '(4, 0)', 'a vector along the x axis, where all three norms agree', { x1: 4, x2: 0 }),
  P('negative', '(−3, 2)', 'a vector with a negative entry', { x1: -3, x2: 2 }),
  P('half', '(1.5, 0.5)', 'a vector with fractional entries', { x1: 1.5, x2: 0.5 }),
  P('zero', '(0, 0)', 'the zero vector', { x1: 0, x2: 0 }),
]);
export const normPresetMatches = (s: NormLessonState, p: NormPreset): boolean => (Object.keys(CANONICAL_NORM) as (keyof NormLessonState)[]).every(key => Object.is(s[key], p.state[key]));

export interface NormLessonDerived {
  readonly state: NormLessonState;
  readonly n: NormsDerived;
  /** The radius of the chosen norm's ball through x (a double, for drawing only). */
  readonly radius: number;
}

export function deriveNormLesson(state: NormLessonState): NormLessonDerived {
  const n = norms([decimalToQ(state.x1), decimalToQ(state.x2)]);
  const radius = state.norm === '1' ? Number(n.l1.num) / Number(n.l1.den) : state.norm === 'inf' ? Number(n.linf.num) / Number(n.linf.den) : radicalToNumber(n.l2);
  return Object.freeze({ state, n, radius });
}

// ---------------------------------------------------------------------------------------------- scene
export interface Pt { readonly x: number; readonly y: number }
export const circlePoints = (r: number, count = 96): readonly Pt[] => Array.from({ length: count }, (_, m) => ({ x: r * Math.cos((2 * Math.PI * m) / count), y: r * Math.sin((2 * Math.PI * m) / count) }));
export const ballPoints = (norm: NormId, r: number): readonly Pt[] => (norm === '2' ? circlePoints(r) : ballCorners(norm, r));

export interface NormScene {
  readonly unit: readonly { readonly norm: NormId; readonly points: readonly Pt[] }[];
  readonly ball: { readonly norm: NormId; readonly points: readonly Pt[]; readonly radius: number } | null;
  readonly point: Pt;
}
export function normScene(derived: NormLessonDerived): NormScene {
  const { state: s, radius, n } = derived;
  return {
    unit: (['1', '2', 'inf'] as const).map(norm => ({ norm, points: ballPoints(norm, 1) })),
    ball: n.zero ? null : { norm: s.norm, points: ballPoints(s.norm, radius), radius },
    point: { x: s.x1, y: s.x2 },
  };
}

// ---------------------------------------------------------------------------------------------- text
const NORM_NAME: Readonly<Record<NormId, string>> = Object.freeze({ '1': 'ℓ₁ norm, the sum of absolute values', '2': 'ℓ₂ norm, the Euclidean length', inf: 'ℓ∞ norm, the largest absolute value' });
export const normSymbolTex = (norm: NormId): string => `\\lVert\\mathbf{x}\\rVert_{${norm === 'inf' ? '\\infty' : norm}}`;

export function normRows(derived: NormLessonDerived): InspectorRowData[] {
  const { n, state: s } = derived;
  const row = (norm: NormId, role: InspectorRowData['role'], description: InspectorRowData['description']): InspectorRowData => ({
    id: `l${norm}`, role, symbolTex: normSymbolTex(norm), name: NORM_NAME[norm], description, secondary: norm !== s.norm,
  });
  return [
    row('1', 'x', qDescription(n.l1)),
    row('2', 'primary', radicalDescription(n.l2)),
    row('inf', 'y', qDescription(n.linf)),
    { id: 'l2sq', role: 'derived', symbolTex: '\\lVert\\mathbf{x}\\rVert_{2}^{2}', name: 'the sum of the squares, exact', description: qDescription(n.l2squared), secondary: true },
  ];
}

const vecText = (derived: NormLessonDerived): string => `(${form(decimalToQ(derived.state.x1)).text}, ${form(decimalToQ(derived.state.x2)).text})`;

export interface NormFormula { readonly id: string; readonly label: string; readonly tex: string }
export function normFormulas(derived: NormLessonDerived): NormFormula[] {
  const { n, state: s } = derived;
  const a = form(decimalToQ(s.x1));
  const b = form(decimalToQ(s.x2));
  const abs = (f: typeof a) => (f.tex.startsWith('-') ? f.tex.slice(1) : f.tex);
  const l2 = radicalForm(n.l2);
  const inf = form(n.linf).tex;
  return [
    { id: 'l1', label: 'The sum of absolute values, scrollable', tex: `\\lVert\\mathbf{x}\\rVert_1=\\lvert ${a.tex}\\rvert+\\lvert ${b.tex}\\rvert=${abs(a)}+${abs(b)}=${form(n.l1).tex}` },
    { id: 'l2', label: 'The Euclidean length, scrollable', tex: `\\lVert\\mathbf{x}\\rVert_2=\\sqrt{(${a.tex})^2+(${b.tex})^2}=\\sqrt{${form(n.l2squared).tex}}=${l2.tex}` },
    { id: 'linf', label: 'The largest absolute value, scrollable', tex: `\\lVert\\mathbf{x}\\rVert_\\infty=\\max\\left(\\lvert ${a.tex}\\rvert,\\lvert ${b.tex}\\rvert\\right)=${inf}` },
    { id: 'chain', label: 'The chain of the three norms, scrollable', tex: normChainTex(derived) },
  ];
}

export function normCode(derived: NormLessonDerived): string {
  const { state: s } = derived;
  return [
    'import numpy as np',
    '',
    `x = np.array([${s.x1}, ${s.x2}])`,
    'np.linalg.norm(x, ord=1)       # l1',
    'np.linalg.norm(x)              # l2, the default',
    'np.linalg.norm(x, ord=np.inf)  # l-infinity',
  ].join('\n');
}

export function normChainTex(derived: NormLessonDerived): string {
  const { n } = derived;
  const rel = (holds: boolean, equal: boolean): string => (equal ? '=' : holds ? '\\le' : '>');
  const twoInf = mul(q(2), n.linf);
  const links = [
    `\\lVert\\mathbf{x}\\rVert_\\infty=${form(n.linf).tex}`,
    rel(n.chain.infLeL2, n.equalities.includes('inf=2')),
    `\\lVert\\mathbf{x}\\rVert_2=${radicalForm(n.l2).tex}`,
    rel(n.chain.l2LeL1, n.equalities.includes('2=1')),
    `\\lVert\\mathbf{x}\\rVert_1=${form(n.l1).tex}`,
    rel(n.chain.l1LeDInf, equals(n.l1, twoInf)),
    `2\\lVert\\mathbf{x}\\rVert_\\infty=${form(twoInf).tex}`,
  ];
  return links.join('\\ ');
}

export function normVerdict(derived: NormLessonDerived): { text: string; caution: boolean } {
  const { n, state: s } = derived;
  if (n.zero) return { text: 'The zero vector has all three norms equal to 0, and it is the only vector with norm 0. Its ball of any radius is the single point 0, so nothing is drawn through it.', caution: false };
  const l2 = radicalForm(n.l2);
  const same = n.equalities.length > 0
    ? ` Here ${n.equalities.map(e => ({ 'inf=2': 'ℓ∞ = ℓ₂', '2=1': 'ℓ₂ = ℓ₁', 'inf=1': 'ℓ∞ = ℓ₁' })[e]).join(' and ')}: this happens when the vector has a single non-zero entry.`
    : '';
  const irrational = l2.exactRational ? '' : ` The ℓ₂ norm ${l2.text} is irrational: no decimal is equal to it, so the decimal shown is only an approximation.`;
  const chosen = { '1': 'ℓ₁ ball (a diamond)', '2': 'ℓ₂ ball (a circle)', inf: 'ℓ∞ ball (a square)' }[s.norm];
  return {
    text: `For x = ${vecText(derived)}: ℓ∞ ≤ ℓ₂ ≤ ℓ₁ ≤ 2·ℓ∞ always holds, and it holds here (${form(n.linf).text} ≤ ${l2.text} ≤ ${form(n.l1).text} ≤ ${form(n.linf).text === '0' ? '0' : `2 · ${form(n.linf).text}`}). The vector lies on the boundary of the ${chosen} that passes through it.${same}${irrational}`,
    caution: false,
  };
}

export function normSpoken(derived: NormLessonDerived): string {
  const { n } = derived;
  return `Vector ${vecText(derived)}: one-norm ${form(n.l1).spoken}, two-norm ${radicalForm(n.l2).spoken}, infinity-norm ${form(n.linf).spoken}.`;
}

export function normPlaneLabel(derived: NormLessonDerived): string {
  return `The vector ${vecText(derived)} drawn from the origin. Three small unit balls are drawn around the origin: a diamond for ℓ₁, a circle for ℓ₂ and a square for ℓ∞. ${derived.n.zero ? 'The vector is zero, so no larger ball is drawn.' : `The larger outline is the ${{ '1': 'ℓ₁', '2': 'ℓ₂', inf: 'ℓ∞' }[derived.state.norm]} ball of radius ${derived.state.norm === '1' ? form(derived.n.l1).text : derived.state.norm === 'inf' ? form(derived.n.linf).text : radicalForm(derived.n.l2).text}, and the vector lies on it.`}`;
}
