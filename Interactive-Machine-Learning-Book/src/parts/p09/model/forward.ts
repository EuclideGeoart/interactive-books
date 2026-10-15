import { traceFrom } from '../../../platform/trace';

export type Activation = 'identity' | 'relu' | 'sigmoid';
export interface NeuronInput { kind: 'neuron'; x: readonly number[]; w: readonly number[]; b: number; activation: Activation }
export interface NetworkInput { kind: 'network'; x: readonly number[]; W1: readonly (readonly number[])[]; b1: readonly number[]; W2: readonly (readonly number[])[]; b2: readonly number[]; activation: Activation }
export type Input = NeuronInput | NetworkInput;
export interface Row { products: number[]; running: number[]; dot: number; b: number; z: number }

function finite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${label} must be a finite number; arithmetic overflow is rejected.`);
  return value;
}
function vector(value: unknown, label: string): number[] {
  if (!Array.isArray(value) || !value.length) throw new RangeError(`${label} must be a nonempty dense vector (a column stored as a flat array).`);
  return Array.from(value, (v, i) => {
    if (!Object.hasOwn(value, i)) throw new RangeError(`${label} must not contain sparse array holes.`);
    return finite(v, `${label}[${i}]`);
  });
}
function matrix(value: unknown, label: string): number[][] {
  if (!Array.isArray(value) || !value.length) throw new RangeError(`${label} must be a nonempty dense matrix.`);
  const rows = Array.from(value, (row, i) => {
    if (!Object.hasOwn(value, i)) throw new RangeError(`${label} must not contain sparse matrix rows.`);
    return vector(row, `${label}[${i}]`);
  });
  if (rows.some(row => row.length !== rows[0]!.length)) throw new RangeError(`${label} must be rectangular.`);
  return rows;
}
function activation(value: unknown): asserts value is Activation {
  if (value !== 'identity' && value !== 'relu' && value !== 'sigmoid') throw new RangeError('Choose identity, relu or sigmoid.');
}
function product(a: number, b: number): number {
  const result = finite(a * b, 'Product');
  if (a !== 0 && b !== 0 && result === 0) throw new RangeError('A nonzero product underflowed to zero. Rescale the inputs.');
  return result;
}
export function activate(z: number, phi: Activation): number {
  finite(z, 'Preactivation'); activation(phi);
  if (phi === 'identity') return z;
  if (phi === 'relu') return Math.max(0, z);
  // Exponent arguments are nonpositive; rounded sigmoid tails are intentionally allowed.
  const e = Math.exp(-Math.abs(z));
  return z >= 0 ? 1 / (1 + e) : e / (1 + e);
}
function affine(x: readonly number[], W: readonly (readonly number[])[], b: readonly number[]): Row[] {
  return W.map((weights, i) => {
    let dot = 0;
    const products = weights.map((w, j) => product(w, x[j]!));
    const running = products.map(p => { dot = finite(dot + p, 'Running sum'); return dot; });
    return { products, running, dot, b: b[i]!, z: finite(dot + b[i]!, 'Bias addition') };
  });
}
export function neuron(input: NeuronInput) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.kind !== 'neuron') throw new RangeError('Expected a neuron request.');
  const x = vector(input.x, 'x'), w = vector(input.w, 'w'), b = finite(input.b, 'b'); activation(input.activation);
  if (w.length !== x.length) throw new RangeError('w and x must both have shape d × 1.');
  const row = affine(x, [w], [b])[0]!;
  return { kind: 'neuron' as const, row, a: activate(row.z, input.activation), shapes: { x: [x.length, 1], w: [w.length, 1], b: [1, 1], z: [1, 1], a: [1, 1] } };
}
export type Collapse = { status: 'defined'; W: number[][]; b: number[]; rows: Row[]; difference: number[] } | { status: 'unrepresentable'; reason: string };
export function network(input: NetworkInput) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.kind !== 'network') throw new RangeError('Expected a network request.');
  const x = vector(input.x, 'x'), W1 = matrix(input.W1, 'W1'), b1 = vector(input.b1, 'b1'), W2 = matrix(input.W2, 'W2'), b2 = vector(input.b2, 'b2');
  activation(input.activation);
  const d = x.length, h = W1.length, o = W2.length;
  if (W1[0]!.length !== d || b1.length !== h || W2[0]!.length !== h || b2.length !== o) throw new RangeError('Require x d × 1, W1 h × d, b1 h × 1, W2 o × h, b2 o × 1.');
  const hidden = affine(x, W1, b1), a1 = hidden.map(row => activate(row.z, input.activation));
  const output = affine(a1, W2, b2);
  let collapse: Collapse;
  try {
    const W = W2.map(weights => Array.from({ length: d }, (_, j) => affine(W1.map(row => row[j]!), [weights], [0])[0]!.z));
    const b = affine(b1, W2, b2).map(row => row.z), rows = affine(x, W, b);
    collapse = { status: 'defined', W, b, rows, difference: output.map((row, i) => finite(row.z - rows[i]!.z, 'Collapse difference')) };
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    collapse = { status: 'unrepresentable', reason: error.message };
  }
  return { kind: 'network' as const, hidden, a1, output, collapse, shapes: { x: [d, 1], W1: [h, d], b1: [h, 1], z1: [h, 1], a1: [h, 1], W2: [o, h], b2: [o, 1], z2: [o, 1] } };
}
export const forward = (input: Input) => input?.kind === 'neuron' ? neuron(input) : network(input);
export interface ForwardState { input: Input; phase: number }
export function operations(input: Input, result = forward(input)) {
  const rows = result.kind === 'neuron' ? [result.row] : [...result.hidden, ...result.output];
  return [
    'Inspect the input and parameter shapes. These parameters are hand-chosen, not trained.',
    ...rows.flatMap((row, i) => {
      const label = result.kind === "neuron" ? "Neuron row" : i < result.hidden.length ? `Hidden row ${i + 1}` : `Output row ${i - result.hidden.length + 1}`;
      return [
      ...row.products.map((p, j) => `${label}, term ${j + 1}: computed binary64 contribution ${p}; running dot sum ${row.running[j]}.`),
      `${label}: computed binary64 preactivation ${row.z} from dot ${row.dot} plus bias ${row.b}.`,
      result.kind === 'neuron' ? `${label}: computed binary64 ${input.activation} output ${result.a} from preactivation ${row.z}.`
        : i < result.hidden.length ? `${label}: computed binary64 ${input.activation} output ${result.a1[i]} from preactivation ${row.z}.`
        : `${label}: computed binary64 output is ${row.z}; no output activation or threshold.`,
      ];
    }),
    result.kind === 'neuron' ? 'Forward pass complete; output a is not a classification decision.'
      : `Forward pass complete. ${input.activation === 'identity' ? 'Compare identity composition with the affine collapse, allowing rounding differences.' : 'The affine collapse is a counterfactual with the hidden activation removed.'}`,
  ];
}
export function forwardTrace(input: Input) {
  const numerical = forward(input);
  return traceFrom(operations(input, numerical).map((explanation, phase) => ({ state: { input, phase }, event: { numerical }, explanation })));
}
