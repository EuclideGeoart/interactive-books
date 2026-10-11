import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coefficient, deriveAddition, deriveBasis, deriveDot, deriveNorm, deriveProjection, deriveScaling, deriveSpan, normalizeNumeric, vector, type Vector } from '../../src/math/linear-algebra/vectors';
import { type Rational } from '../../src/math/quantity/rational';

const fx = JSON.parse(readFileSync('fixtures/linear-algebra.fixtures.json', 'utf8'));
const str = (r: Rational) => r.den === 1n ? `${r.num}` : `${r.num}/${r.den}`;
const vec = (v: Vector) => [str(v.x), str(v.y)];
let worst = 0;
function near(actual: number, expected: number, floor = 0) {
  const tolerance = Math.max(floor, Math.abs(expected) * 16 * Number.EPSILON, Number.MIN_VALUE * 16);
  const error = Math.abs(actual - expected);
  worst = Math.max(worst, expected === 0 ? 0 : error / (Math.abs(expected) * Number.EPSILON));
  expect(error, `${actual} versus ${expected}, tolerance ${tolerance}`).toBeLessThanOrEqual(tolerance);
}
describe('independent Fraction/elimination/Decimal oracle', () => {
  for (const [i, { input: s, expected: e }] of fx.cases.entries()) {
    it(`case ${i}: all seven model families`, () => {
      const u = vector(s.u[0], s.u[1]), v = vector(s.v[0], s.v[1]);
      const add = deriveAddition(u, v), scale = deriveScaling(v, coefficient(s.k)), norm = deriveNorm(v), dot = deriveDot(u, v), proj = deriveProjection(u, v), span = deriveSpan(u, v, coefficient(s.a), coefficient(s.b)), basis = deriveBasis(u, v, vector(s.p[0], s.p[1]));
      expect(vec(add.sum)).toEqual(e.sum); expect(vec(add.difference)).toEqual(e.difference); expect(vec(scale.scaled)).toEqual(e.scaled);
      expect(str(norm.sq)).toBe(e.normSq); expect(str(norm.l1)).toBe(e.l1); expect(str(norm.linf)).toBe(e.linf);
      if (norm.norm.kind === 'undefined') throw new Error('A norm must be defined');
      near(norm.norm.approx, e.norm);
      if (e.unit) { near(norm.unit!.x, e.unit[0]); near(norm.unit!.y, e.unit[1]); } else expect(norm.unit).toBeNull();
      expect(str(dot.product)).toBe(e.dot); expect(str(span.det)).toBe(e.det); expect(span.rank).toBe(e.rank); expect(vec(span.w)).toEqual(e.combination);
      if (e.angle !== null) { near(dot.angle!.radians, e.angle, 1e-15); near(dot.angle!.cosine, e.cosine, 1e-15); } else expect(dot.angle).toBeNull();
      expect(proj.defined).toBe(e.projection !== null);
      if (proj.defined) {
        expect(str(proj.factor)).toBe(e.projection.factor); expect(vec(proj.projected)).toEqual(e.projection.vector); expect(vec(proj.residual)).toEqual(e.projection.residual); expect(str(proj.residualDot)).toBe('0');
        if (proj.distance.kind === 'undefined') throw new Error('Distance defined');
        near(proj.distance.approx, e.projection.distance); near(proj.signedScalar, e.projection.signed);
      }
      expect(basis.reachable).toBe(e.reachable); expect(basis.unique).toBe(e.coords !== null);
      if (basis.unique) expect([str(basis.a), str(basis.b)]).toEqual(e.coords);
    });
  }
  for (const [i, e] of fx.numeric.entries()) it(`numerical extremes ${i}`, () => {
    const n = normalizeNumeric({ x: e.input[0], y: e.input[1] });
    if (e.unit) { near(n!.x, e.unit[0]); near(n!.y, e.unit[1]); } else expect(n).toBeNull();
  });
  it('records the worst relative error in machine-epsilon units', () => { console.log(`linear algebra parity worst relative epsilon units: ${worst}`); expect(worst).toBeLessThanOrEqual(16); });
});
