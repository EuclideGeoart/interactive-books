import examples from '../../../data/p09/examples.json' with { type: 'json' };
import { forward, network, operations, type Activation, type ForwardState, type Input, type NeuronInput, type NetworkInput } from './model/forward';

export type Mode = 'neuron' | 'network';
export const shown = (v: number) => v === 0 ? '0' : Math.abs(v) >= 1e5 || Math.abs(v) < .0001 ? v.toExponential(3) : Number(v.toPrecision(6)).toString();
const tex = (v: number): string => { const [a, e] = String(v).split('e'); return e === undefined ? a! : `${a}\\times10^{${Number(e)}}`; };
export function initial(mode: Mode): ForwardState {
  const input: Input = mode === 'neuron' ? { ...examples.neuron, kind: 'neuron', activation: 'relu' } : { ...examples.network, kind: 'network', activation: 'relu' };
  return { input, phase: 0 };
}
export function edit(input: Input, field: 'x' | 'w' | 'b' | 'W1' | 'b1' | 'W2' | 'b2', i: number, j: number, value: number): Input {
  if (!Number.isFinite(value) || Math.abs(value) > 1000) throw new RangeError('The explorer bounds editable values to −1000…1000.');
  let next: Input;
  if (input.kind === 'neuron') {
    if (field === 'b') next = { ...input, b: value };
    else if (field === 'x' || field === 'w') {
      if (!Number.isInteger(i) || i < 0 || i >= input[field].length) throw new RangeError('Unknown vector coordinate.');
      next = { ...input, [field]: input[field].map((v, k) => k === i ? value : v) };
    } else throw new RangeError('Unknown neuron parameter.');
  } else if (field === 'W1' || field === 'W2') {
    if (!Number.isInteger(i) || !Number.isInteger(j) || !input[field][i] || j < 0 || j >= input[field][i]!.length) throw new RangeError('Unknown matrix entry.');
    next = { ...input, [field]: input[field].map((row, r) => r === i ? row.map((v, c) => c === j ? value : v) : row) };
  } else if (field === 'x' || field === 'b1' || field === 'b2') {
    if (!Number.isInteger(i) || i < 0 || i >= input[field].length) throw new RangeError('Unknown vector coordinate.');
    next = { ...input, [field]: input[field].map((v, k) => k === i ? value : v) };
  } else throw new RangeError('Unknown network parameter.');
  forward(next); return next;
}
export function withActivation(input: Input, activation: Activation): Input { const next = { ...input, activation }; forward(next); return next; }
export function extreme(sign: number): NeuronInput {
  if (sign !== -1 && sign !== 1) throw new RangeError('Choose a positive or negative extreme.');
  return { kind: 'neuron', x: [0, 0], w: [.5, 2], b: sign * 1000, activation: 'sigmoid' };
}
export function xorInput(x: readonly number[] = [1, 0]): NetworkInput { return { ...initial('network').input as NetworkInput, x }; }
function binaryCases(input: NetworkInput) {
  return examples.binary.map(x => {
    try { return { x, status: 'defined' as const, forward: network({ ...input, x }) }; }
    catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return { x, status: 'unavailable' as const, reason: error.message };
    }
  });
}
export function derive(state: ForwardState) {
  const numerical = forward(state.input), steps = operations(state.input, numerical);
  if (!Number.isInteger(state.phase) || state.phase < 0 || state.phase >= steps.length) throw new RangeError('Unknown forward frame.');
  const rows = numerical.kind === 'neuron' ? [{ label: 'Neuron', row: numerical.row, a: numerical.a, phi: state.input.activation }]
    : [...numerical.hidden.map((row, i) => ({ label: `Hidden ${i + 1}`, row, a: numerical.a1[i]!, phi: state.input.activation })),
      ...numerical.output.map((row, i) => ({ label: `Output ${i + 1}`, row, a: row.z, phi: 'identity' as const }))];
  const formulas = rows.map(({ label, row, a, phi }) => ({ label: `${label}: computed binary64 dot, bias, preactivation and output`,
    tex: `z\\approx${tex(row.dot)}+(${tex(row.b)})\\approx${tex(row.z)},\\quad a=\\operatorname{${phi}}(z)\\approx${tex(a)}` }));
  const collapseLabel = state.input.activation === 'identity' ? 'Identity composition: algebraically equal; binary64 may differ.' : 'Counterfactual affine collapse: hidden activation removed; equivalence is not asserted.';
  const inspector = [
    { label: 'Input provenance', value: 'Hand-chosen, untrained values', detail: 'Single sample; columns stored as flat arrays. No seed, loss, optimizer or class threshold.' },
    ...Object.entries(numerical.shapes).map(([label, dims]) => ({ label: `${label} shape`, value: `${dims[0]} × ${dims[1]}` })),
    { label: 'Activation', value: state.input.activation, detail: numerical.kind === 'network' ? 'Elementwise at the hidden layer only; output is z2.' : 'Output is a; no threshold.' },
    ...rows.map(({ label, row, a }) => ({ label, value: `dot ${shown(row.dot)}; b ${shown(row.b)}; z ${shown(row.z)}; a ${shown(a)}` })),
  ];
  const speech = rows.map(({ label, row, a }) => `${label}: dot ${shown(row.dot)}, bias ${shown(row.b)}, preactivation ${shown(row.z)}, output ${shown(a)}.`).join(' ');
  return { state, numerical, rows, formulas, inspector, collapseLabel, steps, speech,
    binary: state.input.kind === 'network' ? binaryCases(state.input) : [] };
}
