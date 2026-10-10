/**
 * Worked examples for exact roots: one trace per example, a frame per step. Every number written in a frame comes from
 * `radicalWork` (the model's working: lowest-terms fraction, rationalised radicand, prime factors, extracted power, cancelled factor);
 * this file only decides the order of the steps and how each one is worded.
 */
import { radicalOfTex, rationalForm, rootForm } from '../../math/quantity/exactform';
import { parseDecimal, type Rational } from '../../math/quantity/rational';
import { rootPower } from '../../math/quantity/root';
import { radicalWork, type PrimePower } from '../../math/quantity/worked';
import { formatApprox } from '../../platform/numeric/format';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { FORMULA_FORMAT, aligned } from '../shared/format';
import { fractionTex, rationalTex } from './values';

export interface WorkedExample {
  readonly id: string;
  readonly label: string;
  /** The radicand, as the decimal the reader would write. */
  readonly A: string;
  readonly n: number;
  /** The radicand is the area of a square, in square metres: the answer is a length. */
  readonly area?: boolean;
}
const example = (id: string, label: string, A: string, n: number, area?: boolean): WorkedExample => Object.freeze({ id, label, A, n, ...(area ? { area } : {}) });
export const WORKED_EXAMPLES: readonly WorkedExample[] = Object.freeze([
  example('w1', '√72', '72', 2),
  example('w2', '√0.32', '0.32', 2),
  example('w3', '∛(−54)', '-54', 3),
  example('w4', 'side of 2.25 m²', '2.25', 2, true),
]);

export interface WorkState { readonly tex: string; readonly caption: string }

const factorsTex = (factors: readonly PrimePower[]): string => factors.map(f => (f.e === 1 ? `${f.p}` : `${f.p}^{${f.e}}`)).join('\\cdot ');

export function workedFramesFor(A: Rational, n: number, area = false): readonly TraceFrame<WorkState>[] {
  const rad = (tex: string) => radicalOfTex(n, tex);
  const frames: { state: WorkState }[] = [];
  const word = n === 2 ? 'the non-negative number whose square is' : n === 3 ? 'the real number whose cube is' : `the real number whose ${n}th power is`;
  const w = radicalWork(A, n);
  frames.push({
    state: {
      tex: rad(rationalTex(A)),
      caption: area
        ? `A square has area ${rationalForm(A).text} square metres. Its side is the non-negative number whose square is ${rationalForm(A).text}.`
        : `We want ${word} ${rationalForm(A).text}.`,
    },
  });
  if (!w || w.root.kind !== 'exact' || w.factors === null || w.s === null || w.b === null || w.g === null) {
    frames.push({ state: { tex: rad(rationalTex(A)), caption: 'This example has no exact working to show.' } });
    return traceFrom<WorkState>(frames);
  }
  const { p, q, N, s, b, g } = w;
  const root = w.root.root;
  const rootTex = rootForm(root).tex;
  const absolute: Rational = { num: p, den: q };
  const fraction = fractionTex(absolute);
  /** `s·ⁿ√b` with the 1s left out. */
  const product = (): string => (b === 1n ? `${s}` : s === 1n ? rad(String(b)) : `${s}${rad(String(b))}`);
  const sign = w.negative ? '-' : '';

  if (w.negative) {
    frames.push({ state: { tex: `${rad(rationalTex(A))}=-${rad(rationalTex(absolute))}`, caption: 'An odd power keeps the sign, so an odd root of a negative number is negative: set the sign aside, take the root of the positive number, and put the sign back at the end.' } });
  }
  if (q !== 1n) {
    frames.push({ state: { tex: `${rationalTex(absolute)}=${fraction}`, caption: 'Write the number as a fraction in lowest terms, p over q.' } });
    const product_ = n === 2 ? `${p}\\cdot ${q}` : `${p}\\cdot ${q}^{${n - 1}}`;
    frames.push({
      state: {
        tex: aligned([`${rad(fraction)}&=\\frac{${rad(product_)}}{${q}}`, `&=\\frac{${rad(String(N))}}{${q}}`]),
        caption: `Multiply top and bottom by ${n === 2 ? 'q' : `q to the power ${n - 1}`} so that a whole number is left under the root: ${p} · ${q}${n === 2 ? '' : `^${n - 1}`} = ${N}. The denominator ${q} is now outside the root.`,
      },
    });
  }
  frames.push({ state: { tex: `${N}=${factorsTex(w.factors)}`, caption: `Factor ${N} into primes.` } });
  frames.push({
    state: {
      tex: aligned([`${N}&=${s}^{${n}}\\cdot ${b}`, `${rad(String(N))}&=${rad(`${s}^{${n}}\\cdot ${b}`)}=${product()}`]),
      caption: `Each group of ${n} equal prime factors leaves the root as one factor: that is ${s}. What cannot be grouped stays inside: ${b === 1n ? 'nothing, so the root is a whole number' : b}.`,
    },
  });
  if (q !== 1n) {
    frames.push({ state: { tex: `${sign}\\frac{${product()}}{${q}}=${rootTex}`, caption: g > 1n ? `Divide by ${q} and cancel the common factor ${g}: the simplest form.` : `Divide by ${q}: nothing cancels, so this is the simplest form.` } });
  } else if (w.negative) {
    frames.push({ state: { tex: `-${product()}=${rootTex}`, caption: 'Put the sign back.' } });
  }
  const back = rootPower(root);
  frames.push({ state: { tex: `\\left(${rootTex}\\right)^{${n}}=${rationalTex(back)}`, caption: `Check: raise the answer to the power ${n}. It returns ${rationalForm(back).text} exactly${back.num === A.num && back.den === A.den ? ', the number we started with' : ''}.` } });
  if (!rootForm(root).integer) {
    frames.push({ state: { tex: `${rootTex}\\approx ${formatApprox(w.root.approx, FORMULA_FORMAT).tex}\\ldots`, caption: 'The decimal is only a rounding: this root is irrational, so its decimal expansion never ends and never repeats. The exact form is the value.' } });
  }
  if (area) {
    frames.push({ state: { tex: `\\sqrt{${rationalTex(A)}\\ \\mathrm{m}^{2}}=${rootTex}\\ \\mathrm{m}`, caption: 'Units: a square root halves the exponent of the unit, so m² becomes m. The side is a length.' } });
  }
  return traceFrom<WorkState>(frames);
}

export function workedFrames(e: WorkedExample): readonly TraceFrame<WorkState>[] {
  return workedFramesFor(parseDecimal(e.A)!, e.n, e.area === true);
}
