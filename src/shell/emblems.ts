/**
 * Part emblems: one small plate per Part, each COMPUTED from a piece of that Part's mathematics at build
 * time (never hand-drawn "about right"). They are wayfinding on the landing page and the book map.
 *
 * Every emblem lives in a 96 × 72 box and goes through the same viewport transform as the interactive
 * plane, so the y-up convention is respected here too. Pure functions → unit-tested.
 */
import { fitViewport, worldToScreen, type Point, type Viewport, type WorldWindow } from '../platform/geometry/viewport';

export type EmblemRole = 'ink' | 'primary' | 'x' | 'y' | 'derived';

export interface EmblemShape {
  readonly kind: 'path' | 'dot';
  readonly role: EmblemRole;
  /** SVG path data for `path`; centre for `dot`. */
  readonly d?: string;
  readonly at?: Point;
  readonly width?: number;
  readonly dashed?: boolean;
  readonly faint?: boolean;
  readonly fill?: boolean;
  readonly radius?: number;
}

export const EMBLEM_SIZE = { width: 96, height: 72 } as const;

const f = (n: number) => n.toFixed(2);
const line = (vp: Viewport, a: Point, b: Point) => {
  const p = worldToScreen(vp, a);
  const q = worldToScreen(vp, b);
  return `M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}`;
};
const poly = (vp: Viewport, pts: readonly Point[], close = false) =>
  pts.map((pt, i) => { const p = worldToScreen(vp, pt); return `${i === 0 ? 'M' : 'L'}${f(p.x)} ${f(p.y)}`; }).join('') + (close ? 'Z' : '');
const arrow = (vp: Viewport, from: Point, to: Point, headPx = 6): string => {
  const a = worldToScreen(vp, from);
  const b = worldToScreen(vp, to);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const bx = b.x - ux * headPx;
  const by = b.y - uy * headPx;
  return `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}M${f(b.x)} ${f(b.y)}L${f(bx - uy * headPx * 0.45)} ${f(by + ux * headPx * 0.45)}M${f(b.x)} ${f(b.y)}L${f(bx + uy * headPx * 0.45)} ${f(by - ux * headPx * 0.45)}`;
};
const vpFor = (w: WorldWindow) => fitViewport(w, EMBLEM_SIZE);
const samples = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

// ------------------------------------------------------------------------------------------ mathematics
/** I — the canonical vector v = (3, 2) on axes. */
function languageEmblem(): EmblemShape[] {
  const vp = vpFor({ xMin: -1.2, xMax: 4.4, yMin: -0.8, yMax: 3.2 });
  return [
    { kind: 'path', role: 'ink', faint: true, d: line(vp, { x: -1, y: 0 }, { x: 4.2, y: 0 }) + line(vp, { x: 0, y: -0.6 }, { x: 0, y: 3 }) },
    { kind: 'path', role: 'x', d: line(vp, { x: 0, y: 0 }, { x: 3, y: 0 }), width: 2 },
    { kind: 'path', role: 'y', dashed: true, d: line(vp, { x: 3, y: 0 }, { x: 3, y: 2 }), width: 2 },
    { kind: 'path', role: 'primary', d: arrow(vp, { x: 0, y: 0 }, { x: 3, y: 2 }, 8), width: 2.6 },
  ];
}

/** The matrix used by the Linear Algebra emblem: columns are the images of e₁ and e₂. */
export const SHEAR = { a: 1, b: 0.6, c: 0.3, d: 1 } as const;
export const applyShear = (m: typeof SHEAR, p: Point): Point => ({ x: m.a * p.x + m.b * p.y, y: m.c * p.x + m.d * p.y });

/** II — the integer grid after a linear map; the images of the basis vectors are drawn as arrows. */
function linearAlgebraEmblem(): EmblemShape[] {
  const vp = vpFor({ xMin: -2.6, xMax: 2.6, yMin: -1.95, yMax: 1.95 });
  const shapes: EmblemShape[] = [];
  const lines: string[] = [];
  for (let k = -2; k <= 2; k++) {
    lines.push(line(vp, applyShear(SHEAR, { x: k, y: -2 }), applyShear(SHEAR, { x: k, y: 2 })));
    lines.push(line(vp, applyShear(SHEAR, { x: -2, y: k }), applyShear(SHEAR, { x: 2, y: k })));
  }
  shapes.push({ kind: 'path', role: 'ink', faint: true, d: lines.join('') });
  shapes.push({ kind: 'path', role: 'x', d: arrow(vp, { x: 0, y: 0 }, applyShear(SHEAR, { x: 1, y: 0 }), 6), width: 2.4 });
  shapes.push({ kind: 'path', role: 'y', d: arrow(vp, { x: 0, y: 0 }, applyShear(SHEAR, { x: 0, y: 1 }), 6), width: 2.4 });
  return shapes;
}

export const CALCULUS = { a: 0.4, b: 2.2, f: (x: number) => 0.2 * x * x + 0.35, df: (x: number) => 0.4 * x } as const;
export function secantSlope(): number { return (CALCULUS.f(CALCULUS.b) - CALCULUS.f(CALCULUS.a)) / (CALCULUS.b - CALCULUS.a); }
export function tangentSlope(): number { return CALCULUS.df(CALCULUS.a); }

/** III — a curve, the secant through two points, and the tangent at the first. */
function calculusEmblem(): EmblemShape[] {
  const { a, b, f: fn, df } = CALCULUS;
  const vp = vpFor({ xMin: -2.9, xMax: 3.1, yMin: -0.3, yMax: 2.5 });
  const curve = samples(-2.6, 2.9, 48).map(x => ({ x, y: fn(x) }));
  const secant = secantSlope();
  const tangent = df(a);
  const secantLine = [-1.2, 3].map(x => ({ x, y: fn(a) + secant * (x - a) }));
  const tangentLine = [-1.9, 2.6].map(x => ({ x, y: fn(a) + tangent * (x - a) }));
  return [
    { kind: 'path', role: 'ink', d: poly(vp, curve), width: 2 },
    { kind: 'path', role: 'x', dashed: true, d: poly(vp, secantLine), width: 1.8 },
    { kind: 'path', role: 'primary', d: poly(vp, tangentLine), width: 2.2 },
    { kind: 'dot', role: 'primary', at: worldToScreen(vp, { x: a, y: fn(a) }), radius: 3 },
    { kind: 'dot', role: 'x', at: worldToScreen(vp, { x: b, y: fn(b) }), radius: 3 },
  ];
}

export const gaussianPdf = (x: number): number => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

/** IV — the standard normal density, with the ±1σ region shaded. */
function probabilityEmblem(): EmblemShape[] {
  const vp = vpFor({ xMin: -3.4, xMax: 3.4, yMin: -0.08, yMax: 0.46 });
  const curve = samples(-3.2, 3.2, 64).map(x => ({ x, y: gaussianPdf(x) }));
  const band = [{ x: -1, y: 0 }, ...samples(-1, 1, 32).map(x => ({ x, y: gaussianPdf(x) })), { x: 1, y: 0 }];
  return [
    { kind: 'path', role: 'derived', fill: true, faint: true, d: poly(vp, band, true) },
    { kind: 'path', role: 'ink', faint: true, d: line(vp, { x: -3.3, y: 0 }, { x: 3.3, y: 0 }) },
    { kind: 'path', role: 'ink', d: poly(vp, curve), width: 2.2 },
  ];
}

/** The deterministic scatter used by the Statistics emblem. */
export const SCATTER: readonly Point[] = [
  { x: -2.4, y: -1.1 }, { x: -1.8, y: -0.9 }, { x: -1.2, y: -0.2 }, { x: -0.6, y: -0.6 }, { x: 0, y: 0.3 },
  { x: 0.7, y: 0.1 }, { x: 1.2, y: 0.9 }, { x: 1.9, y: 0.6 }, { x: 2.5, y: 1.4 },
];
/** Ordinary least squares y = intercept + slope·x (closed form). */
export function leastSquares(points: readonly Point[]): { slope: number; intercept: number; meanX: number; meanY: number } {
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  const sxy = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const sxx = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  const slope = sxy / sxx;
  return { slope, intercept: meanY - slope * meanX, meanX, meanY };
}

/** V — noisy data and its least-squares line, with the residuals drawn as short segments. */
function statisticsEmblem(): EmblemShape[] {
  const vp = vpFor({ xMin: -3.2, xMax: 3.2, yMin: -2.4, yMax: 2.4 });
  const { slope, intercept } = leastSquares(SCATTER);
  const fit = (x: number): Point => ({ x, y: intercept + slope * x });
  const shapes: EmblemShape[] = [
    { kind: 'path', role: 'derived', dashed: true, faint: true, d: SCATTER.map(p => line(vp, p, fit(p.x))).join('') },
    { kind: 'path', role: 'primary', d: line(vp, fit(-2.9), fit(2.9)), width: 2.2 },
  ];
  for (const p of SCATTER) shapes.push({ kind: 'dot', role: 'x', at: worldToScreen(vp, p), radius: 2.6 });
  return shapes;
}

/** f(x, y) = x² + 3y², the bowl behind the Optimization emblem. */
export const bowl = (p: Point): number => p.x * p.x + 3 * p.y * p.y;
/** Gradient descent on the bowl: p ← p − η∇f(p), ∇f = (2x, 6y). */
export function descentPath(start: Point, eta: number, steps: number): Point[] {
  const out = [start];
  let p = start;
  for (let i = 0; i < steps; i++) {
    p = { x: p.x - eta * 2 * p.x, y: p.y - eta * 6 * p.y };
    out.push(p);
  }
  return out;
}

/** VI — level sets of the bowl and the gradient-descent iterates walking down them. */
function optimizationEmblem(): EmblemShape[] {
  const vp = vpFor({ xMin: -3.1, xMax: 3.1, yMin: -2.33, yMax: 2.33 });
  const shapes: EmblemShape[] = [];
  for (const level of [0.6, 1.8, 3.6, 6]) {
    const ring = samples(0, 2 * Math.PI, 72).map(t => ({ x: Math.sqrt(level) * Math.cos(t), y: Math.sqrt(level / 3) * Math.sin(t) }));
    shapes.push({ kind: 'path', role: 'ink', faint: true, d: poly(vp, ring, true) });
  }
  const path = descentPath({ x: -2.4, y: 1.35 }, 0.28, 9);
  shapes.push({ kind: 'path', role: 'primary', d: poly(vp, path), width: 2 });
  for (const p of path.slice(0, 7)) shapes.push({ kind: 'dot', role: 'primary', at: worldToScreen(vp, p), radius: 2.4 });
  return shapes;
}

/** Binary entropy in nats: H(p) = −p ln p − (1−p) ln(1−p). */
export const binaryEntropy = (p: number): number => (p <= 0 || p >= 1 ? 0 : -p * Math.log(p) - (1 - p) * Math.log(1 - p));

/** VII — binary entropy, with its maximum ln 2 at p = ½ marked. */
function informationEmblem(): EmblemShape[] {
  const vp = vpFor({ xMin: -0.12, xMax: 1.12, yMin: -0.12, yMax: 0.86 });
  const curve = samples(0, 1, 64).map(p => ({ x: p, y: binaryEntropy(p) }));
  return [
    { kind: 'path', role: 'ink', faint: true, d: line(vp, { x: 0, y: 0 }, { x: 1.06, y: 0 }) + line(vp, { x: 0, y: 0 }, { x: 0, y: 0.8 }) },
    { kind: 'path', role: 'derived', dashed: true, d: line(vp, { x: 0.5, y: 0 }, { x: 0.5, y: Math.LN2 }) + line(vp, { x: 0, y: Math.LN2 }, { x: 0.5, y: Math.LN2 }), width: 1.4 },
    { kind: 'path', role: 'ink', d: poly(vp, curve), width: 2.2 },
    { kind: 'dot', role: 'primary', at: worldToScreen(vp, { x: 0.5, y: Math.LN2 }), radius: 3 },
  ];
}

/** The numbers a toy floating-point format with a 2-bit fraction can represent in [1, 16): (1 + m/4)·2ᵉ. */
export function toyFloats(): number[] {
  const out: number[] = [];
  for (let e = 0; e < 4; e++) for (let m = 0; m < 4; m++) out.push((1 + m / 4) * 2 ** e);
  return out;
}

/** VIII — where a toy float can land on the number line: the gaps double with every power of two. */
function numericalEmblem(): EmblemShape[] {
  const vp = vpFor({ xMin: -1, xMax: 17, yMin: -3.4, yMax: 3.4 });
  const values = toyFloats();
  return [
    { kind: 'path', role: 'ink', faint: true, d: line(vp, { x: 0, y: 0 }, { x: 16.4, y: 0 }) },
    { kind: 'path', role: 'derived', d: values.map(v => line(vp, { x: v, y: -1.5 }, { x: v, y: 1.5 })).join(''), width: 1.8 },
    { kind: 'path', role: 'primary', d: line(vp, { x: 1, y: -2.7 }, { x: 2, y: -2.7 }) + line(vp, { x: 8, y: -2.7 }, { x: 16, y: -2.7 }), width: 1.6 },
  ];
}

const BUILDERS = [languageEmblem, linearAlgebraEmblem, calculusEmblem, probabilityEmblem, statisticsEmblem, optimizationEmblem, informationEmblem, numericalEmblem] as const;

/** Emblem for Part `index` (1–8). */
export function emblemFor(index: number): EmblemShape[] {
  const build = BUILDERS[index - 1];
  if (!build) throw new RangeError(`No emblem for Part ${index}`);
  return build();
}
