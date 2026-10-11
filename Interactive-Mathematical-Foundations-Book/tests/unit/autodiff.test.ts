import { describe, expect, it } from 'vitest';
import { int, rational } from '../../src/math/quantity/rational';
import { centralDifference, evaluate, forwardMode, GRAPHS, reverseMode, topologicalOrder, type Graph } from '../../src/math/calculus/autodiff';

const ex = (v: unknown) => (v as { exact: { num: bigint; den: bigint } }).exact;
describe('computational graph engine', () => {
  it('evaluates in a deterministic topological order and rejects malformed graphs', () => {
    expect(topologicalOrder(GRAPHS['shared-input']!)).toEqual(['x', 'y', 'u', 'z']);
    const reordered: Graph = { ...GRAPHS['shared-input']!, nodes: [...GRAPHS['shared-input']!.nodes].reverse() };
    expect(topologicalOrder(reordered)).toEqual(['y', 'x', 'u', 'z']);
    expect(() => topologicalOrder({ id: 'c', label: '', tex: '', inputs: [], outputs: ['a'], nodes: [{ id: 'a', op: 'neg', args: ['b'] }, { id: 'b', op: 'neg', args: ['a'] }] })).toThrow(/cycle/);
    expect(() => topologicalOrder({ id: 'c', label: '', tex: '', inputs: [], outputs: ['a'], nodes: [{ id: 'a', op: 'add', args: ['a'] }] })).toThrow(/arguments/);
  });
  it('mandatory reference: z = (x + y)x has ∂z/∂x = 2x + y and ∂z/∂y = x, with both paths to x accumulated', () => {
    for (const [x, y] of [[2, 3], [-1, 4], [0, 0], [3, -5]] as const) {
      const g = GRAPHS['shared-input']!, e = evaluate(g, { x: int(x), y: int(y) }), r = reverseMode(g, e, 'z');
      expect(ex(r.adjoints.x)).toEqual(int(2 * x + y)); expect(ex(r.adjoints.y)).toEqual(int(x));
      const toX = r.steps.flatMap(s => s.contributions).filter(c => c.from === 'x');
      expect(toX.map(c => c.to).sort()).toEqual(['u', 'z']);                               // two paths
      expect(ex(forwardMode(g, e, 'x').tangents.z)).toEqual(int(2 * x + y));
    }
  });
  it('a repeated argument is two edges with two contributions', () => {
    const g = GRAPHS.square!, e = evaluate(g, { x: int(3) }), r = reverseMode(g, e, 'q');
    expect(e.edges.map(x => [x.from, x.index])).toEqual([['x', 0], ['x', 1]]);
    expect(r.steps.at(-1)!.contributions.length + r.steps[0]!.contributions.length).toBe(2);
    expect(ex(r.adjoints.x)).toEqual(int(6));
  });
  it('undefined values propagate instead of being fabricated, and finite differences refuse them', () => {
    const g = GRAPHS.quotient!, e = evaluate(g, { x: int(2), y: int(2) });
    expect(e.values.r!.kind).toBe('undefined'); expect(reverseMode(g, e, 'r').adjoints.x!.kind).toBe('undefined');
    expect(centralDifference(g, { x: int(2), y: int(2) }, 'r', 'x')).toBeNull();
    const log: Graph = { id: 'l', label: '', tex: '', inputs: ['x'], outputs: ['y'], nodes: [{ id: 'x', op: 'input', args: [] }, { id: 'y', op: 'log', args: ['x'] }] };
    expect(evaluate(log, { x: int(-1) }).values.y!.kind).toBe('undefined');
  });
  it('forward needs one pass per input, reverse one per output: both give the same Jacobian', () => {
    const g = GRAPHS['many-outputs']!, e = evaluate(g, { t: rational(3n, 2n) });
    const col = forwardMode(g, e, 't').tangents, rows = g.outputs.map(o => reverseMode(g, e, o).adjoints.t!);
    g.outputs.forEach((o, j) => expect((col[o] as { value: number }).value).toBe((rows[j] as { value: number }).value));
  });
  it('analytic gradients agree with central differences within the documented budget', () => {
    const g = GRAPHS['sin-product']!, e = evaluate(g, { x: int(1), y: int(2) }), r = reverseMode(g, e, 'f');
    expect(Math.abs((r.adjoints.x as { value: number }).value - centralDifference(g, { x: int(1), y: int(2) }, 'f', 'x')!)).toBeLessThan(1e-8);
  });
});
