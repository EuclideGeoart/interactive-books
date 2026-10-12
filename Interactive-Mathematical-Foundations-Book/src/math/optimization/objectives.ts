/** Bounded two-parameter objectives. Polynomial gradients reuse accepted Calculus differentiation. */
import { dx2, dy2, eval2Number, poly2, type Poly2 } from '../calculus/bivariate';
import { fromDecimal, mul, neg, half, add, type Rational } from '../quantity/rational';

export type Vector = readonly [number, number];
export type Matrix = readonly [Vector, Vector];
export const OBJECTIVES = {
  quadratic: 'Convex quadratic', well: 'Double well', cubic: 'Local minimum, unbounded below',
  ridge: 'Concave peak', saddle: 'Saddle', flat: 'Flat minimum', degenerate: 'Degenerate stationary point',
  absolute: 'Nonsmooth absolute value', log: 'Log barrier (x > 0)', regression: 'Four-example regression',
} as const;
export type ObjectiveId = keyof typeof OBJECTIVES;
export interface ObjectiveConfig { readonly objective: ObjectiveId; readonly a: number; readonly center: number }
export interface Evaluation {
  readonly status: 'finite' | 'domain' | 'non-finite'; readonly loss: number | null;
  readonly gradient: Vector | null; readonly hessian: Matrix | null; readonly reason: string;
}
export const DATA = Object.freeze([[-1, -1], [0, 1], [1, 2], [2, 2]].map(row => Object.freeze(row))) as readonly Vector[];
const POLYS: Partial<Record<ObjectiveId, Poly2>> = {
  well: poly2([4,0,1],[2,0,-2],[0,0,1],[0,2,1]), cubic: poly2([3,0,1],[1,0,-3],[0,2,1]),
  ridge: poly2([2,0,-1],[0,2,-1]), saddle: poly2([2,0,1],[0,2,-1]),
  flat: poly2([4,0,1],[0,4,1]), degenerate: poly2([3,0,1],[0,2,1]),
};
export const vectorFinite = (point: Vector): boolean => point.every(Number.isFinite);
export function finiteEvaluation(loss: number, gradient: Vector | null, hessian: Matrix | null, reason = ''): Evaluation {
  const finite = Number.isFinite(loss) && (!gradient || vectorFinite(gradient)) && (!hessian || hessian.every(vectorFinite));
  return finite ? { status: 'finite', loss, gradient, hessian, reason }
    : { status: 'non-finite', loss: null, gradient: null, hessian: null, reason: 'Binary64 evaluation overflowed or produced a non-finite value.' };
}
/** Each example contributes half its squared residual. A batch averages exactly its selected indices, including repeats. */
export function regression(point: Vector, indices: readonly number[] = [0,1,2,3]): { evaluation: Evaluation; examples: readonly { index: number; loss: number; gradient: Vector }[] } {
  if (!indices.length || indices.some(i => !Number.isInteger(i) || i < 0 || i >= DATA.length)) throw new RangeError('A batch contains 1 or more valid example indices.');
  const examples = indices.map(index => {
    const [x, y] = DATA[index]!, residual = point[0] * x + point[1] - y;
    return { index, loss: residual ** 2 / 2, gradient: [residual * x, residual] as Vector };
  });
  const n = indices.length;
  return { examples, evaluation: finiteEvaluation(examples.reduce((s,e) => s + e.loss, 0) / n,
    [examples.reduce((s,e) => s + e.gradient[0], 0) / n, examples.reduce((s,e) => s + e.gradient[1], 0) / n],
    [[indices.reduce((s,i) => s + DATA[i]![0] ** 2, 0) / n, indices.reduce((s,i) => s + DATA[i]![0], 0) / n],
     [indices.reduce((s,i) => s + DATA[i]![0], 0) / n, 1]]) };
}
/** Compile once per configuration; callers evaluate the same function for both trace and landscape. */
export function objectiveModel(config: ObjectiveConfig): { evaluate(point: Vector): Evaluation; polynomial: Poly2 | null } {
  if (!(config.objective in OBJECTIVES) || !Number.isFinite(config.a) || config.a <= 0 || !Number.isFinite(config.center)) throw new RangeError('Choose a supported objective, positive finite curvature, and finite center.');
  let p = POLYS[config.objective];
  if (config.objective === 'quadratic') {
    const a = fromDecimal(config.a, 2), c = fromDecimal(config.center, 2);
    if (!a || !c) throw new RangeError('Quadratic coefficients use at most two decimal places.');
    p = poly2([2,0,half(a)],[1,0,neg(mul(a,c))],[0,0,half(mul(a,mul(c,c)))],[0,2,2]);
  }
  if (p) {
    const gx = dx2(p), gy = dy2(p), hxx = dx2(gx), hxy = dy2(gx), hyx = dx2(gy), hyy = dy2(gy);
    return { polynomial: p, evaluate: ([x,y]) => finiteEvaluation(eval2Number(p!,x,y),
      [eval2Number(gx,x,y),eval2Number(gy,x,y)], [[eval2Number(hxx,x,y),eval2Number(hxy,x,y)],[eval2Number(hyx,x,y),eval2Number(hyy,x,y)]]) };
  }
  return { polynomial: null, evaluate(point) {
    const [x,y] = point;
    if (!vectorFinite(point)) return finiteEvaluation(NaN,null,null);
    if (config.objective === 'regression') return regression(point).evaluation;
    if (config.objective === 'absolute') return finiteEvaluation(Math.abs(x)+y*y, x === 0 ? null : [Math.sign(x),2*y], x === 0 ? null : [[0,0],[0,2]], x === 0 ? 'The classical gradient is undefined at the kink x = 0; no subgradient is silently substituted.' : '');
    if (x <= 0) return { status: 'domain', loss: null, gradient: null, hessian: null, reason: 'The logarithm requires x > 0.' };
    return finiteEvaluation(-Math.log(x)+y*y,[-1/x,2*y],[[1/(x*x),0],[0,2]]);
  } };
}
export function evaluateObjective(config: ObjectiveConfig, point: Vector): Evaluation { return objectiveModel(config).evaluate(point); }
export interface StationaryPoint { readonly point: Vector; readonly kind: string; readonly global: string }
/** Complete analytic stationary sets for the supported examples, not a numerical root finder. */
export function stationaryPoints(config: ObjectiveConfig): readonly StationaryPoint[] {
  switch(config.objective) {
    case 'quadratic': return [{point:[config.center,0],kind:'strict minimum',global:'unique global minimum'}];
    case 'well': return [{point:[-1,0],kind:'strict minimum',global:'global minimum'}, {point:[0,0],kind:'saddle',global:'not a minimum'}, {point:[1,0],kind:'strict minimum',global:'global minimum'}];
    case 'cubic': return [{point:[-1,0],kind:'saddle',global:'maximum only along the y = 0 slice'}, {point:[1,0],kind:'strict local minimum',global:'not global: objective unbounded below'}];
    case 'ridge': return [{point:[0,0],kind:'strict maximum',global:'global maximum'}];
    case 'saddle': return [{point:[0,0],kind:'saddle',global:'unbounded above and below'}];
    case 'flat': return [{point:[0,0],kind:'degenerate minimum',global:'unique global minimum; Hessian test inconclusive'}];
    case 'degenerate': return [{point:[0,0],kind:'degenerate stationary point',global:'neither minimum nor maximum; cubic term changes sign'}];
    default: return [];
  }
}
export function convexity(config: ObjectiveConfig): { convex: boolean; explanation: string } {
  const convex = ['quadratic','flat','absolute','log','regression'].includes(config.objective);
  const explanation = config.objective === 'log' ? 'Convex only on its convex domain x > 0. Hessian diag(1/x², 2) is positive definite.'
    : config.objective === 'absolute' ? 'Convex by the triangle inequality, despite its undefined classical derivative at x = 0.'
    : config.objective === 'flat' ? 'Hessian diag(12x², 12y²) is positive semidefinite everywhere; singular at the origin.'
    : convex ? 'The quadratic Hessian is positive semidefinite on the full parameter space.'
    : 'A negative curvature direction violates the chord inequality somewhere; one favorable chord is not a proof.';
  return { convex, explanation };
}
export function chord(config: ObjectiveConfig, left: number, right: number, t: number): { x: number; curve: number | null; height: number | null; gap: number | null } {
  if (![left,right,t].every(Number.isFinite) || t < 0 || t > 1) throw new RangeError('Chord endpoints must be finite and t in [0,1].');
  const model = objectiveModel(config), l = model.evaluate([left,0]).loss, r = model.evaluate([right,0]).loss, x = (1-t)*left+t*right, curve = model.evaluate([x,0]).loss;
  const height = l === null || r === null ? null : (1-t)*l+t*r;
  return { x,curve,height,gap: height === null || curve === null ? null : height-curve };
}
/** Separate exact demonstration. This never supplies rounded binary64 trajectory expectations. */
export function exactQuadraticStep(point: readonly [Rational,Rational], eta: Rational) {
  const gradient = [point[0],mul({num:4n,den:1n},point[1])] as const;
  const update = [neg(mul(eta,gradient[0])),neg(mul(eta,gradient[1]))] as const;
  const next = [add(point[0],update[0]),add(point[1],update[1])] as const;
  return { point,gradient,update,next };
}
