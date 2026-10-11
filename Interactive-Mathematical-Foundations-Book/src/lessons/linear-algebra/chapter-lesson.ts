import { coefficient, deriveAddition, deriveBasis, deriveDot, deriveNorm, deriveProjection, deriveScaling, deriveSpan, point, vector, type Vector } from '../../math/linear-algebra/vectors';
import { rationalForm, rootForm } from '../../math/quantity/exactform';
import { toNumber, type Rational } from '../../math/quantity/rational';
import type { RootResult } from '../../math/quantity/root';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import { describeValue, type ValueDescription } from '../../platform/numeric/quantity';
import { formatApprox } from '../../platform/numeric/format';
import type { ParamSpec } from '../../platform/params';
import { traceFrom } from '../../platform/trace';
import type { InspectorRowData } from '../../ui/Inspector';
import type { Role } from '../../ui/plane/primitives';
import { aligned, FORMAT, FORMULA_FORMAT } from '../shared/format';

export type Chapter = 'addition' | 'scaling' | 'norms' | 'dot' | 'projection' | 'span' | 'basis';
// Flat state preserves useLesson's canonical/reset contract; each chapter exposes only its parameters.
export interface State { readonly ux: number; readonly uy: number; readonly vx: number; readonly vy: number; readonly a: number; readonly b: number; readonly px: number; readonly py: number }
export type Field = keyof State;
const BASE: State = { ux: 2, uy: 1, vx: 1, vy: 2, a: 1, b: 1, px: 3, py: 0 };
export const CANONICAL: Record<Chapter, State> = {
  addition: BASE, scaling: { ...BASE, vx: 3, vy: 2, a: -1.5 }, norms: { ...BASE, vx: 3, vy: 4 },
  dot: { ...BASE, ux: 3, uy: 0, vx: 2, vy: 2 }, projection: { ...BASE, ux: 2, uy: 1, vx: 1, vy: 3 },
  span: { ...BASE, a: 1, b: -0.5 }, basis: BASE,
};
export const TITLES: Record<Chapter, string> = {
  addition: 'Two moves, one destination', scaling: 'Scale a move; inspect its sign', norms: 'Length, unit direction, and three unit balls',
  dot: 'Turn two vectors; read their alignment', projection: 'Split a vector along a direction', span: 'Two weights explore the reachable set', basis: 'Move the basis; keep the target fixed',
};
const FIELDS: Record<Chapter, readonly Field[]> = {
  addition: ['ux', 'uy', 'vx', 'vy'], scaling: ['vx', 'vy', 'a'], norms: ['vx', 'vy'], dot: ['ux', 'uy', 'vx', 'vy'],
  projection: ['ux', 'uy', 'vx', 'vy'], span: ['ux', 'uy', 'vx', 'vy', 'a', 'b'], basis: ['ux', 'uy', 'vx', 'vy', 'px', 'py'],
};
const names: Record<Field, string> = { ux: 'x-component of u', uy: 'y-component of u', vx: 'x-component of v', vy: 'y-component of v', a: 'coefficient a', b: 'coefficient b', px: 'x-component of target p', py: 'y-component of target p' };
export function specs(kind: Chapter): Record<Field, ParamSpec> {
  return Object.fromEntries(Object.keys(BASE).map(id => {
    const f = id as Field, scalar = f === 'a' || f === 'b';
    return [f, { id: f, name: kind === 'scaling' && f === 'a' ? 'scalar k' : names[f], symbolTex: kind === 'scaling' && f === 'a' ? 'k' : f.length === 1 ? f : `${f[0]}_${f[1]}`, symbolText: f, domain: { min: scalar ? -2 : -4, max: scalar ? 2 : 4 }, default: CANONICAL[kind][f], step: scalar ? 0.25 : 0.5, maxDecimals: 2, onInvalid: 'reject' }];
  })) as Record<Field, ParamSpec>;
}
export const fields = (kind: Chapter) => FIELDS[kind];
export function presets(kind: Chapter): { id: string; label: string; state: State }[] {
  const s = CANONICAL[kind];
  const list = [{ id: 'canonical', label: 'Worked pair', state: s }];
  if (kind === 'addition') return [...list, { id: 'opposites', label: 'Opposite moves', state: { ...s, vx: -2, vy: -1 } }, { id: 'zero', label: 'Zero second move', state: { ...s, vx: 0, vy: 0 } }];
  if (kind === 'scaling') return [...list, ...[1, 0, -1].map(k => ({ id: `k${k}`, label: `k = ${k < 0 ? '−1' : k}`, state: { ...s, a: k } }))];
  if (kind === 'norms') return [...list, { id: 'diagonal', label: 'Unit diagonal', state: { ...s, vx: 1, vy: 1 } }, { id: 'zero', label: 'Zero vector', state: { ...s, vx: 0, vy: 0 } }];
  if (kind === 'dot') return [...list, { id: 'perpendicular', label: 'Perpendicular', state: { ...s, vx: 0, vy: 3 } }, { id: 'opposed', label: 'Opposed', state: { ...s, vx: -3, vy: 0 } }, { id: 'zero', label: 'Zero vector', state: { ...s, vx: 0, vy: 0 } }];
  if (kind === 'projection') return [...list, { id: 'negative', label: 'Negative component', state: { ...s, vx: -3, vy: 1 } }, { id: 'perpendicular', label: 'Perpendicular', state: { ...s, vx: -1, vy: 2 } }, { id: 'zero-direction', label: 'Zero direction', state: { ...s, ux: 0, uy: 0 } }];
  return [...list, { id: 'dependent', label: 'Collinear directions', state: { ...s, ux: 1, uy: 1, vx: 2, vy: 2 } }, { id: 'zero', label: 'Both directions zero', state: { ...s, ux: 0, uy: 0, vx: 0, vy: 0 } }, { id: 'near', label: 'Almost collinear', state: { ...s, ux: 3, uy: 2.99, vx: 3.01, vy: 3 } }];
}

const rat = (r: Rational): ValueDescription => describeValue({ kind: 'exact', exact: rationalForm(r), approx: toNumber(r) }, FORMAT);
const undef = (reason: string): ValueDescription => describeValue({ kind: 'undefined', reason }, FORMAT);
const numeric = (n: number): ValueDescription => describeValue({ kind: 'numeric', value: n }, FORMAT);
const text = (t: string, tex = `\\text{${t}}`): ValueDescription => ({ status: 'exact', lines: [{ relation: '=', text: t, tex }], spoken: t });
const rtex = (r: Rational) => rationalForm(r).tex;
const rtext = (r: Rational) => rationalForm(r).text;
const vtex = (v: Vector) => `\\begin{bmatrix}${rtex(v.x)}\\\\${rtex(v.y)}\\end{bmatrix}`;
const vtext = (v: Vector) => `(${rtext(v.x)}, ${rtext(v.y)})`;
const vdesc = (v: Vector) => text(vtext(v), vtex(v));
function rootDesc(r: RootResult): ValueDescription {
  return r.kind === 'exact' ? describeValue({ kind: 'exact', exact: rootForm(r.root), approx: r.approx }, FORMAT) : r.kind === 'numeric' ? numeric(r.approx) : undef(r.reason);
}
const rootTex = (r: RootResult) => r.kind === 'exact' ? rootForm(r.root).tex : r.kind === 'numeric' ? formatApprox(r.approx, FORMULA_FORMAT).tex : '\\text{undefined}';
const ntex = (n: number) => formatApprox(n, FORMULA_FORMAT).tex;
const ratioRoot = (r: Rational, root: RootResult, approx: number): ValueDescription => {
  if (r.num === 0n) return rat(r);
  if (root.kind === 'exact') {
    const tex = `\\frac{${rtex(r)}}{${rootTex(root)}}`, t = `${rtext(r)} / (${rootForm(root.root).text})`;
    return describeValue({ kind: 'exact', exact: { text: t, tex, spoken: t, integer: false, irrational: root.root.b !== 1n }, approx }, FORMAT);
  }
  return numeric(approx);
};
const row = (id: string, symbolTex: string, name: string, description: ValueDescription, role: Role = 'derived'): InspectorRowData => ({ id, symbolTex, name, description, role });
export interface SceneArrow { readonly name: string; readonly from: Point; readonly to: Point; readonly role: Role; readonly label: string }
export interface SceneLine { readonly name: string; readonly from: Point; readonly to: Point; readonly role: Role; readonly dashed: boolean }
export interface Scene {
  arrows: SceneArrow[]; lines: SceneLine[]; polygons: { name: string; corners: readonly Point[]; role: Role }[];
  arc: { from: number; to: number } | null; rightAngle: { corner: Point; towardA: Point; towardB: Point } | null;
  handles: { prefix: 'u' | 'v' | 'p'; at: Point; role: Role }[]; window: WorldWindow;
}
export interface Derived {
  readonly rows: InspectorRowData[]; readonly formulas: string[]; readonly scene: Scene; readonly verdict: string;
  readonly result: Point | null; readonly rank?: number;
}

export function deriveLesson(kind: Chapter, s: State): Derived {
  const u = vector(s.ux, s.uy), v = vector(s.vx, s.vy), p = vector(s.px, s.py);
  const O = { x: 0, y: 0 }, U = point(u), V = point(v);
  const scene: Scene = { arrows: [], lines: [], polygons: [], arc: null, rightAngle: null, handles: [], window: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 } };
  const arrow = (name: string, from: Point, to: Point, role: Role, label: string) => scene.arrows.push({ name, from, to, role, label });
  const line = (name: string, from: Point, to: Point, role: Role, dashed = true) => scene.lines.push({ name, from, to, role, dashed });
  let rows: InspectorRowData[] = [], formulas: string[] = [], verdict = '', result: Point | null = null, rank: number | undefined;
  if (kind === 'scaling' || kind === 'norms') {
    arrow('v', O, V, 'primary', 'v'); scene.handles.push({ prefix: 'v', at: V, role: 'primary' });
    rows.push(row('v', '\\mathbf v', 'original vector', vdesc(v), 'primary'));
  } else {
    arrow('u', O, U, 'x', 'u'); arrow('v', O, V, 'y', 'v');
    scene.handles.push({ prefix: 'u', at: U, role: 'x' }, { prefix: 'v', at: V, role: 'y' });
    rows.push(row('u', '\\mathbf u', 'first direction', vdesc(u), 'x'), row('v', '\\mathbf v', 'second vector', vdesc(v), 'y'));
  }
  switch (kind) {
    case 'addition': {
      const d = deriveAddition(u, v); result = point(d.sum);
      arrow('translated-v', U, result, 'y', 'v'); arrow('translated-u', V, result, 'x', 'u'); arrow('sum', O, result, 'primary', 'u + v');
      arrow('difference', U, V, 'derived', 'v − u');
      rows.push(row('sum', '\\mathbf u+\\mathbf v', 'combined move', vdesc(d.sum), 'primary'), row('difference', '\\mathbf v-\\mathbf u', 'from the tip of u to the tip of v', vdesc(d.difference)), row('reverse-difference', '\\mathbf u-\\mathbf v', 'the reverse move', vdesc(d.reverseDifference)));
      formulas = [aligned([`\\mathbf u+\\mathbf v&=${vtex(u)}+${vtex(v)}=${vtex(d.sum)}`, `\\mathbf v+\\mathbf u&=${vtex(d.reverseSum)}`]), aligned([`\\mathbf v-\\mathbf u&=${vtex(v)}-${vtex(u)}=${vtex(d.difference)}`, `\\mathbf u-\\mathbf v&=${vtex(d.reverseDifference)}`])];
      verdict = `Either head-to-tail order ends at ${vtext(d.sum)}. The diagonal from u to v is v − u = ${vtext(d.difference)}; reversing that arrow negates both components.`;
      break;
    }
    case 'scaling': {
      const d = deriveScaling(v, coefficient(s.a)); result = point(d.scaled); arrow('scaled', O, result, 'derived', 'kv');
      rows.push(row('k', 'k', 'scalar', rat(d.k), 'ink'), row('scaled', 'k\\mathbf v', 'scaled vector', vdesc(d.scaled)), row('norm', '\\norm{\\mathbf v}', 'original length', rootDesc(d.norm)), row('scaled-norm', '\\norm{k\\mathbf v}', 'scaled length', rootDesc(d.scaledNorm)), row('direction', '\\text{direction}', 'relative direction', d.direction === 'undefined' ? undef('The scaled vector is zero and has no direction.') : text(d.direction)));
      formulas = [`k\\mathbf v=${rtex(d.k)}${vtex(v)}=${vtex(d.scaled)}`, `\\norm{k\\mathbf v}=|k|\\norm{\\mathbf v}=${rootTex(d.scaledNorm)}`];
      verdict = d.direction === 'undefined' ? 'The result is the zero vector. Its length is zero; its direction is undefined.' : `The length is multiplied by |k|. The direction is ${d.direction === 'reversed' ? 'reversed because k is negative' : 'preserved because k is positive'}.`;
      break;
    }
    case 'norms': {
      const d = deriveNorm(v); result = d.unit;
      scene.polygons.push({ name: 'l1-ball', corners: d.diamond, role: 'x' }, { name: 'linf-ball', corners: d.square, role: 'y' });
      d.circle.slice(1).forEach((to, i) => line(`l2-ball-${i}`, d.circle[i]!, to, 'derived', false));
      if (d.unit) arrow('unit', O, d.unit, 'derived', 'v̂');
      const unitDesc = d.unit ? text(`(${ratioRoot(v.x, d.norm, d.unit.x).lines[0]!.text}, ${ratioRoot(v.y, d.norm, d.unit.y).lines[0]!.text})`, `\\frac{1}{${rootTex(d.norm)}}${vtex(v)}`) : undef('Zero has no unit direction; division by its norm would divide by zero.');
      rows.push(row('norm', '\\norm{\\mathbf v}_2', 'Euclidean length', rootDesc(d.norm)), row('l1', '\\norm{\\mathbf v}_1', 'taxicab length', rat(d.l1), 'x'), row('linf', '\\norm{\\mathbf v}_\\infty', 'largest component magnitude', rat(d.linf), 'y'), row('unit', '\\widehat{\\mathbf v}', 'unit vector (exact expression)', unitDesc));
      if (d.unit) rows.push(row('unit-x', '\\widehat v_x', 'unit x-component', ratioRoot(v.x, d.norm, d.unit.x)), row('unit-y', '\\widehat v_y', 'unit y-component', ratioRoot(v.y, d.norm, d.unit.y)), row('unit-length', '\\norm{\\widehat{\\mathbf v}}', 'unit length', text('1', '1')));
      formulas = [`\\norm{\\mathbf v}_2=\\sqrt{${rtex(d.sq)}}=${rootTex(d.norm)}`, d.unit ? `\\widehat{\\mathbf v}=\\frac{1}{${rootTex(d.norm)}}${vtex(v)},\\quad \\norm{\\widehat{\\mathbf v}}=1` : '\\widehat{\\mathbf 0}\\text{ is undefined}', `\\norm{\\mathbf v}_1=${rtex(d.l1)},\\quad\\norm{\\mathbf v}_\\infty=${rtex(d.linf)}`];
      verdict = d.unit ? 'The normalized arrow has length 1 and keeps the direction of v. Diamond = L₁ unit ball; circle = L₂; square = L∞. These are three different meanings of distance.' : 'A zero vector has length 0 in every norm, but normalization is undefined.';
      break;
    }
    case 'dot': {
      const d = deriveDot(u, v);
      if (d.projection.defined) {
        arrow('component', O, point(d.projection.projected), 'derived', 'parallel part');
        line('component-residual', point(d.projection.projected), V, 'derived');
        rows.push(row('signed', 's', 'signed component along u', ratioRoot(d.product, d.uNorm, d.projection.signedScalar)));
      }
      if (d.startAngle !== null && d.endAngle !== null) scene.arc = { from: d.startAngle, to: d.endAngle };
      if (d.orthogonal && d.angle) scene.rightAngle = { corner: O, towardA: U, towardB: V };
      rows.push(row('dot', '\\mathbf u\\cdot\\mathbf v', 'dot product', rat(d.product), 'primary'), row('x-product', 'u_xv_x', 'first component product', rat(d.xProduct)), row('y-product', 'u_yv_y', 'second component product', rat(d.yProduct)), row('angle', '\\theta', 'angle in radians', d.angle ? numeric(d.angle.radians) : undef('An angle requires two nonzero vectors.')), row('cosine', '\\cos\\theta', 'normalized alignment', d.angle ? numeric(d.angle.cosine) : undef('One vector is zero.')));
      formulas = [aligned([`\\mathbf u\\cdot\\mathbf v&=u_xv_x+u_yv_y`, `&=${rtex(d.xProduct)}+(${rtex(d.yProduct)})=${rtex(d.product)}`]), d.angle ? `\\cos\\theta=\\frac{\\mathbf u\\cdot\\mathbf v}{\\norm{\\mathbf u}\\norm{\\mathbf v}}\\approx ${ntex(d.angle.cosine)},\\quad\\theta\\approx ${ntex(d.angle.radians)}\\,\\mathrm{rad}` : '\\theta\\text{ is undefined: a vector is zero}'];
      verdict = !d.angle ? 'The dot product is 0, but the angle is undefined because one vector is zero. Algebraic orthogonality includes zero; a right angle requires nonzero directions.' : d.product.num === 0n ? 'The component products cancel exactly. These nonzero vectors meet at a right angle.' : d.product.num > 0n ? 'A positive dot product means an acute angle: the directions partly agree.' : 'A negative dot product means an obtuse angle: the directions partly oppose.';
      break;
    }
    case 'projection': {
      const d = deriveProjection(u, v);
      rows.push(row('dot', '\\mathbf v\\cdot\\mathbf u', 'alignment numerator', rat(d.product)), row('denominator', '\\mathbf u\\cdot\\mathbf u', 'squared direction length', rat(d.denominator)));
      if (d.defined) {
        result = point(d.projected); arrow('projection', O, result, 'primary', 'projᵤv'); arrow('residual', result, V, 'derived', 'r');
        scene.rightAngle = { corner: result, towardA: O, towardB: V };
        rows.push(row('factor', '\\alpha', 'coefficient multiplying u', rat(d.factor)), row('signed', 's', 'signed scalar projection', ratioRoot(d.product, d.uNorm, d.signedScalar)), row('projection', '\\operatorname{proj}_{\\mathbf u}\\mathbf v', 'vector projection', vdesc(d.projected), 'primary'), row('residual', '\\mathbf r', 'perpendicular residual', vdesc(d.residual)), row('residual-dot', '\\mathbf r\\cdot\\mathbf u', 'orthogonality check', rat(d.residualDot)), row('distance', '\\norm{\\mathbf r}', 'distance to the line', rootDesc(d.distance)));
        formulas = [`\\alpha=\\frac{${rtex(d.product)}}{${rtex(d.denominator)}}=${rtex(d.factor)},\\quad\\operatorname{proj}_{\\mathbf u}\\mathbf v=${vtex(d.projected)}`, `\\mathbf v=${vtex(d.projected)}+${vtex(d.residual)},\\quad\\mathbf r\\cdot\\mathbf u=${rtex(d.residualDot)}`];
        verdict = 'The arrow along u plus the perpendicular residual reconstructs v exactly. The distance to the entire line is ‖r‖; the signed scalar component may be negative.';
      } else {
        const reason = 'A direction must be nonzero: u · u is zero.';
        rows.push(row('projection', '\\operatorname{proj}_{\\mathbf u}\\mathbf v', 'vector projection', undef(reason)), row('residual', '\\mathbf r', 'residual', undef(reason)), row('signed', 's', 'signed scalar projection', undef(reason)), row('distance', '\\norm{\\mathbf r}', 'distance to a direction', undef(reason)));
        formulas = ['\\operatorname{proj}_{\\mathbf 0}\\mathbf v\\text{ is undefined}']; verdict = reason;
      }
      break;
    }
    case 'span': {
      const d = deriveSpan(u, v, coefficient(s.a), coefficient(s.b)); rank = d.rank; result = point(d.w);
      arrow('weighted-u', O, point(d.au), 'x', 'au'); arrow('weighted-v', point(d.au), result, 'y', 'bv'); arrow('combination', O, result, 'primary', 'w');
      if (d.rank === 2) { scene.polygons.push({ name: 'reachable', corners: d.corners, role: 'derived' }); d.grid.forEach((g, i) => line(`coefficient-grid-${i}`, g.from, g.to, g.family === 'u' ? 'x' : 'y')); }
      if (d.reach) line('reachable-line', d.reach[0]!, d.reach[3]!, 'derived', false);
      rows.push(row('a', 'a', 'first weight', rat(d.a), 'x'), row('b', 'b', 'second weight', rat(d.b), 'y'), row('w', '\\mathbf w', 'linear combination', vdesc(d.w), 'primary'), row('rank', '\\dim\\operatorname{span}', 'number of independent directions', text(String(d.rank), String(d.rank))));
      formulas = [`\\mathbf w=${rtex(d.a)}${vtex(u)}+(${rtex(d.b)})${vtex(v)}=${vtex(d.w)}`, `\\operatorname{span}\\{\\mathbf u,\\mathbf v\\}=${d.rank === 2 ? '\\mathbb R^2' : d.rank === 1 ? '\\text{a line through the origin}' : '\\{\\mathbf 0\\}'}`];
      verdict = d.rank === 2 ? 'Unrestricted real coefficients reach the entire plane. The shaded parallelogram is only the coefficient window −2 ≤ a,b ≤ 2; its grid comes from these actual directions.' : d.rank === 1 ? 'The two directions are redundant: every combination stays on one line. The thick segment is the portion reached by these bounded controls.' : 'Both directions are zero: all coefficients lead to the origin. The span is a point.';
      break;
    }
    case 'basis': {
      const d = deriveBasis(u, v, p); rank = d.rank; result = point(p); scene.handles.push({ prefix: 'p', at: result, role: 'primary' });
      rows.push(row('target', '\\mathbf p', 'target in standard coordinates', vdesc(p), 'primary'), row('det', '\\Delta', 'two-direction determinant', rat(d.det)));
      if (d.unique) {
        arrow('basis-au', O, point(d.au), 'x', 'au'); arrow('basis-bv', point(d.au), result, 'y', 'bv');
        d.grid.forEach((g, i) => line(`basis-grid-${i}`, g.from, g.to, g.family === 'u' ? 'x' : 'y'));
        rows.push(row('a', 'a', 'first basis coordinate', rat(d.a), 'x'), row('b', 'b', 'second basis coordinate', rat(d.b), 'y'), row('reconstruction', 'a\\mathbf u+b\\mathbf v', 'reconstructed target', vdesc(d.reconstructed)), row('separation', '|\\sin\\theta|', 'relative separation of directions', numeric(d.separation)));
        formulas = [`\\Delta=u_xv_y-u_yv_x=${rtex(d.det)}\\ne0`, `a=\\frac{p_xv_y-p_yv_x}{\\Delta}=${rtex(d.a)},\\quad b=\\frac{u_xp_y-u_yp_x}{\\Delta}=${rtex(d.b)}`, `\\mathbf p=${rtex(d.a)}${vtex(u)}+(${rtex(d.b)})${vtex(v)}=${vtex(d.reconstructed)}`];
        verdict = d.sensitive ? 'This is a basis, but its directions are almost collinear. Small input errors can greatly change the coordinates; exact nonzero determinant does not guarantee numerical reliability.' : 'These two directions form a basis. Each target has exactly one coordinate pair (a, b); the target stays fixed when you move only the basis.';
      } else {
        const reason = d.reachable ? 'The target is in the span, but infinitely many coefficient pairs represent it.' : 'The target is outside the span: no coefficient pair represents it.';
        rows.push(row('a', 'a', 'unique first basis coordinate', undef(reason)), row('b', 'b', 'unique second basis coordinate', undef(reason)));
        formulas = ['\\Delta=0\\quad\\Longrightarrow\\quad\\text{no basis of the plane}']; verdict = `Singular directions. ${reason}`;
        if (d.axis) line('span-line', { x: -6 * d.axis.x, y: -6 * d.axis.y }, { x: 6 * d.axis.x, y: 6 * d.axis.y }, 'derived');
      }
      arrow('target', O, result, 'primary', 'p'); break;
    }
  }
  const corners = [...scene.arrows.flatMap(a => [a.from, a.to]), ...scene.polygons.flatMap(p => p.corners), ...scene.lines.flatMap(l => [l.from, l.to])];
  const radius = Math.max(5.5, ...corners.flatMap(p => [Math.abs(p.x) + 1.5, Math.abs(p.y) + 1.5]));
  scene.window = { xMin: -radius, xMax: radius, yMin: -radius, yMax: radius };
  return { rows, formulas, scene, verdict, result, rank };
}

const WORK: Record<Chapter, readonly string[]> = {
  addition: ['Move u = (2, 1), then v = (1, 2): add the horizontal and vertical moves separately.', 'Both orders end at (3, 3). The arrow between tips is v − u = (−1, 1).'],
  scaling: ['Multiply both components of v = (3, 2) by −1.5.', 'The result (−4.5, −3) reverses direction; its length is 1.5√13, never a negative length.'],
  norms: ['For v = (3, 4), the squared length is 9 + 16 = 25, so the length is 5.', 'Divide each component by 5: (3/5, 4/5) has squared length 9/25 + 16/25 = 1. L₁ = 7, L∞ = 4.'],
  dot: ['For u = (3, 0) and v = (2, 2), multiply matching components: 6 + 0 = 6.', 'The cosine is 1/√2, so the acute angle is π/4 radians.'],
  projection: ['For u = (2, 1) and v = (1, 3), v · u = 5 and u · u = 5; the multiplier is 1.', 'Projection (2, 1) plus residual (−1, 2) gives (1, 3). The residual dot u is −2 + 2 = 0, and distance is √5.'],
  span: ['With u = (2, 1), v = (1, 2), a = 1 and b = −0.5, the two moves are (2, 1) and (−0.5, −1).', 'Their sum is (1.5, 0). The independent directions allow every point with unrestricted coefficients.'],
  basis: ['For u = (2, 1), v = (1, 2), p = (3, 0), Δ = 4 − 1 = 3.', 'Eliminate each weight in turn: a = 2 and b = −1.', 'Check reconstruction: 2(2, 1) − (1, 2) = (3, 0).'],
};
export function workedFrames(kind: Chapter) {
  const d = deriveLesson(kind, CANONICAL[kind]);
  return traceFrom(WORK[kind].map((explanation, i) => ({ state: { inputs: CANONICAL[kind], rows: d.rows, formula: d.formulas[Math.min(i, d.formulas.length - 1)]!, step: i }, explanation })));
}
