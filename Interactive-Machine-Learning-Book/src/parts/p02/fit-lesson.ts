import { formatNumber } from '../../platform/format';
import { closedForm, descent, dot, finite, leastNorm, linear, polynomialDesign, polynomialFit, regularized, type FitMode, type FitState } from './model/fit';
import { deriveRegression } from './model/linear-regression';

export const approx = (v: number) => `≈ ${Math.abs(v) > 0 && (Math.abs(v) < .00005 || Math.abs(v) >= 1e6) ? v.toExponential(4).replace('-', '−') : formatNumber(v)}`;
export const texNumber = (v: number) => formatNumber(v).replace('−', '-');
export interface PlotPoint { readonly id: string; readonly x: number; readonly y: number; readonly prediction: number; readonly cx: number; readonly cy: number; readonly py: number; readonly held?: boolean }
export function project(points: readonly { id: string; x: number; y: number; prediction: number; held?: boolean }[], curve: readonly { x: number; y: number }[]) {
  const magnitude = Math.max(1, ...points.flatMap(r => [Math.abs(r.x), Math.abs(r.y), Math.abs(r.prediction)]), ...curve.flatMap(r => [Math.abs(r.x), Math.abs(r.y)]));
  const limit = finite(magnitude * 1.15, 'Plot domain'), scale = 210 / limit;
  const px = (x: number) => finite(280 + scale * x, 'Plot x'), py = (y: number) => finite(280 - scale * y, 'Plot y');
  return { limit, scale, origin: 280,
    points: points.map(r => ({ ...r, cx: px(r.x), cy: py(r.y), py: py(r.prediction) })),
    path: curve.map((r, i) => `${i ? 'L' : 'M'}${px(r.x)},${py(r.y)}`).join(' '),
    ticks: [-limit, 0, limit].map(v => ({ value: v, x: px(v), y: py(v), text: approx(v) })) };
}
const TITLES: Record<FitMode, string> = {
  'least-squares': 'Center → covariance → best line', descent: 'Curvature → gradient → next state', multiple: 'Design rows → shared coefficients → predictions',
  polynomial: 'Feature powers → capacity → held-out error', regularization: 'Fit error + penalty → shrinkage',
};
export function deriveFitLesson(state: FitState, mode: FitMode, renderedWidth = 320) {
  finite(renderedWidth, 'Plot width'); if (renderedWidth <= 0) throw new RangeError('Plot width must be positive.');
  if (!(mode in TITLES)) throw new RangeError('Unknown fit mechanism.');
  const original = mode === 'multiple' ? state.X.flat().concat([...state.targets], [...state.weights]) : state.samples.flatMap(r => [r.x, r.y]).concat([state.weight, state.bias]);
  if (original.some(v => !Number.isFinite(v) || Math.abs(v) > 1e6)) throw new RangeError('This sheet supports finite coordinates/coefficients within ±1000000. State preserved.');
  const scalar = mode === 'multiple' ? null : deriveRegression(state);
  const optimum = mode === 'multiple' ? null : closedForm(state.samples);
  const gd = mode === 'descent' ? descent(state) : null;
  const multi = mode === 'multiple' ? { ...leastNorm(state.X, state.targets), current: linear(state.X, state.targets, state.weights) } : null;
  if (multi && state.X.some(r => r[0] !== 1)) throw new RangeError('The first design column is the fixed intercept 1.');
  const poly = mode === 'polynomial' ? polynomialFit(state.samples, state.degree) : null;
  const regX = state.samples.map(r => [1, r.x]), regY = state.samples.map(r => r.y);
  const reg = mode === 'regularization' ? regularized(regX, regY, state.lambda, state.penalty, state.penalizeIntercept) : null;
  const comparisons = reg ? ['l2', 'l1'].map(kind => ({ kind, ...regularized(regX, regY, state.lambda, kind as 'l1' | 'l2', state.penalizeIntercept) })) : [];
  const coefficients = multi ? [...state.weights] : poly ? poly.weights : reg ? reg.weights : [state.bias, state.weight];
  const mse = multi ? multi.current.mse : poly ? poly.train.mse : reg ? reg.mse : scalar!.mse;
  const rows = multi ? multi.current.predictions.map((prediction, i) => ({ id: `s${i + 1}`, x: i + 1, y: state.targets[i]!, prediction, residual: multi.current.residuals[i]!, features: [...state.X[i]!] })) : state.samples.map((r, i) => {
    const prediction = poly ? poly.train.predictions[i]! : reg ? reg.predictions[i]! : scalar!.rows[i]!.prediction;
    return { ...r, prediction, residual: finite(prediction - r.y, 'Residual'), features: poly ? poly.X[i]! : [1, r.x] };
  });
  const held = poly ? poly.held.predictions.map((prediction, i) => ({ id: `h${i + 1}`, x: [-.8, -.4, 0, .4, .8][i]!, y: [.64, .16, 0, .16, .64][i]!, prediction, held: true })) : [];
  const xMin = Math.min(...rows.map(r => r.x)), xMax = Math.max(...rows.map(r => r.x));
  const curve = multi ? [] : Array.from({ length: 65 }, (_, i) => {
    const x = xMin - .15 + (xMax - xMin + .3) * i / 64;
    const y = poly ? dot(polynomialDesign([x], state.degree)[0]!, coefficients) : finite(coefficients[0]! + coefficients[1]! * x, 'Curve prediction');
    return { x, y };
  });
  const plot = project([...rows, ...held], curve);
  const scalars = [{ key: 'mse', label: poly ? 'Training MSE' : 'Data MSE', value: mse },
    ...(optimum && !poly && !reg ? [{ key: 'best-mse', label: 'Optimal data MSE', value: optimum.mse }] : []),
    ...(gd ? [{ key: 'dw', label: 'Gradient dw', value: gd.gradients.weight }, { key: 'db', label: 'Gradient db', value: gd.gradients.bias }, { key: 'factor', label: 'Fast-mode multiplier', value: gd.factor }] : []),
    ...(multi ? [{ key: 'rank', label: 'Numerical rank', value: multi.rank }, { key: 'cutoff', label: 'Singular-value cutoff', value: multi.cutoff }] : []),
    ...(poly ? [{ key: 'held-mse', label: 'Held-out MSE', value: poly.held.mse }, { key: 'rank', label: 'Numerical rank', value: poly.rank }] : []),
    ...(reg ? [{ key: 'penalty', label: 'Penalty term', value: reg.penalty }, { key: 'objective', label: 'Total objective', value: reg.objective }, { key: 'kkt', label: 'KKT residual', value: reg.kkt }] : []),
  ];
  const d = coefficients.length, n = rows.length;
  const inspector = [
    { label: 'X · augmented design', value: `${n} × ${d}`, detail: 'Samples in rows; first column is 1.' },
    { label: 'W · coefficients', value: `${d} × 1`, detail: 'Intercept first, then feature weights.' },
    { label: 'y, predictions, residuals', value: `${n} × 1` },
    ...(poly ? [{ label: 'Held-out X', value: `5 × ${d}`, detail: 'Never used to solve the coefficients.' }] : []),
    { label: 'Normalization', value: 'MSE / n', detail: 'No half factor; evaluation excludes penalties.' },
  ];
  const formulas = [
    { tex: '\\hat y=XW,\\quad r=\\hat y-y', label: 'Augmented design times the coefficient column gives predictions; residual is prediction minus target.' },
    { tex: `L_{\\mathrm{data}}=\\frac1{${n}}\\sum_i r_i^2\\approx ${texNumber(mse)}`, label: `Data MSE ${approx(mse)}.` },
    ...(mode === 'least-squares' ? [{ tex: optimum!.unique ? `w_*=\\frac{S_{xy}}{S_{xx}},\\quad b_*=\\bar y-w_*\\bar x` : 'S_{xx}=0,\\quad w=0,\\quad b=\\bar y', label: 'When x variance is nonzero, optimal weight is centered covariance sum divided by centered squared input sum.' }] : []),
    ...(gd ? [{ tex: `\\begin{aligned}w^+&=w-\\eta dw\\approx ${texNumber(gd.next.weight)}\\\\b^+&=b-\\eta db\\approx ${texNumber(gd.next.bias)}\\end{aligned}`, label: `Next weight ${approx(gd.next.weight)}, next bias ${approx(gd.next.bias)}.` }] : []),
    ...(multi ? [{ tex: 'W_*=\\sum_{\\sigma_j>\\tau}v_j\\frac{u_j^\\mathsf{T}y}{\\sigma_j}', label: 'Minimum norm fit uses retained singular directions, not an inverse of the normal equations.' }] : []),
    ...(poly ? [{ tex: `\\phi(x)=[1,x,\\ldots,x^{${state.degree}}],\\quad\\hat y=\\phi(x)W`, label: `Polynomial degree ${state.degree}, linear in ${d} coefficients.` }] : []),
    ...(reg ? [{ tex: `J=L_{\\mathrm{data}}+\\lambda\\sum_{j\\in P}${state.penalty === 'l2' ? 'w_j^2' : '|w_j|'}\\approx ${texNumber(reg.objective)}`, label: `${state.penalty.toUpperCase()} objective ${approx(reg.objective)}; intercept ${state.penalizeIntercept ? 'included' : 'excluded'} from penalty.` }] : []),
  ];
  let surface = null;
  if (gd && gd.lambdaMin > 1e-12) {
    const sx = state.samples.reduce((s, r) => s + r.x, 0) / n;
    const sxx = state.samples.reduce((s, r) => s + r.x * r.x, 0) / n;
    const angle = .5 * Math.atan2(4 * sx, 2 * sxx - 2);
    const contours = [.2, 1, 4].map(level => Array.from({ length: 81 }, (_, i) => {
      const t = i / 80 * 2 * Math.PI, u = Math.sqrt(2 * level / gd.lambdaMax) * Math.cos(t), v = Math.sqrt(2 * level / gd.lambdaMin) * Math.sin(t);
      return { x: gd.optimum.weight + u * Math.cos(angle) - v * Math.sin(angle), y: gd.optimum.bias + u * Math.sin(angle) + v * Math.cos(angle) };
    }));
    const coordinates = [{ id: 'current', x: state.weight, y: state.bias, prediction: state.bias }, { id: 'next', x: gd.next.weight, y: gd.next.bias, prediction: gd.next.bias }, { id: 'optimum', x: gd.optimum.weight, y: gd.optimum.bias, prediction: gd.optimum.bias }];
    const plane = project(coordinates, contours.flat());
    surface = { ...plane, contours: contours.map(c => c.map((r, i) => `${i ? 'L' : 'M'}${280 + plane.scale * r.x},${280 - plane.scale * r.y}`).join(' ')) };
  }
  const provenance = poly ? 'Hand-authored noisy training values; held-out targets are x² at five different inputs. No seed; no measured population.' : 'Hand-authored toy observations, editable in this sheet. No seed and no measured population.';
  const summary = `${TITLES[mode]}. Data MSE ${approx(mse)}. Coefficients ${coefficients.map(approx).join(', ')}.${gd ? ` ${gd.behavior}.` : ''}${reg ? ` Objective ${approx(reg.objective)}.` : ''}`;
  return { state, mode, fontSize: Math.max(18, 14 * 560 / renderedWidth), title: TITLES[mode], rows, coefficients, mse, optimum, gd, multi, poly, reg, comparisons, plot, surface, scalars, formulas, inspector, provenance, summary };
}
