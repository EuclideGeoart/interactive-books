import { describe, expect, it } from 'vitest';
import { int, rational } from '../../src/math/quantity/rational';
import { accumulation, exactIntegral, INTEGRANDS, reference, riemann, signedParts, exactIntegrand, type ExactIntegrand } from '../../src/math/calculus/integration';
import { poly } from '../../src/math/calculus/polynomial';

const q = (r: { num: bigint; den: bigint }) => (r.den === 1n ? `${r.num}` : `${r.num}/${r.den}`);
const cubic = INTEGRANDS.cubic as ExactIntegrand;
describe('exact integration model', () => {
  it('orientation: ∫ₐᵇ = −∫ᵦᵃ and ∫ₐᵃ = 0', () => {
    expect(q(exactIntegral(cubic, int(3), int(-2)))).toBe('-25/16');
    expect(q(exactIntegral(cubic, int(1), int(1)))).toBe('0');
    const s = riemann(cubic, int(3), int(-2), 10, 'left'); expect(s.kind === 'value' && q(s.dx)).toBe('-1/2');
  });
  it('signed parts are split at exact roots; irrational roots refuse an inexact split', () => {
    expect(signedParts(cubic, int(-2), int(3))!.area).toEqual(rational(57n, 16n));
    const irr = exactIntegrand('irr', 'x² − 2', [{ lo: null, hi: null, poly: poly(-2, 0, 1) }]);
    expect(signedParts(irr, int(0), int(3))).toBeNull();
  });
  it('every rule converges; trapezoid = mean of left and right', () => {
    for (const n of [1, 3, 7, 16]) {
      const L = riemann(cubic, int(-2), int(3), n, 'left') as { exact: { num: bigint; den: bigint } }, R = riemann(cubic, int(-2), int(3), n, 'right') as typeof L, T = riemann(cubic, int(-2), int(3), n, 'trapezoid') as typeof L;
      expect(T.exact.num * 2n * L.exact.den * R.exact.den).toBe(T.exact.den * (L.exact.num * R.exact.den + R.exact.num * L.exact.den));
    }
  });
  it('an undefined sample point is reported, not fabricated', () => {
    expect(riemann(INTEGRANDS.sqrt!, int(-1), int(1), 4, 'left').kind).toBe('undefined');
    expect(reference(INTEGRANDS.sin!, int(0), int(3)).value).toBeCloseTo(1 - Math.cos(3), 15);
  });
  it('accumulation is continuous, starts at 0 at a, and has a corner exactly at a jump', () => {
    const F = accumulation(INTEGRANDS.step as ExactIntegrand, int(-1));
    expect(F.at(int(-1))).toMatchObject({ value: 0 }); expect(F.at(int(1))).toMatchObject({ value: 2 });
    expect(F.slope(int(1)).kind).toBe('undefined'); expect(F.slope(int(0))).toMatchObject({ kind: 'value', value: 1 });
    const G = accumulation(INTEGRANDS.step as ExactIntegrand, int(2)); expect(G.at(int(0))).toMatchObject({ value: 0 });
  });
});
