/**
 * Lesson views for the gradient stage: f(θ) = θ₁² + 3θ₂². The gradient ∇f is a vector of the SAME SHAPE as θ whose entries are the partial
 * derivatives; here they are known exactly. A finite difference computed in double arithmetic only approximates them, with an error that
 * depends on the step h. This stage is a preview of the notation; Part III develops the calculus.
 *
 *   GradientState → deriveGradient → { exact gradient (=) · finite differences (≈) · error table over all steps · Python · verdict }
 */
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { form } from '../../math/notation/rational';
import { STEP_EXPONENTS, THETA_MAX, THETA_MIN, deriveGradient, type GradientDerived, type GradientState } from '../../math/notation/gradient';
import { approxDescription, exactText, qDescription } from './view';

export type GradientLessonState = GradientState;
export const CANONICAL_GRADIENT: GradientLessonState = Object.freeze({ t1: 1, t2: 2, e: 3 });

const theta = (id: string, name: string, symbolTex: string, symbolText: string, def: number): ParamSpec => ({ id, name, symbolTex, symbolText, domain: { min: THETA_MIN, max: THETA_MAX }, default: def, step: 0.5, maxDecimals: 2, onInvalid: 'reject' });
export const T1_SPEC = theta('theta1', 'first parameter', '\\theta_1', 'θ1', 1);
export const T2_SPEC = theta('theta2', 'second parameter', '\\theta_2', 'θ2', 2);

export const STEP_OPTIONS = Object.freeze([
  { id: '1', label: '10⁻¹' },
  { id: '3', label: '10⁻³' },
  { id: '6', label: '10⁻⁶' },
  { id: '9', label: '10⁻⁹' },
  { id: '13', label: '10⁻¹³' },
] as const);
export const stepId = (e: number): (typeof STEP_OPTIONS)[number]['id'] => String(e) as (typeof STEP_OPTIONS)[number]['id'];

export interface GradientPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: GradientLessonState }
const P = (id: string, label: string, aria: string, s: Partial<GradientLessonState>): GradientPreset => Object.freeze({ id, label, aria, state: Object.freeze({ ...CANONICAL_GRADIENT, ...s }) });
export const GRADIENT_PRESETS: readonly GradientPreset[] = Object.freeze([
  P('canonical', 'θ = (1, 2)', 'the point one, two with step ten to the minus three', {}),
  P('large-step', 'a large step', 'the same point with the large step ten to the minus one', { e: 1 }),
  P('tiny-step', 'a tiny step', 'the same point with the tiny step ten to the minus thirteen', { e: 13 }),
  P('negative', 'θ = (−1.5, 0.5)', 'a point with a negative coordinate', { t1: -1.5, t2: 0.5 }),
  P('origin', 'θ = (0, 0)', 'the origin, where the gradient is zero', { t1: 0, t2: 0 }),
]);
export const gradientPresetMatches = (s: GradientLessonState, p: GradientPreset): boolean => (Object.keys(CANONICAL_GRADIENT) as (keyof GradientLessonState)[]).every(key => Object.is(s[key], p.state[key]));

export interface ErrorRow { readonly e: number; readonly error1: number; readonly error2: number; readonly worst: number }
export interface GradientLessonDerived {
  readonly state: GradientLessonState;
  readonly d: GradientDerived;
  /** The finite-difference errors for every step, at the chosen θ. */
  readonly errors: readonly ErrorRow[];
  /** The step exponent with the smallest worst-case error at this θ (first one on a tie). */
  readonly bestE: number;
}

export function deriveGradientLesson(state: GradientLessonState): GradientLessonDerived {
  const d = deriveGradient(state);
  const errors: ErrorRow[] = STEP_EXPONENTS.map(e => {
    const g = deriveGradient({ ...state, e });
    return { e, error1: g.error[0], error2: g.error[1], worst: Math.max(Math.abs(g.error[0]), Math.abs(g.error[1])) };
  });
  const best = errors.reduce((a, b) => (b.worst < a.worst ? b : a));
  return Object.freeze({ state, d, errors, bestE: best.e });
}

const num = (v: number): string => (v < 0 ? `−${-v}` : String(v));
const py = (v: number): string => (Number.isInteger(v) ? v.toFixed(1) : String(v));
export const stepTex = (e: number): string => `10^{-${e}}`;

export function gradientRows(derived: GradientLessonDerived): InspectorRowData[] {
  const { d, state: s } = derived;
  const shape = exactText(d.shapeTuple, `\\texttt{${d.shapeTuple}}`, 'the tuple 2');
  return [
    { id: 'shape', role: 'x', symbolTex: '\\theta,\\ \\nabla f', name: 'shape of θ and of the gradient: the same', description: shape },
    { id: 'f', role: 'derived', symbolTex: 'f(\\theta)', name: 'the function value', description: qDescription(d.f), secondary: true },
    { id: 'grad1', role: 'primary', symbolTex: '\\dfrac{\\partial f}{\\partial\\theta_1}', name: 'exact partial derivative, 2θ₁', description: qDescription(d.grad[0]) },
    { id: 'grad2', role: 'primary', symbolTex: '\\dfrac{\\partial f}{\\partial\\theta_2}', name: 'exact partial derivative, 6θ₂', description: qDescription(d.grad[1]) },
    { id: 'est1', role: 'y', symbolTex: '\\dfrac{f(\\theta+h\\mathbf{e}_1)-f(\\theta)}{h}', name: `finite difference in θ₁, h = 10⁻${s.e} (a computed double)`, description: approxDescription(d.estimate[0]) },
    { id: 'est2', role: 'y', symbolTex: '\\dfrac{f(\\theta+h\\mathbf{e}_2)-f(\\theta)}{h}', name: `finite difference in θ₂, h = 10⁻${s.e} (a computed double)`, description: approxDescription(d.estimate[1]) },
    { id: 'err1', role: 'caution', symbolTex: '\\text{err}_1', name: 'estimate minus exact, in θ₁', description: approxDescription(d.error[0]), secondary: true },
    { id: 'err2', role: 'caution', symbolTex: '\\text{err}_2', name: 'estimate minus exact, in θ₂', description: approxDescription(d.error[1]), secondary: true },
  ];
}

export function gradientFormulas(derived: GradientLessonDerived): { id: string; label: string; tex: string }[] {
  const { d, state: s } = derived;
  const t1 = form(d.theta[0]).tex;
  const t2 = form(d.theta[1]).tex;
  return [
    { id: 'f', label: 'The function, scrollable', tex: `f(\\theta)=\\theta_1^{2}+3\\theta_2^{2}=${form(d.f).tex}` },
    { id: 'grad', label: 'The exact gradient, scrollable', tex: `\\nabla_{\\theta}f=\\begin{pmatrix}2\\theta_1\\\\6\\theta_2\\end{pmatrix}=\\begin{pmatrix}${form(d.grad[0]).tex}\\\\${form(d.grad[1]).tex}\\end{pmatrix}\\in\\mathbb{R}^{2}` },
    { id: 'point', label: 'The point, scrollable', tex: `\\theta=\\begin{pmatrix}${t1}\\\\${t2}\\end{pmatrix},\\quad h=${stepTex(s.e)}` },
  ];
}

export function gradientCode(derived: GradientLessonDerived): string {
  const { d, state: s } = derived;
  return [
    'import numpy as np',
    '',
    'def f(theta):',
    '    return theta[0] * theta[0] + 3 * theta[1] * theta[1]',
    '',
    `t1, t2 = ${py(s.t1)}, ${py(s.t2)}`,
    'theta = np.array([t1, t2])',
    `grad = np.array([2 * t1, 6 * t2])   # exact, shape ${d.shapeTuple}`,
    `h = 1e-${s.e}`,
    'e_j = np.array([1.0, 0.0])',
    '(f(theta + h * e_j) - f(theta)) / h  # an estimate of grad[0]',
  ].join('\n');
}

export function gradientVerdict(derived: GradientLessonDerived): { text: string; caution: boolean } {
  const { d, state: s, errors, bestE } = derived;
  const here = errors.find(r => r.e === s.e)!;
  const stationary = d.stationary ? ' At this point the gradient is the zero vector, so θ is a stationary point of f.' : '';
  const text = `The gradient ∇f = (${form(d.grad[0]).text}, ${form(d.grad[1]).text}) has the same shape as θ: one entry per parameter. The finite difference is only an estimate, off by about ${num(Number(here.worst.toPrecision(2)))} at h = 10⁻${s.e}; among these five steps the smallest error at this θ is at h = 10⁻${bestE}. A smaller step is not always a better one: past some point rounding error grows.${stationary}`;
  return { text, caution: here.worst > 1e-3 };
}

export function gradientSpoken(derived: GradientLessonDerived): string {
  const { d, state: s } = derived;
  return `Gradient ${form(d.grad[0]).spoken}, ${form(d.grad[1]).spoken}. Finite difference with step ten to the minus ${s.e}: about ${num(Number(d.estimate[0].toPrecision(6)))}, ${num(Number(d.estimate[1].toPrecision(6)))}.`;
}

export const errorTableNote = 'Error = finite difference minus exact partial derivative, in double arithmetic.';
