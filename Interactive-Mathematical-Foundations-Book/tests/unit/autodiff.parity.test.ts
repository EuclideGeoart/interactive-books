import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rational, type Rational } from '../../src/math/quantity/rational';
import { evaluate, forwardMode, GRAPHS, reverseMode, type Num } from '../../src/math/calculus/autodiff';

const fixture = JSON.parse(readFileSync('fixtures/autodiff.fixtures.json', 'utf8'));
const frac = (t: string): Rational => { if (t.includes('.')) { const [i, f] = t.split('.'); return rational(BigInt(i! + f!), 10n ** BigInt(f!.length)); } const [n, d = '1'] = t.split('/'); return rational(BigInt(n!), BigInt(d)); };
const q = (r: Rational) => (r.den === 1n ? `${r.num}` : `${r.num}/${r.den}`);
let worst = 0;
function same(actual: Num, expected: { exact?: string; value?: number }) {
  expect(actual.kind).toBe('value');
  if (actual.kind !== 'value') return;
  if (expected.exact !== undefined) { expect(actual.exact && q(actual.exact)).toBe(expected.exact); return; }
  const u = Math.abs(actual.value - expected.value!) / (Number.EPSILON * Math.max(1, Math.abs(expected.value!)));
  worst = Math.max(worst, u); expect(u).toBeLessThanOrEqual(8);
}
describe('III.10 reverse-mode adjoints and forward-mode tangents against independent dual numbers', () => {
  for (const [i, c] of fixture.cases.entries()) it(`${i}: ${c.graph} at ${c.inputs.join(', ')}`, () => {
    const g = GRAPHS[c.graph]!, inputs = Object.fromEntries(g.inputs.map((id, k) => [id, frac(c.inputs[k])]));
    const e = evaluate(g, inputs);
    if (c.outputs === null) {
      for (const o of g.outputs) { expect(e.values[o]!.kind).toBe('undefined'); expect(reverseMode(g, e, o).adjoints[g.inputs[0]!]!.kind).toBe('undefined'); }
      return;
    }
    g.outputs.forEach((o, j) => {
      same(e.values[o]!, c.outputs[j]);
      const rev = reverseMode(g, e, o);                              // one reverse pass per output: a Jacobian ROW
      g.inputs.forEach((id, k) => same(rev.adjoints[id]!, c.jacobian[j][k]));
    });
    g.inputs.forEach((id, k) => {                                    // one forward pass per input: a Jacobian COLUMN
      const fwd = forwardMode(g, e, id);
      g.outputs.forEach((o, j) => same(fwd.tangents[o]!, c.jacobian[j][k]));
    });
  });
  for (const t of fixture.tapes) it(`shared-input contributions at x=${t.x}, y=${t.y} match an explicit tape`, () => {
    const g = GRAPHS['shared-input']!, e = evaluate(g, { x: frac(t.x), y: frac(t.y) }), rev = reverseMode(g, e, 'z');
    const got = rev.steps.flatMap(s => s.contributions.map(c => [c.from, c.to, c.amount.kind === 'value' ? q(c.amount.exact!) : 'undefined']));
    expect(got).toEqual(t.contributions);
    expect([rev.adjoints.x, rev.adjoints.y].map(a => (a as { exact: Rational }).exact).map(q)).toEqual([t.adjoint_x, t.adjoint_y]);
  });
  it('reports the worst binary64 disagreement', () => { console.info(`worst autodiff disagreement: ${worst.toFixed(2)} ulps`); expect(worst).toBeLessThanOrEqual(8); });
});
