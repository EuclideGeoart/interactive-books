import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { activate, forward, forwardTrace, network, neuron, type Input, type NetworkInput, type NeuronInput } from '../../../src/parts/p09/model/forward';
import { derive, edit, extreme, initial, withActivation, xorInput } from '../../../src/parts/p09/lesson';
import { predictRegression } from '../../../src/parts/p02/model/linear-regression';

const fixture = JSON.parse(readFileSync('fixtures/p09/forward.fixtures.json', 'utf8')) as { cases: { name: string; exact: boolean; input: Input; expected: Record<string, unknown> }[] };
function compare(a: unknown, e: unknown, exact: boolean) {
  if (Array.isArray(e)) { expect(Array.isArray(a)).toBe(true); expect((a as unknown[]).length).toBe(e.length); e.forEach((v, i) => compare((a as unknown[])[i], v, exact)); }
  else if (e !== null && typeof e === 'object') {
    expect(a).not.toBeNull(); Object.entries(e).forEach(([k, v]) => compare((a as Record<string, unknown>)[k], v, exact));
  } else if (typeof e === 'number') {
    expect(typeof a).toBe('number'); expect(Number.isFinite(a)).toBe(true);
    if (exact || e === 0) expect(a === e).toBe(true);
    else expect(Math.abs((a as number) - e)).toBeLessThanOrEqual(32 * Number.EPSILON * (Math.abs(e) + (Math.abs(e) >= 1e-8 ? 1 : 0)));
  } else expect(a).toEqual(e);
}
const N = () => structuredClone(initial('neuron').input) as NeuronInput;
const L = () => structuredClone(initial('network').input) as NetworkInput;

describe('literal hand calculations', () => {
  for (const c of fixture.cases) it(c.name, () => compare(forward(c.input), c.expected, c.exact));
  it('identity d=1 retains frozen III-07 affine prediction semantics', () => {
    for (const x of [-2, 0, 2]) expect(neuron({ kind: 'neuron', x: [x], w: [.5], b: .25, activation: 'identity' }).a).toBe(predictRegression(x, .5, .25));
  });
  it('supports compatible dimensions and multiple output rows; exposes scalar bias shape', () => {
    const s: NetworkInput = { kind: 'network', x: [1, 2, 3], W1: [[1, -1, 2]], b1: [1], W2: [[2], [-1]], b2: [0, 3], activation: 'identity' };
    const f = network(s);
    expect(f.shapes).toEqual({ x: [3, 1], W1: [1, 3], b1: [1, 1], z1: [1, 1], a1: [1, 1], W2: [2, 1], b2: [2, 1], z2: [2, 1] });
    expect(f.a1).toEqual([6]); expect(f.output.map(r => r.z)).toEqual([12, -3]);
    expect(neuron(N()).shapes).toEqual({ x: [2, 1], w: [2, 1], b: [1, 1], z: [1, 1], a: [1, 1] });
  });
  it('XOR counterexample and contradiction apply to scalar outputs, without thresholds', () => {
    expect([[0, 0], [0, 1], [1, 0], [1, 1]].map(x => network(xorInput(x)).output[0]!.z)).toEqual([0, 1, 1, 0]);
    const b = 0, w1 = 1 - b, w2 = 1 - b;
    expect(w1 + w2 + b).toBe(2); expect(w1 + w2 + b).not.toBe(0);
  });
  it('stable sigmoid tails, ReLU zero and invalid standalone activation boundaries', () => {
    expect(activate(-1000, 'sigmoid')).toBe(0); expect(activate(1000, 'sigmoid')).toBe(1);
    expect(activate(40, 'sigmoid')).toBe(1); expect(activate(-40, 'sigmoid')).toBeGreaterThan(0);
    expect(activate(0, 'relu')).toBe(0); expect(activate(0, 'sigmoid')).toBe(.5);
    for (const z of [NaN, Infinity, -Infinity, '2', true, null]) expect(() => activate(z as number, 'relu')).toThrow();
    expect(() => activate(1, 'unknown' as 'relu')).toThrow();
  });
});

describe('trust boundaries and finite arithmetic', () => {
  it('rejects wrong request kinds, types, sparse vectors, sparse rows and all shape mismatches', () => {
    for (const input of [null, undefined, [], {}, true, 'neuron', { ...N(), kind: 'unknown' }]) expect(() => forward(input as Input)).toThrow();
    for (const base of [N(), L()]) for (const [key, value] of Object.entries(base)) {
      const badValues = key === 'kind' || key === 'activation' ? [null, [], {}, 0, true, 'unknown']
        : Array.isArray(value) ? [null, [], true, '1', [null], [[1], [1, 2]]]
        : [null, true, '1', [], NaN, Infinity];
      for (const bad of badValues) expect(() => forward({ ...base, [key]: bad } as Input)).toThrow();
    }
    const sparse = Array<number>(2); sparse[1] = 1;
    const inherited = Array<number>(2); inherited[1] = 1;
    const prototype = Object.create(Array.prototype); prototype[0] = 1; Object.setPrototypeOf(inherited, prototype);
    expect(() => neuron({ ...N(), x: inherited })).toThrow();
    const rows = Array<number[]>(2); rows[1] = [1, 1];
    for (const s of [{ ...N(), x: sparse }, { ...N(), w: sparse }, { ...L(), W1: rows }, { ...L(), W1: [sparse, [1, 1]] }, { ...L(), b1: sparse }]) expect(() => forward(s)).toThrow();
    for (const [key, bad] of [['W1', [[1]]], ['b1', [0]], ['W2', [[1]]], ['b2', [0, 0]], ['x', [1]]] as const) expect(() => forward({ ...L(), [key]: bad } as Input)).toThrow();
    expect(() => neuron({ ...N(), w: [1] })).toThrow();
  });
  it('validates every parameter leaf, including zero input and inactive ReLU paths', () => {
    for (const bad of [true, '1', null, NaN, Infinity, -Infinity]) {
      for (const key of ['x', 'w'] as const) expect(() => forward({ ...N(), [key]: [bad, 0], b: 0 } as unknown as Input)).toThrow();
      for (const key of ['W1', 'W2', 'b1', 'b2'] as const) {
        const s = structuredClone(L()) as unknown as Record<string, unknown>;
        const values = s[key] as unknown[];
        if (key.startsWith('W')) (values[0] as unknown[])[0] = bad; else values[0] = bad;
        expect(() => forward(s as unknown as Input)).toThrow();
      }
    }
  });
  it('rejects overflow at products, running sums, bias and output; rejects product underflow to zero', () => {
    for (const [x, w, b] of [[[1e308], [2], 0], [[1e308, 1e308], [1, 1], 0], [[1e308], [1], 1e308], [[1e-300], [1e-300], 0]] as const)
      expect(() => neuron({ kind: 'neuron', x, w, b, activation: 'relu' })).toThrow();
    for (const s of [
      { kind: 'network', x: [2], W1: [[1e308]], b1: [0], W2: [[1]], b2: [0], activation: 'relu' },
      { kind: 'network', x: [1], W1: [[1]], b1: [1], W2: [[1e308]], b2: [0], activation: 'identity' },
      { kind: 'network', x: [1], W1: [[1e-300]], b1: [0], W2: [[1e-300]], b2: [0], activation: 'identity' },
    ]) expect(() => network(s as NetworkInput)).toThrow();
  });
  it('does not invalidate an actual pass when only the collapse overflows', () => {
    const f = network({ kind: 'network', x: [0], W1: [[1e308]], b1: [-1], W2: [[2]], b2: [0], activation: 'relu' });
    expect(f.a1).toEqual([0]); expect(f.output[0]!.z).toBe(0); expect(f.collapse.status).toBe('unrepresentable');
    if (f.collapse.status === 'unrepresentable') expect(f.collapse.reason).toContain('overflow');
  });
  it('shows identity-rounding differences rather than manufacturing equality', () => {
    const f = network({ kind: 'network', x: [1], W1: [[1]], b1: [1e16], W2: [[1]], b2: [-1e16], activation: 'identity' });
    expect(f.output[0]!.z).toBe(0); expect(f.collapse.status).toBe('defined');
    if (f.collapse.status === 'defined') { expect(f.collapse.rows[0]!.z).toBe(1); expect(f.collapse.difference).toEqual([-1]); }
  });
});

describe('complete immutable traces and derived lesson state', () => {
  for (const mode of ['neuron', 'network'] as const) it(`${mode}: full snapshots, reset source and replay edits`, () => {
    const s = structuredClone(initial(mode));
    const before = structuredClone(s), trace = forwardTrace(s.input);
    expect(s).toEqual(before); expect(trace.length).toBe(mode === 'neuron' ? 6 : 14);
    const frozen = (value: unknown) => { if (value !== null && typeof value === 'object') { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozen); } };
    frozen(trace);
    trace.forEach((frame, i) => { expect(frame.index).toBe(i); expect(frame.state.phase).toBe(i); compare(frame.event!.numerical, forward(before.input), true); expect(frame.explanation).toBe(derive(frame.state).steps[i]); });
    (s.input.x as number[])[0] = 999;
    expect(trace[0]!.state.input.x[0]).toBe(before.input.x[0]);
    expect(() => { (trace[0]!.state.input.x as number[])[0] = 99; }).toThrow();
    const displayed = trace[2]!.state, input = edit(displayed.input, 'x', 0, 0, 3);
    expect(input.x[0]).toBe(3); expect(displayed.input.x[0]).toBe(before.input.x[0]);
    expect(derive({ input, phase: displayed.phase }).state.phase).toBe(2);
    expect(initial(mode)).toEqual(before);
  });
  it('explicitly names hidden/output rows and preserves complete events', () => {
    const trace = forwardTrace(L());
    expect(trace[1]!.explanation).toContain('Hidden row 1'); expect(trace[5]!.explanation).toContain('Hidden row 2'); expect(trace[9]!.explanation).toContain('Output row 1');
    expect(derive(initial('network')).collapseLabel).toContain('Counterfactual');
    expect(derive({ input: withActivation(L(), 'identity'), phase: 0 }).collapseLabel).toContain('Identity composition');
  });
  it('edits every input/parameter immutably and rejects unknown coordinates and phases', () => {
    for (const [key, i, j] of [['x', 0, 0], ['W1', 1, 1], ['b1', 1, 0], ['W2', 0, 1], ['b2', 0, 0]] as const) {
      const s = L(), next = edit(s, key, i, j, 3); expect(next).not.toEqual(s); expect(s).toEqual(L()); forward(next);
    }
    for (const key of ['x', 'w', 'b'] as const) expect(edit(N(), key, 0, 0, 3)).not.toEqual(N());
    for (const value of [Infinity, NaN, 1001, -1001]) expect(() => edit(N(), 'x', 0, 0, value)).toThrow();
    expect(() => edit(N(), 'x', -1, 0, 2)).toThrow(); expect(() => edit(L(), 'W1', 0, 9, 2)).toThrow();
    expect(() => edit(N(), 'W1', 0, 0, 2)).toThrow(); expect(() => edit(L(), 'b', 0, 0, 2)).toThrow();
    for (const phase of [-1, .5, 99, NaN]) expect(() => derive({ input: N(), phase })).toThrow();
    expect(neuron(extreme(-1)).a).toBe(0); expect(neuron(extreme(1)).a).toBe(1); expect(() => extreme(0)).toThrow();
  });
});

it('keeps a valid active pass when binary counterfactual outputs underflow', () => {
  const input: NetworkInput = { kind: 'network', x: [0, 0], W1: [[1e-300, 0], [-1, 1]], b1: [0, 0], W2: [[1e-300, 0]], b2: [0], activation: 'relu' };
  const before = structuredClone(input), value = derive({ input, phase: 0 });
  expect(input).toEqual(before); expect(value.numerical.kind).toBe('network');
  if (value.numerical.kind === 'network') expect(value.numerical.output[0]!.z).toBe(0);
  expect(() => derive({ input: { ...input, x: [1, 0] }, phase: 0 })).toThrow(/underflow/);
  expect(value.binary.map(c => c.status)).toEqual(['defined', 'defined', 'unavailable', 'unavailable']);
  for (const c of value.binary) {
    if (c.status === 'defined') expect(c.forward.output[0]!.z).toBe(0);
    else { expect(c.reason).toContain('underflow'); expect('forward' in c).toBe(false); expect(() => network({ ...input, x: c.x })).toThrow(/underflow/); }
  }
  expect(derive({ input: edit(input, 'b2', 0, 0, 1), phase: 0 }).state.input.x).toEqual([0, 0]);
  expect(derive(initial('network')).binary.every(c => c.status === 'defined')).toBe(true);
});

it('qualifies sigmoid endpoints and small-bias numerical presentation without changing values', () => {
  const saturated = derive({ input: extreme(-1), phase: 0 });
  expect(saturated.formulas[0]!.tex).toContain('a=\\operatorname{sigmoid}(z)\\approx0');
  expect(saturated.steps).toContain('Neuron row: computed binary64 sigmoid output 0 from preactivation -1000.');
  const rounded = derive({ input: { kind: 'neuron', x: [1, 0], w: [1, 0], b: 1e-16, activation: 'identity' }, phase: 0 });
  expect(rounded.formulas[0]!.tex).toContain('z\\approx1+(1\\times10^{-16})\\approx1');
  expect(rounded.steps).toContain('Neuron row: computed binary64 preactivation 1 from dot 1 plus bias 1e-16.');
  const stage = readFileSync('src/parts/p09/ForwardStage.tsx', 'utf8');
  for (const label of ['Σ products ≈ {shown(row.dot)}', 'z ≈ {shown(row.z)}', '{phi}: a ≈ {shown(a)}', '${shown(r.dot)} + (${shown(r.b)}) ≈ ${shown(r.z)}']) expect(stage).toContain(label);
});
