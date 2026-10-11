import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rational, type Rational } from '../../src/math/quantity/rational';
import { SECANT_FUNCTIONS } from '../../src/math/calculus/catalog';
import { secant } from '../../src/math/calculus/difference';
import type { OneSided } from '../../src/math/calculus/univariate';

const fixture = JSON.parse(readFileSync('fixtures/derivatives.fixtures.json', 'utf8'));
const q = (r: Rational) => (r.den === 1n ? `${r.num}` : `${r.num}/${r.den}`);
const frac = (t: string): Rational => { const [n, d = '1'] = t.split('/'); return rational(BigInt(n!), BigInt(d)); };
const ulps = (a: number, b: number) => Math.abs(a - b) / (Number.EPSILON * Math.max(Math.abs(a), Math.abs(b), Number.MIN_VALUE));
let worstSecant = 0, worstSlope = 0;
function sameSide(actual: OneSided, expected: { kind: string; exact?: string; value?: number; sign?: number }) {
  expect(actual.kind).toBe(expected.kind);
  if (actual.kind === 'finite') {
    if (expected.exact !== undefined) expect(actual.exact && q(actual.exact)).toBe(expected.exact);
    else { const u = ulps(actual.value, expected.value!); worstSlope = Math.max(worstSlope, u); expect(u).toBeLessThanOrEqual(4); }
  }
  if (actual.kind === 'infinite') expect(actual.sign).toBe(expected.sign);
}
describe('III.3 secants and one-sided slopes against the independent Python oracle', () => {
  for (const [i, c] of fixture.secant.entries()) it(`${i}: ${c.fn} x=${c.x} h=${c.h}`, () => {
    const f = SECANT_FUNCTIONS[c.fn]!, x = frac(c.x), h = frac(c.h);
    const s = secant(f, x, h);
    expect(s.kind).toBe(c.secant.kind);
    if (s.kind === 'value') {
      if (c.secant.exact !== undefined) expect(s.exactSlope && q(s.exactSlope)).toBe(c.secant.exact);
      else {
        const err = Math.abs(s.slope - c.secant.value), bound = 8 * Number.EPSILON * c.secant.scale + 4 * Number.EPSILON * Math.abs(c.secant.value);
        worstSecant = Math.max(worstSecant, err / bound);
        expect(err).toBeLessThanOrEqual(bound);
      }
    }
    const d = f.slope(x);
    sameSide(d.left, c.left); sameSide(d.right, c.right);
    expect(d.kind === 'value' ? 'finite' : 'undefined').toBe(c.derivative.kind);
  });
  it('reports the worst observed binary64 disagreement (fraction of the documented budget / ulps)', () => {
    console.info(`worst secant error / budget = ${worstSecant.toExponential(3)}; worst derivative disagreement = ${worstSlope.toFixed(2)} ulps`);
    expect(worstSecant).toBeLessThanOrEqual(1);
  });
});

import { localModel, LINEAR_FUNCTIONS } from '../../src/lessons/calculus/linear-model-lesson';
import { applyRule, type RuleMode } from '../../src/math/calculus/rules';
import { chain, INNER, OUTER } from '../../src/math/calculus/chain';
const dec = (t: string): Rational => t.includes('/') ? frac(t) : (() => { const [i, f = ''] = t.split('.'); return rational(BigInt(i! + f), 10n ** BigInt(f.length)); })();
describe('III.4 linear models against the oracle', () => {
  for (const [i, c] of fixture.linear.entries()) it(`${i}: ${c.fn} x0=${c.x0} dx=${c.dx}`, () => {
    const m = localModel(LINEAR_FUNCTIONS[c.fn]!, dec(c.x0), dec(c.dx))!;
    if (typeof c.error === 'string') { expect(q(m.slope.exact!)).toBe(c.slope); expect(q(m.linear.exact!)).toBe(c.linear); expect(q(m.error.exact!)).toBe(c.error); }
    else { const tol = 16 * Number.EPSILON * c.scale; expect(Math.abs(m.linear.value - c.linear)).toBeLessThanOrEqual(tol); expect(Math.abs(m.error.value - c.error)).toBeLessThanOrEqual(tol); }
  });
});
describe('III.5 rules against derivatives obtained by exact interpolation of secants', () => {
  for (const [i, c] of fixture.rules.entries()) it(`${i}: ${c.mode} a=${c.a} b=${c.b} c=${c.c} x=${c.x}`, () => {
    const r = applyRule(c.mode as RuleMode, dec(c.a), dec(c.b), dec(c.c), dec(c.x), dec('0.5'));
    expect(r.rule ? q(r.rule.exact) : null).toBe(c.derivative);
    expect(r.independent ? q(r.independent.exact) : null).toBe(c.derivative);
    if (r.increment) expect(r.increment.holds).toBe(true);
  });
});
describe('III.6 chain rule against interpolated / 60-digit composite derivatives', () => {
  for (const [i, c] of fixture.chain.entries()) it(`${i}: ${c.outer}∘${c.inner} at ${c.x}`, () => {
    const r = chain(INNER[c.inner]!, OUTER[c.outer]!, dec(c.x), dec('0.5'));
    if (typeof c.derivative === 'string') { expect(q(r.product.exact!)).toBe(c.derivative); expect(q(r.direct!.exact!)).toBe(c.derivative); expect(r.agree).toBe(true); }
    else expect(Math.abs(r.product.value - c.derivative)).toBeLessThanOrEqual(8 * Number.EPSILON * Math.max(1, Math.abs(c.derivative)));
  });
});
