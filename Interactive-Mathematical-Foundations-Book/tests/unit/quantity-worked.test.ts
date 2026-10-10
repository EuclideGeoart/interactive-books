/** The working behind an exact root (factorisation, taken-out powers, cancelled factor) arrives at exactly what `rootOf` returns. */
import { describe, expect, it } from 'vitest';
import { parseDecimal, rational, type Rational } from '../../src/math/quantity/rational';
import { rootOf } from '../../src/math/quantity/root';
import { DISPLAY_LIMIT, factorise, radicalWork, workedResult } from '../../src/math/quantity/worked';

const dec = (t: string): Rational => parseDecimal(t)!;
const show = (f: readonly { p: bigint; e: number }[] | null) => f!.map(x => `${x.p}^${x.e}`).join('·');

describe('factorise', () => {
  it('literals', () => {
    expect(factorise(1n)).toEqual([]);
    expect(show(factorise(72n))).toBe('2^3·3^2');
    expect(show(factorise(360n))).toBe('2^3·3^2·5^1');
    expect(show(factorise(97n))).toBe('97^1');
    expect(show(factorise(1009n * 10007n))).toBe('1009^1·10007^1');
    expect(show(factorise(2n ** 20n))).toBe('2^20');
  });
  it('refuses radicands beyond the display limit and N < 1', () => {
    expect(factorise(DISPLAY_LIMIT)).toBeNull();
    expect(() => factorise(0n)).toThrow(RangeError);
  });
  it('the factors multiply back, for every N up to 3000, and are increasing primes', () => {
    for (let n = 1n; n <= 3000n; n++) {
      const f = factorise(n)!;
      expect(f.reduce((acc, x) => acc * x.p ** BigInt(x.e), 1n)).toBe(n);
      for (let i = 1; i < f.length; i++) expect(f[i]!.p > f[i - 1]!.p).toBe(true);
      for (const { p } of f) for (let d = 2n; d * d <= p; d++) expect(p % d).not.toBe(0n);
    }
  });
});

describe('radicalWork', () => {
  it('√72: 72 = 2³·3², s = 6, b = 2, nothing to cancel', () => {
    const w = radicalWork(rational(72n), 2)!;
    expect([w.p, w.q, w.N, w.s, w.b, w.g]).toEqual([72n, 1n, 72n, 6n, 2n, 1n]);
    expect(workedResult(w)).toEqual({ a: 6n, b: 2n, c: 1n });
  });
  it('√(8/9): N = 72, then 6√2/9 cancels to 2√2/3 (g = 3)', () => {
    const w = radicalWork(rational(8n, 9n), 2)!;
    expect([w.p, w.q, w.N, w.s, w.b, w.g]).toEqual([8n, 9n, 72n, 6n, 2n, 3n]);
    expect(workedResult(w)).toEqual({ a: 2n, b: 2n, c: 3n });
  });
  it('2.25 = 9/4: N = 36, s = 6, b = 1, g = 2 → 3/2', () => {
    const w = radicalWork(dec('2.25'), 2)!;
    expect([w.p, w.q, w.N, w.s, w.b, w.g]).toEqual([9n, 4n, 36n, 6n, 1n, 2n]);
    expect(workedResult(w)).toEqual({ a: 3n, b: 1n, c: 2n });
  });
  it('∛(−54): the sign is set aside; 54 = 2·3³ gives −3∛2', () => {
    const w = radicalWork(rational(-54n), 3)!;
    expect(w.negative).toBe(true);
    expect(show(w.factors)).toBe('2^1·3^3');
    expect(workedResult(w)).toEqual({ a: -3n, b: 2n, c: 1n });
  });
  it('∛(1/4): N = 1·4² = 16 = 2³·2 → 2∛2/4 → ∛2/2', () => {
    const w = radicalWork(rational(1n, 4n), 3)!;
    expect(w.N).toBe(16n);
    expect([w.s, w.b, w.g]).toEqual([2n, 2n, 2n]);
    expect(workedResult(w)).toEqual({ a: 1n, b: 2n, c: 2n });
  });
  it('has no working for zero or an even root of a negative number', () => {
    expect(radicalWork(rational(0n), 2)).toBeNull();
    expect(radicalWork(rational(-4n), 2)).toBeNull();
    expect(radicalWork(rational(-4n), 4)).toBeNull();
  });
  it('beyond the display limit the factorisation is absent, honestly', () => {
    const w = radicalWork(rational(10n ** 13n + 1n), 2)!;
    expect(w.factors).toBeNull();
    expect(workedResult(w)).toBeNull();
  });
  it('sweep: wherever the working exists it arrives at exactly rootOf (n = 2…5, A = ±k/d)', () => {
    let checked = 0;
    for (let n = 2; n <= 5; n++) {
      for (let k = -60; k <= 60; k++) {
        for (const d of [1n, 2n, 3n, 4n, 6n, 9n, 10n, 12n]) {
          const A = rational(BigInt(k), d);
          const res = rootOf(A, n);
          const w = radicalWork(A, n);
          if (res.kind !== 'exact' || A.num === 0n) { expect(w === null || res.kind !== 'exact').toBe(true); continue; }
          const got = workedResult(w!)!;
          expect([got.a, got.b, got.c]).toEqual([res.root.a, res.root.b, res.root.c]);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});
