/** Bounded educational SVM. Canonical derivation: code/python/p07/svm.py. */
export type Vec2 = readonly [number, number];
export interface Point { readonly id: string; readonly x: Vec2; readonly y: number }
export interface Kernel { readonly kind: 'linear' | 'polynomial' | 'rbf'; readonly gamma: number; readonly coef0: number; readonly degree: number }
export interface SVMState { readonly mode: 'hard' | 'soft' | 'kernel'; readonly points: readonly Point[]; readonly C: number; readonly kernel: Kernel }
export interface Row { id: string; score: number; decision: number; margin: number; slack: number; hinge: number; signedDistance: number | null; support: boolean; onMargin: boolean; alpha: number }
export interface Result { status: 'solved' | 'approximate' | 'infeasible' | 'failed'; reason: string; gram: number[][]; rows: Row[]; alpha: number[]; w: Vec2 | null; b: number | null; norm2: number | null; halfMargin: number | null; primal: number | null; dual: number | null; gap: number | null; kkt: number | null; equality: number | null; bounds: number | null; iterations: number }
export const EPS = 1e-9, KKT_TOL = 2e-5, GAP_TOL = 1e-5, MAX_STEPS = 1200;
export function real(v: unknown, lo = -Infinity, hi = Infinity): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) throw new RangeError('Expected a finite real number within the supported range; Booleans are rejected.');
  return v;
}
function finite(v: number) { if (!Number.isFinite(v)) throw new RangeError('Computed arithmetic is not representable.'); return v; }
function mul(a: number, b: number) { const v = finite(a * b); if (a !== 0 && b !== 0 && v === 0) throw new RangeError('Nonzero product underflows binary64.'); return v; }
const dot = (a: Vec2, b: Vec2) => finite(mul(a[0], b[0]) + mul(a[1], b[1]));
const sub = (a: Vec2, b: Vec2): Vec2 => [finite(a[0] - b[0]), finite(a[1] - b[1])];
function dyadicInteger(value: number): bigint {
  const view = new DataView(new ArrayBuffer(8)); view.setFloat64(0, value);
  const bits = view.getBigUint64(0), exponent = Number((bits >> 52n) & 0x7ffn), fraction = bits & ((1n << 52n) - 1n);
  const magnitude = exponent === 0 ? fraction : ((1n << 52n) + fraction) << BigInt(exponent - 1);
  return bits >> 63n ? -magnitude : magnitude;
}
function orientation(a: Vec2, b: Vec2, c: Vec2): number {
  const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - a[0], vy = c[1] - a[1];
  const left = ux * vy, right = uy * vx, determinant = left - right;
  const error = 8 * Number.EPSILON * (Math.abs(left) + Math.abs(right));
  if (Math.abs(left) >= 2 ** -1022 && Math.abs(right) >= 2 ** -1022 && Math.abs(determinant) > error) return Math.sign(determinant);
  // Exact signs use original coordinates; BigInts never enter state, weights or JSON.
  const ax = dyadicInteger(a[0]), ay = dyadicInteger(a[1]), bx = dyadicInteger(b[0]), by = dyadicInteger(b[1]), cx = dyadicInteger(c[0]), cy = dyadicInteger(c[1]);
  const exact = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  return exact > 0n ? 1 : exact < 0n ? -1 : 0;
}
const sum = (a: readonly number[]) => a.reduce((total, v) => finite(total + v), 0);
export function validate(s: SVMState): void {
  if (!s || !['hard', 'soft', 'kernel'].includes(s.mode)) throw new RangeError('Choose hard, soft or kernel mode.');
  if (!Array.isArray(s.points) || s.points.length < 2 || s.points.length > 12) throw new RangeError('Use 2–12 dense observations.');
  const ids = new Set<string>(), labels = new Set<number>();
  for (let i = 0; i < s.points.length; i++) {
    const p = s.points[i];
    if (!p || typeof p.id !== 'string' || !p.id.trim() || ids.has(p.id)) throw new RangeError('Observations require unique nonempty IDs.');
    ids.add(p.id);
    if (!Array.isArray(p.x) || p.x.length !== 2) throw new RangeError('Each observation needs exactly two dense coordinates.');
    real(p.x[0], -5, 5); real(p.x[1], -5, 5);
    if (![-1, 1].includes(real(p.y))) throw new RangeError('Labels must be −1 or +1.');
    labels.add(p.y);
  }
  if (labels.size !== 2) throw new RangeError('Both labels are required.');
  real(s.C, .01, 20);
  if (!s.kernel || !['linear', 'polynomial', 'rbf'].includes(s.kernel.kind)) throw new RangeError('Unknown kernel.');
  real(s.kernel.gamma, .05, 2); real(s.kernel.coef0, 0, 2);
  if (!Number.isInteger(real(s.kernel.degree, 1, 4))) throw new RangeError('Polynomial degree must be integral.');
}
export function kernelValue(a: Vec2, b: Vec2, k: Kernel): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 2 || b.length !== 2) throw new RangeError('Kernel vectors need two dense coordinates.');
  a.forEach(v => real(v, -6, 6)); b.forEach(v => real(v, -6, 6)); real(a[0]); real(a[1]); real(b[0]); real(b[1]);
  if (!k || !['linear', 'polynomial', 'rbf'].includes(k.kind)) throw new RangeError('Unknown kernel.');
  real(k.gamma, .05, 2); real(k.coef0, 0, 2); if (!Number.isInteger(real(k.degree, 1, 4))) throw new RangeError('Polynomial degree must be integral.');
  if (k.kind === 'linear') return dot(a, b);
  if (k.kind === 'polynomial') {
    const base = finite(mul(k.gamma, dot(a, b)) + k.coef0);
    let result = 1; for (let j = 0; j < k.degree; j++) result = mul(result, base); return result;
  }
  const delta = sub(a, b), v = Math.exp(-mul(k.gamma, dot(delta, delta)));
  if (v === 0) throw new RangeError('RBF similarity underflows binary64.'); return finite(v);
}
export function hinge(margin: number) { const m = real(margin); return { loss: Math.max(0, finite(1 - m)), subgradient: m < 1 ? -1 : 0 }; }
function hull(points: readonly Point[], label: number): number[] {
  const indices = points.map((_, i) => i).filter(i => points[i]!.y === label).sort((i, j) => points[i]!.x[0] - points[j]!.x[0] || points[i]!.x[1] - points[j]!.x[1]);
  const unique = indices.filter((i, z) => z === 0 || points[i]!.x.some((v, j) => v !== points[indices[z - 1]!]!.x[j]));
  function chain(seq: number[]) {
    const out: number[] = [];
    for (const i of seq) {
      while (out.length >= 2 && orientation(points[out[out.length - 2]!]!.x, points[out[out.length - 1]!]!.x, points[i]!.x) <= 0) out.pop();
      out.push(i);
    } return out;
  }
  return unique.length <= 2 ? unique : [...chain(unique).slice(0, -1), ...chain([...unique].reverse()).slice(0, -1)];
}
const edges = (h: number[]): [number, number][] => h.map((i, j) => [i, h[(j + 1) % h.length]!]);
const inside = (x: Vec2, h: number[], points: readonly Point[]) => h.length >= 3 && edges(h).every(([i, j]) => orientation(points[i]!.x, points[j]!.x, x) >= 0);
const onSegment = (x: Vec2, a: Vec2, b: Vec2) => orientation(a, b, x) === 0 && [0, 1].every(j => Math.min(a[j]!, b[j]!) <= x[j]! && x[j]! <= Math.max(a[j]!, b[j]!));
function intersects(a: Vec2, b: Vec2, c: Vec2, d: Vec2) {
  const u = orientation(a, b, c), v = orientation(a, b, d), r = orientation(c, d, a), t = orientation(c, d, b);
  return ((u < 0 && v > 0 || v < 0 && u > 0) && (r < 0 && t > 0 || t < 0 && r > 0)) || onSegment(c, a, b) || onSegment(d, a, b) || onSegment(a, c, d) || onSegment(b, c, d);
}
function hardFit(points: readonly Point[]): { alpha: number[]; b: number; w: Vec2 } | null {
  const neg = hull(points, -1), pos = hull(points, 1);
  if (neg.some(i => inside(points[i]!.x, pos, points)) || pos.some(i => inside(points[i]!.x, neg, points))) return null;
  let best: { distance2: number; source: number; i: number; j: number; t: number; q: Vec2 } | null = null;
  for (const [ni, nj] of edges(neg)) for (const [pi, pj] of edges(pos)) {
    if (intersects(points[ni]!.x, points[nj]!.x, points[pi]!.x, points[pj]!.x)) return null;
    for (const [source, i, j] of [[ni, pi, pj], [nj, pi, pj], [pi, ni, nj], [pj, ni, nj]] as [number, number, number][]) {
      const x = points[source]!.x, u = points[i]!.x, delta = sub(points[j]!.x, u), length = dot(delta, delta);
      const t = length ? Math.max(0, Math.min(1, dot(sub(x, u), delta) / length)) : 0;
      const q: Vec2 = [finite(u[0] + mul(t, delta[0])), finite(u[1] + mul(t, delta[1]))], diff = sub(q, x), distance2 = dot(diff, diff);
      if (!best || distance2 < best.distance2) best = { distance2, source, i, j, t, q };
    }
  }
  if (!best || best.distance2 === 0) throw new RangeError('Closest hull distance is numerically unresolved.');
  const { distance2, source, i, j, t, q } = best, mass = finite(2 / distance2), x = points[source]!.x;
  const direction = points[source]!.y === 1 ? sub(x, q) : sub(q, x);
  const w: Vec2 = [mul(mass, direction[0]), mul(mass, direction[1])], midpoint: Vec2 = [(x[0] + q[0]) / 2, (x[1] + q[1]) / 2];
  const alpha = points.map(() => 0); alpha[source] = mass; alpha[i] = finite(alpha[i]! + mul(mass, 1 - t)); alpha[j] = finite(alpha[j]! + mul(mass, t));
  return { alpha, b: -dot(w, midpoint), w };
}
function softFit(points: readonly Point[], K: number[][], C: number) {
  const n = points.length, y = points.map(p => p.y), alpha = points.map(() => 0);
  let g = points.map(() => 0), iterations = 0;
  for (let step = 0; step < MAX_STEPS; step++) {
    let best: { gain: number; i: number; j: number; t: number } | null = null;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const ai = alpha[i]!, aj = alpha[j]!, di = y[i]!, dj = -y[j]!;
      const [li, ui] = di === 1 ? [-ai, C - ai] : [ai - C, ai], [lj, uj] = dj === 1 ? [-aj, C - aj] : [aj - C, aj];
      const lo = Math.max(li!, lj!), hi = Math.min(ui!, uj!); if (hi <= lo) continue;
      const slope = finite(y[i]! - y[j]! - (g[i]! - g[j]!)), curvature = finite(K[i]![i]! + K[j]![j]! - 2 * K[i]![j]!);
      if (curvature < -1e-10) throw new RangeError('Kernel curvature contradicts PSD within the numerical allowance.');
      const candidates = curvature <= 0 ? [lo, hi] : [Math.max(lo, Math.min(hi, slope / curvature))];
      for (const t of candidates) {
        const gain = finite(mul(slope, t) - .5 * mul(curvature, mul(t, t)));
        if (gain > 1e-12 && (!best || gain > best.gain)) best = { gain, i, j, t };
      }
    }
    if (!best) break;
    const { i, j, t } = best; alpha[i] = finite(alpha[i]! + y[i]! * t); alpha[j] = finite(alpha[j]! - y[j]! * t);
    g = g.map((v, z) => finite(v + mul(t, K[z]![i]! - K[z]![j]!))); iterations = step + 1;
  }
  g = K.map(row => sum(row.map((v, j) => mul(alpha[j]! * y[j]!, v))));
  const free = alpha.map((a, i) => ({ a, i })).filter(({ a }) => EPS < a && a < C - EPS).map(({ i }) => y[i]! - g[i]!);
  let b: number;
  if (free.length) b = finite(sum(free) / free.length);
  else {
    let lower = -Infinity, upper = Infinity;
    for (let i = 0; i < n; i++) {
      const target = y[i]! - g[i]!;
      if (y[i] === 1 && alpha[i]! <= EPS || y[i] === -1 && alpha[i]! >= C - EPS) lower = Math.max(lower, target);
      else upper = Math.min(upper, target);
    } b = finite((lower + upper) / 2);
  } return { alpha, b, iterations };
}
export const effectiveKernel = (s: SVMState): Kernel => s.mode === 'kernel' ? s.kernel : { ...s.kernel, kind: 'linear' };
export function svm(s: SVMState): Result {
  validate(s); const { points, C } = s, k = effectiveKernel(s), gram = points.map(a => points.map(b => kernelValue(a.x, b.x, k)));
  let alpha: number[], b: number, w: Vec2 | null, iterations = 0;
  if (s.mode === 'hard') {
    const fit = hardFit(points);
    if (!fit) return { status: 'infeasible', reason: 'Class convex hulls intersect; hard-margin constraints are infeasible.', gram, rows: [], alpha: [], w: null, b: null, norm2: null, halfMargin: null, primal: null, dual: null, gap: null, kkt: null, equality: null, bounds: null, iterations: 0 };
    ({ alpha, b, w } = fit);
  } else {
    ({ alpha, b, iterations } = softFit(points, gram, C));
    w = k.kind === 'linear' ? [sum(points.map((p, i) => mul(alpha[i]! * p.y, p.x[0]))), sum(points.map((p, i) => mul(alpha[i]! * p.y, p.x[1])))] : null;
  }
  const scores = gram.map(row => finite(sum(row.map((v, j) => mul(alpha[j]! * points[j]!.y, v))) + b));
  const norm2 = sum(points.map((p, i) => mul(alpha[i]! * p.y, finite(scores[i]! - b))));
  if (norm2 < 0) throw new RangeError('Computed feature norm is negative; numerical fit unavailable.');
  const norm = Math.sqrt(norm2); let residual = 0;
  const rows = points.map((p, i): Row => {
    const score = scores[i]!, margin = mul(p.y, score), xi = Math.max(0, finite(1 - margin)), bound = s.mode !== 'hard' && alpha[i]! >= C - EPS;
    const r = alpha[i]! <= EPS ? Math.max(0, 1 - margin) : bound ? Math.max(0, margin - 1) : Math.abs(margin - 1); residual = Math.max(residual, r);
    return { id: p.id, score, decision: score > 0 ? 1 : score < 0 ? -1 : 0, margin, slack: xi, hinge: xi, signedDistance: w && norm > 0 ? finite(score / norm) : null, support: alpha[i]! > EPS, onMargin: Math.abs(margin - 1) <= KKT_TOL, alpha: alpha[i]! };
  });
  const primal = finite(.5 * norm2 + (s.mode === 'hard' ? 0 : C * sum(rows.map(r => r.hinge)))), dual = finite(sum(alpha) - .5 * norm2), gap = finite(primal - dual);
  const equality = Math.abs(sum(points.map((p, i) => alpha[i]! * p.y))), bounds = Math.max(0, ...alpha.map(a => -a), ...(s.mode === 'hard' ? [] : alpha.map(a => a - C)));
  const feasible = s.mode !== 'hard' || Math.max(...rows.map(r => r.slack)) <= KKT_TOL;
  const good = feasible && residual <= KKT_TOL && Math.abs(gap) <= GAP_TOL * (1 + primal) && equality <= 1e-7 && bounds <= EPS;
  return { status: good ? s.mode === 'hard' ? 'solved' : 'approximate' : 'failed', reason: good ? s.mode === 'hard' ? 'Hard fit certified within displayed diagnostics.' : 'Approximate dual fit; inspect KKT and primal–dual gap.' : 'Diagnostic failure or iteration cap; no fitted boundary is displayed.', gram, rows, alpha, w, b, norm2, halfMargin: norm > 0 ? finite(1 / norm) : null, primal, dual, gap, kkt: residual, equality, bounds, iterations };
}
/** Score, not source-space distance for nonlinear kernels. */
export function decision(s: SVMState, r: Result, x: Vec2): number {
  validate(s);
  if (!['solved', 'approximate'].includes(r.status) || r.b === null || r.alpha.length !== s.points.length) throw new RangeError('A successful fit is required for a decision.');
  return finite(sum(s.points.map((p, i) => mul(real(r.alpha[i]!) * p.y, kernelValue(p.x, x, effectiveKernel(s))))) + real(r.b));
}
