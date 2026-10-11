import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rational, sub, type Rational } from '../../src/math/quantity/rational';
import { accumulation, exactIntegral, INTEGRANDS, riemann, signedParts, type ExactIntegrand, type Rule } from '../../src/math/calculus/integration';
import { errorsFor, PROBLEMS } from '../../src/lessons/calculus/quadrature-lesson';

const fixture = JSON.parse(readFileSync('fixtures/integration.fixtures.json', 'utf8'));
const frac = (t: string): Rational => { if (t.includes('.')) { const [i, f] = t.split('.'); return rational(BigInt(i! + f!), 10n ** BigInt(f!.length)); } const [n, d = '1'] = t.split('/'); return rational(BigInt(n!), BigInt(d)); };
const q = (r: Rational) => (r.den === 1n ? `${r.num}` : `${r.num}/${r.den}`);
const RULES: readonly Rule[] = ['left', 'right', 'midpoint', 'trapezoid'];
let worst = 0;
describe('III.12 exact sums and integrals against Faulhaber closed forms and Simpson', () => {
  for (const c of fixture.riemann) it(`${c.fn} on [${c.a}, ${c.b}]`, () => {
    const g = INTEGRANDS[c.fn] as ExactIntegrand, A = frac(c.a), B = frac(c.b);
    expect(q(exactIntegral(g, A, B))).toBe(c.integral);
    const parts = signedParts(g, A, B)!; expect([q(parts.positive), q(parts.negative)]).toEqual([c.positive, c.negative]);
    for (const rule of RULES) for (const [n, v] of Object.entries(c.sums[rule] as Record<string, string>)) {
      const s = riemann(g, A, B, Number(n), rule); expect(s.kind === 'value' && s.exact ? q(s.exact) : null, `${rule} n=${n}`).toBe(v);
    }
  });
  for (const c of fixture.numeric) it(`${c.fn}: binary64 sums within the summation-rounding budget of 60-digit sums`, () => {
    const g = INTEGRANDS[c.fn]!, A = frac(c.a), B = frac(c.b), maxF = c.fn === 'exp' ? Math.E : 1;
    for (const rule of RULES) for (const [n, v] of Object.entries(c.sums[rule] as Record<string, number>)) {
      const s = riemann(g, A, B, Number(n), rule); if (s.kind !== 'value') throw new Error('undefined');
      const tol = 4 * (Number(n) + 2) * Number.EPSILON * maxF * Math.abs(Number(c.b) - Number(c.a)), err = Math.abs(s.value - v);
      worst = Math.max(worst, err / tol); expect(err).toBeLessThanOrEqual(tol);
    }
  });
  it('reports the worst binary64 sum disagreement', () => { console.info(`worst quadrature sum error / budget: ${worst.toExponential(3)}`); expect(worst).toBeLessThanOrEqual(1); });
});
describe('III.15 convergence tables', () => {
  for (const c of fixture.quadrature) it(`${c.fn}: errors for n = 1 … 1024`, () => {
    for (const [rule, list] of Object.entries(c.errors as Record<string, (string | number)[]>)) {
      const e = errorsFor(PROBLEMS[c.fn]!, rule as Rule);
      list.forEach((v, k) => {
        if (typeof v === 'string') expect(q(e[k]!.exact!), `${rule} k=${k}`).toBe(v);
        else expect(Math.abs(e[k]!.value - v)).toBeLessThanOrEqual(4 * (2 ** k + 2) * Number.EPSILON * 3 + 1e-15);
      });
    }
  });
});
describe('III.13 accumulation F(x) against Simpson-built accumulation and interpolated one-sided slopes', () => {
  for (const c of fixture.accumulation) it(`${c.fn} a=${c.a} x=${c.x}`, () => {
    const F = accumulation(INTEGRANDS[c.fn] as ExactIntegrand, frac(c.a)), X = frac(c.x), v = F.at(X), d = F.slope(X);
    expect(v.kind === 'value' ? q(v.exact!) : null).toBe(c.F);
    expect(d.left.kind === 'finite' ? q(d.left.exact!) : null).toBe(c.left); expect(d.right.kind === 'finite' ? q(d.right.exact!) : null).toBe(c.right);
    if (c.left === c.right) { expect(d.kind).toBe('value'); expect(q(d.exact!)).toBe(c.f); } else expect(d.kind).toBe('undefined');
    expect(q(sub(F.at(X).kind === 'value' ? (F.at(X) as { exact: Rational }).exact : rational(0n), frac(c.F)))).toBe('0');
  });
});
