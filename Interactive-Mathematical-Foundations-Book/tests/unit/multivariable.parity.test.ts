import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rational, type Rational } from '../../src/math/quantity/rational';
import { classify, dot2, eval2, gradient, hessian, hessianEigen } from '../../src/math/calculus/bivariate';
import { localLinear } from '../../src/math/calculus/jacobian';
import { MAPS, SURFACES } from '../../src/math/calculus/surfaces';

const fixture = JSON.parse(readFileSync('fixtures/multivariable.fixtures.json', 'utf8'));
const frac = (t: string): Rational => { if (t.includes('.')) { const [i, f] = t.split('.'); return rational(BigInt(i! + f!), 10n ** BigInt(f!.length)); } const [n, d = '1'] = t.split('/'); return rational(BigInt(n!), BigInt(d)); };
const q = (r: Rational) => (r.den === 1n ? `${r.num}` : `${r.num}/${r.den}`);
const DIRS: readonly (readonly [Rational, Rational])[] = [[rational(3n, 5n), rational(4n, 5n)], [rational(-4n, 5n), rational(3n, 5n)], [rational(1n), rational(0n)], [rational(0n), rational(-1n)]];
let worstEigen = 0;
describe('III.7/III.8/III.11 surfaces against exact interpolated secants', () => {
  for (const [i, c] of fixture.surfaces.entries()) it(`${i}: ${c.surface} at (${c.x}, ${c.y})`, () => {
    const f = SURFACES[c.surface]!.f, x = frac(c.x), y = frac(c.y), g = gradient(f, x, y), h = hessian(f, x, y);
    expect([q(eval2(f, x, y)), q(g[0]), q(g[1])]).toEqual([c.f, c.fx, c.fy]);
    expect([q(h.fxx), q(h.fxy), q(h.fyx), q(h.fyy)]).toEqual([c.fxx, c.fxy, c.fyx, c.fyy]);
    expect(classify(f, x, y).kind).toBe(c.class);
    expect(DIRS.map(u => q(dot2(g, u)))).toEqual(c.directional);   // ∇f·u equals the limit along u, exactly
    const e = hessianEigen(h);
    for (const [k, v] of e.values.entries()) { const err = Math.abs(v - c.eigenvalues[k]) / (Number.EPSILON * Math.max(1, Math.abs(c.eigenvalues[0]), Math.abs(c.eigenvalues[1]))); worstEigen = Math.max(worstEigen, err); expect(err).toBeLessThanOrEqual(8); }
  });
  it('reports the worst eigenvalue disagreement', () => { console.info(`worst Hessian eigenvalue error: ${worstEigen.toFixed(2)} scaled ulps`); expect(worstEigen).toBeLessThanOrEqual(8); });
});
describe('III.9 Jacobians, predictions and independent evaluations', () => {
  for (const [i, c] of fixture.maps.entries()) it(`${i}: ${c.map} at (${c.x}, ${c.y}) δ=(${c.dx}, ${c.dy})`, () => {
    const L = localLinear(MAPS[c.map]!, frac(c.x), frac(c.y), frac(c.dx), frac(c.dy));
    expect(L.J.map(r => r.map(q))).toEqual(c.J);
    expect([L.Fp.map(q), L.Fq.map(q), L.predicted.map(q), q(L.errorSquared)]).toEqual([c.Fp, c.Fq, c.predicted, c.errorSquared]);
    expect(L.det ? q(L.det) : null).toBe(c.det);
  });
});
