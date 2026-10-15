import { expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { activate, forwardTrace, network, neuron, type NetworkInput, type NeuronInput } from '../../../src/parts/p09/model/forward';
import { predictRegression } from '../../../src/parts/p02/model/linear-regression';

const affine: NetworkInput = {
  kind: 'network', x: [2, -1], W1: [[2, -1], [0, 3]], b1: [1, -2],
  W2: [[4, -2], [-1, 5]], b2: [3, 7], activation: 'identity',
};
const example: NeuronInput = { kind: 'neuron', x: [2, -3], w: [-4, .5], b: 1, activation: 'identity' };

test('owner rational neuron challenge accounts for each product, reduction, bias and edit', () => {
  const result = neuron(example);
  expect(result.row).toEqual({ products: [-8, -1.5], running: [-8, -9.5], dot: -9.5, b: 1, z: -8.5 });
  expect(result.a).toBe(-8.5);
  expect(result.shapes).toEqual({ x: [2, 1], w: [2, 1], b: [1, 1], z: [1, 1], a: [1, 1] });
  expect(neuron({ ...example, x: [3, -3] }).row.z).toBe(-12.5);
  expect(neuron({ ...example, w: [-4, 1.5] }).row.z).toBe(-11.5);
  expect(neuron({ ...example, activation: 'relu' }).a).toBe(0);
});

test('the scalar identity neuron agrees with the untouched frozen III-07 mechanism', () => {
  for (const [x, w, b] of [[-2, .5, 0], [0, -4, 1], [3, 2, -1], [1e150, 1e-150, 2]]) {
    expect(neuron({ kind: 'neuron', x: [x!], w: [w!], b: b!, activation: 'identity' }).a).toBe(predictRegression(x!, w!, b!));
  }
});

test('owner matrix challenge checks every intermediate and the exact affine collapse', () => {
  const result = network(affine);
  expect(result.hidden.map(row => row.products)).toEqual([[4, 1], [0, -3]]);
  expect(result.hidden.map(row => row.running)).toEqual([[4, 5], [0, -3]]);
  expect(result.hidden.map(row => row.z)).toEqual([6, -5]);
  expect(result.a1).toEqual([6, -5]);
  expect(result.output.map(row => row.products)).toEqual([[24, 10], [-6, -25]]);
  expect(result.output.map(row => row.z)).toEqual([37, -24]);
  expect(result.shapes).toEqual({ x: [2, 1], W1: [2, 2], b1: [2, 1], z1: [2, 1], a1: [2, 1], W2: [2, 2], b2: [2, 1], z2: [2, 1] });
  expect(result.collapse).toMatchObject({ status: 'defined', W: [[8, -10], [-2, 16]], b: [11, -4], difference: [0, 0] });
});

test('the same ReLU matrix challenge has a real nonlinear output and counterfactual collapse', () => {
  const result = network({ ...affine, activation: 'relu' });
  expect(result.hidden.map(row => row.z)).toEqual([6, -5]);
  expect(result.a1).toEqual([6, 0]);
  expect(result.output.map(row => row.z)).toEqual([27, 1]);
  expect(result.collapse).toMatchObject({ status: 'defined', difference: [-10, 25] });
});

test('owner exhaustive Boolean proof checks hidden XOR coordinates and affine contradiction', () => {
  const rows = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const values = rows.map(x => network({ kind: 'network', x, W1: [[1, -1], [-1, 1]], b1: [0, 0], W2: [[1, 1]], b2: [0], activation: 'relu' }));
  expect(values.map(value => value.a1)).toEqual([[0, 0], [0, 1], [1, 0], [0, 0]]);
  expect(values.map(value => value.output[0]!.z)).toEqual([0, 1, 1, 0]);
  const [c, p, q] = [0, 1, 1];
  expect(rows.map(([x1, x2]) => c + p * x1! + q * x2!)).toEqual([0, 1, 1, 2]);
});

test('activations respect ReLU boundaries and stable sigmoid tails', () => {
  expect([-1, 0, 1].map(z => activate(z, 'relu'))).toEqual([0, 0, 1]);
  expect([-1000, 0, 1000].map(z => activate(z, 'sigmoid'))).toEqual([0, .5, 1]);
  for (const z of [-8.5, -1, .25, 6]) expect(activate(z, 'sigmoid')).toBeCloseTo((1 + Math.tanh(z / 2)) / 2, 12);
  expect(activate(-700, 'sigmoid')).toBeGreaterThan(0);
});

test('zero features retain the correct biases in both layers', () => {
  const result = network({ ...affine, x: [0, 0] });
  expect(result.hidden.map(row => row.z)).toEqual([1, -2]);
  expect(result.output.map(row => row.z)).toEqual([11, -4]);
  expect(neuron({ ...example, x: [0, 0], b: 0 }).a).toBe(0);
});

test('shape and numeric trust boundaries reject malformed inputs without fabricated output', () => {
  const invalid = [
    { ...affine, x: [] }, { ...affine, W1: [[1], [1, 2]] }, { ...affine, W1: [[1, 2, 3]] },
    { ...affine, b1: [1] }, { ...affine, W2: [[1]] }, { ...affine, b2: [1] },
    { ...affine, x: [[1], [2]] }, { ...affine, b1: [true, 0] }, { ...affine, b2: [Infinity, 0] },
    { ...affine, activation: 'unknown' }, { ...affine, W1: [[NaN, 0], [1, 2]] },
  ];
  for (const input of invalid) expect(() => network(input as NetworkInput)).toThrow(RangeError);
  expect(() => neuron({ ...example, w: [1] })).toThrow(RangeError);
  expect(() => neuron({ ...example, x: Array(2) })).toThrow(RangeError);
});

test('finite inputs do not conceal overflowing or zero-underflow forward contributions', () => {
  for (const input of [
    { ...example, x: [1e308, 0], w: [2, 0] },
    { ...example, x: [1e308, 1e308], w: [1, 1] },
    { ...example, x: [1e308, 0], w: [1, 0], b: 1e308 },
    { ...example, x: [Number.MIN_VALUE, 0], w: [.5, 0] },
  ]) expect(() => neuron(input)).toThrow(RangeError);
  expect(neuron({ ...example, x: [1e-320, 0], w: [2, 0], b: 0 }).a).toBe(2e-320);
});

test('an unrepresentable counterfactual collapse preserves a valid actual forward result', () => {
  const result = network({ kind: 'network', x: [0], W1: [[1e308]], b1: [0], W2: [[2]], b2: [0], activation: 'identity' });
  expect(result.output[0]!.z).toBe(0);
  expect(result.collapse.status).toBe('unrepresentable');
});

test('real affine equivalence does not falsely promise identical rounded evaluation orders', () => {
  const result = network({ kind: 'network', x: [1], W1: [[1]], b1: [1e16], W2: [[1]], b2: [-1e16], activation: 'identity' });
  expect(result.output[0]!.z).toBe(0);
  expect(result.collapse).toMatchObject({ status: 'defined', W: [[1]], b: [0], rows: [{ z: 1 }], difference: [-1] });
});

test('a valid active sample does not establish representability of every binary counterfactual', () => {
  const input: NetworkInput = { kind: 'network', x: [0, 0], W1: [[1e-300, 0], [-1, 1]], b1: [0, 0], W2: [[1e-300, 0]], b2: [0], activation: 'relu' };
  expect(network(input).output[0]!.z).toBe(0);
  expect(network({ ...input, x: [0, 1] }).output[0]!.z).toBe(0);
  for (const x of [[1, 0], [1, 1]]) expect(() => network({ ...input, x })).toThrow(/underflow/);
});

test('complete forward traces detach parameters and derived arrays from future edits', () => {
  const input = structuredClone(affine);
  const frames = forwardTrace(input);
  expect(frames).toHaveLength(18);
  expect(frames.map(frame => frame.state.phase)).toEqual(Array.from({ length: 18 }, (_, i) => i));
  (input.W1[0] as number[])[0] = 99;
  expect((frames[0]!.state.input as NetworkInput).W1[0]![0]).toBe(2);
  expect(Object.isFrozen((frames[0]!.state.input as NetworkInput).W1[0])).toBe(true);
  expect(Object.isFrozen(frames[0]!.event!.numerical)).toBe(true);
  expect(frames.at(-1)!.explanation).toContain('Forward pass complete');
});

test('owner Fraction and Decimal challenges execute actual canonical Python independently', () => {
  const python = process.env.BOOK_PYTHON ?? (existsSync('.venv/bin/python') ? resolve('.venv/bin/python') : 'python3');
  const output = execFileSync(python, ['-B', 'tests/unit/platform/wave-e-owner.py'], { encoding: 'utf8' });
  console.info(output.trim());
  expect(output).toContain('OK');
});
