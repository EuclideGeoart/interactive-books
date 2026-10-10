/**
 * Function families (I.6): the exact rational type, the comparison model y = a·g(x − h), its curves and its facts.
 * Hand-worked values first; then properties on seeded states; then the "facts" (domain, range, zeros, asymptotes, monotonicity,
 * symmetry) verified against the SAMPLED function, so the data cannot drift from the mathematics.
 */
import { describe, expect, it } from 'vitest';
import { ONE, ZERO, absRat, add, compare, div, equals, exactDecimal, exactSqrt, fromDecimal, isqrt, mul, neg, powInt, rat, rationalForm, sign, sub, toNumber } from '../../src/math/families/rational';
import { CANONICAL_COMPARE, FAMILY_IDS, curveFn, deriveCompare, factsOf, numberOf, powerValue, sampleFamily, valueAt, visibleFamilies, zerosIn, type CompareState, type FamilyId } from '../../src/math/families/families';

// A tiny seeded generator (splitmix32): tests never use unseeded randomness.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
  };
}
const decimal = (rand: () => number, lo: number, hi: number, places = 2) => Number((lo + rand() * (hi - lo)).toFixed(places));

describe('rational numbers', () => {
  it('normalises sign and lowest terms', () => {
    expect(rat(2, -4)).toEqual({ num: -1n, den: 2n });
    expect(rat(0, 7)).toEqual({ num: 0n, den: 1n });
    expect(rat(6, 4)).toEqual({ num: 3n, den: 2n });
    expect(() => rat(1, 0)).toThrow(RangeError);
  });
  it('is exact where doubles are not: 1/10 + 2/10 = 3/10', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(equals(add(exactDecimal(0.1, 2), exactDecimal(0.2, 2)), exactDecimal(0.3, 2))).toBe(true);
    expect(toNumber(sub(exactDecimal(0.3, 2), exactDecimal(0.1, 2)))).toBe(0.2); // 0.3 − 0.1 in doubles is 0.19999999999999998
    expect(0.3 - 0.1).not.toBe(0.2);
  });
  it('converts a decimal exactly and rejects extra precision (never rounds)', () => {
    expect(fromDecimal(0.1, 2)).toEqual({ num: 1n, den: 10n });
    expect(fromDecimal(-2.75, 2)).toEqual({ num: -11n, den: 4n });
    expect(fromDecimal(0.001, 2)).toBeNull();
    expect(fromDecimal(2.345, 2)).toBeNull();
    expect(fromDecimal(Infinity, 2)).toBeNull();
    expect(fromDecimal(NaN, 2)).toBeNull();
    expect(() => exactDecimal(0.123, 2)).toThrow(RangeError);
  });
  it('arithmetic, comparison, powers', () => {
    expect(mul(rat(2, 3), rat(3, 4))).toEqual(rat(1, 2));
    expect(div(rat(1, 2), rat(1, 4))).toEqual(rat(2));
    expect(() => div(ONE, ZERO)).toThrow(RangeError);
    expect(compare(rat(1, 3), rat(1, 2))).toBe(-1);
    expect(sign(neg(rat(5)))).toBe(-1);
    expect(absRat(rat(-3, 7))).toEqual(rat(3, 7));
    expect(powInt(rat(2, 3), 3)).toEqual(rat(8, 27));
    expect(powInt(rat(5), 0)).toEqual(ONE);
  });
  it('integer square root is exact for large numbers', () => {
    expect(isqrt(0n)).toBe(0n);
    expect(isqrt(15n)).toBe(3n);
    expect(isqrt(16n)).toBe(4n);
    expect(isqrt(10n ** 30n)).toBe(10n ** 15n);
    expect(isqrt(10n ** 30n - 1n)).toBe(10n ** 15n - 1n);
    expect(() => isqrt(-1n)).toThrow(RangeError);
  });
  it('the square root of a rational is exact only for perfect squares', () => {
    expect(exactSqrt(rat(9, 4))).toEqual(rat(3, 2));
    expect(exactSqrt(rat(2))).toBeNull();
    expect(exactSqrt(rat(1, 3))).toBeNull();
    expect(exactSqrt(ZERO)).toEqual(ZERO);
    expect(() => exactSqrt(rat(-1))).toThrow(RangeError);
  });
  it('display forms: integers and short decimals are exact lines, other fractions are p/q', () => {
    expect(rationalForm(rat(3))).toMatchObject({ text: '3', integer: true });
    expect(rationalForm(rat(1, 4))).toMatchObject({ text: '0.25', integer: true });
    expect(rationalForm(rat(-7, 2))).toMatchObject({ text: '−3.5', tex: '-3.5', integer: true });
    expect(rationalForm(rat(1, 3))).toMatchObject({ text: '1/3', tex: '\\frac{1}{3}', integer: false, irrational: false });
    expect(rationalForm(rat(-2, 3))).toMatchObject({ text: '−2/3', tex: '-\\frac{2}{3}' });
    expect(rationalForm(rat(1, 1000000))).toMatchObject({ text: '0.000001', integer: true });
    expect(rationalForm(rat(1, 10000000))).toMatchObject({ text: '1/10000000', integer: false });
  });
});

describe('the comparison model y = a·g(x − h)', () => {
  const at = (partial: Partial<CompareState>) => deriveCompare({ ...CANONICAL_COMPARE, ...partial });

  it('canonical state: u = 1; x and x² exact, ln 1 = 0 exactly, e/sin/cos only approximately', () => {
    const d = at({});
    expect(d.u).toEqual(ONE);
    expect(d.visible).toEqual(['exp', 'ln', 'sin']);
    expect(d.values.linear).toEqual({ kind: 'exact', value: ONE });
    expect(d.values.square).toEqual({ kind: 'exact', value: ONE });
    expect(d.values.ln).toEqual({ kind: 'exact', value: ZERO });
    expect(d.values.exp).toEqual({ kind: 'numeric', value: Math.E });
    expect(d.values.sin).toEqual({ kind: 'numeric', value: Math.sin(1) });
    expect(d.values.cos).toEqual({ kind: 'numeric', value: Math.cos(1) });
    expect(Math.sin(1)).toBeCloseTo(0.8414709848078965, 15); // hand-checked constant
    expect(Math.cos(1)).toBeCloseTo(0.5403023058681398, 15);
  });
  it('the shifted input is computed exactly: x = 0.3, h = 0.1 gives u = 1/5, not 0.19999999999999998', () => {
    const d = at({ x: 0.3, h: 0.1 });
    expect(d.u).toEqual(rat(1, 5));
    expect(toNumber(d.u)).toBe(0.2);
    expect(d.values.linear).toEqual({ kind: 'exact', value: rat(1, 5) });
    expect(d.values.square).toEqual({ kind: 'exact', value: rat(1, 25) });
  });
  it('hand-worked: a = 2, h = 1, x = 3 → u = 2: 2u = 4, 2u² = 8, 2·ln 2 ≈ 1.386294, 2·e² ≈ 14.778112', () => {
    const d = at({ a: 2, h: 1, x: 3 });
    expect(d.values.linear).toEqual({ kind: 'exact', value: rat(4) });
    expect(d.values.square).toEqual({ kind: 'exact', value: rat(8) });
    expect(numberOf(d.values.ln)!).toBeCloseTo(1.3862943611198906, 14);
    expect(numberOf(d.values.exp)!).toBeCloseTo(14.7781121978613, 12);
    expect(numberOf(d.values.sin)!).toBeCloseTo(2 * 0.9092974268256817, 14);
    expect(numberOf(d.values.cos)!).toBeCloseTo(2 * -0.4161468365471424, 14);
  });
  it('exact special points: e⁰ and cos 0 give a, sin 0 gives 0, ln 1 gives 0', () => {
    const d = at({ a: -2, h: 1.5, x: 1.5 });
    expect(d.values.exp).toEqual({ kind: 'exact', value: rat(-2) });
    expect(d.values.cos).toEqual({ kind: 'exact', value: rat(-2) });
    expect(d.values.sin).toEqual({ kind: 'exact', value: ZERO });
    expect(d.values.ln.kind).toBe('undefined'); // u = 0 is outside the domain of ln
  });
  it('a = 0 flattens every graph: exact 0 wherever the family is defined, ln still undefined for u ≤ 0', () => {
    const d = at({ a: 0, x: 2, h: 0 });
    for (const id of ['linear', 'square', 'exp', 'ln', 'sin', 'cos'] as const) expect(d.values[id]).toEqual({ kind: 'exact', value: ZERO });
    expect(at({ a: 0, x: -1 }).values.ln.kind).toBe('undefined');
  });
  it('ln is undefined (with a reason, never −∞ or NaN) exactly when x − h ≤ 0, and the domain shifts with h', () => {
    for (const [x, h, defined] of [[1, 0, true], [0, 0, false], [-1, 0, false], [2, 1.5, true], [1.5, 1.5, false], [1.49, 1.5, false], [-3, -3.5, true], [-3.5, -3.5, false]] as const) {
      const v = at({ x, h }).values.ln;
      expect(v.kind !== 'undefined', `x=${x}, h=${h}`).toBe(defined);
      if (v.kind === 'undefined') expect(v.reason).toMatch(/not positive|positive/);
      if (v.kind === 'numeric') expect(Number.isFinite(v.value)).toBe(true);
    }
  });
  it('a value that exceeds the largest double is reported as an overflow, not as a number', () => {
    expect(valueAt('exp', rat(1), rat(710))).toEqual({ kind: 'overflow' });
    expect(valueAt('exp', rat(1), rat(709))).toMatchObject({ kind: 'numeric' });
    expect(numberOf({ kind: 'overflow' })).toBeNull();
  });
  it('visibleFamilies follows the toggles in the fixed family order', () => {
    expect(visibleFamilies({ ...CANONICAL_COMPARE, linear: true, square: true, exp: false, ln: false, sin: false, cos: true })).toEqual(['linear', 'square', 'cos']);
    expect(visibleFamilies({ ...CANONICAL_COMPARE, exp: false, ln: false, sin: false })).toEqual([]);
  });
  it('seeded property: exact families agree with double arithmetic, every finite value is a finite number', () => {
    const rand = rng(61);
    for (let i = 0; i < 400; i++) {
      const s: CompareState = { ...CANONICAL_COMPARE, a: decimal(rand, -3, 3), h: decimal(rand, -4, 4), x: decimal(rand, -6, 6) };
      const d = deriveCompare(s);
      const u = s.x - s.h;
      expect(Number(numberOf(d.values.linear))).toBeCloseTo(s.a * u, 12);
      expect(Number(numberOf(d.values.square))).toBeCloseTo(s.a * u * u, 10);
      for (const id of FAMILY_IDS) {
        const v = d.values[id];
        if (v.kind === 'numeric') expect(Number.isFinite(v.value)).toBe(true);
        expect(v.kind === 'undefined', `${id} at u=${u}`).toBe(id === 'ln' && sign(d.u) <= 0);
      }
    }
  });
  it('the domain of every family but ln is all reals (the value is defined at every sampled x)', () => {
    for (const id of FAMILY_IDS.filter(f => f !== 'ln')) for (const x of [-6, -0.25, 0, 3.5, 6]) expect(curveFn(id, 1, 0)(x)).not.toBeNull();
  });
});

describe('curves', () => {
  const W = { xMin: -7, xMax: 7, yMin: -7, yMax: 7 };
  it('every sample point lies on the function (and ln has no point at or left of its asymptote)', () => {
    for (const id of FAMILY_IDS) for (const [a, h] of [[1, 0], [2, 1], [-1.5, -2], [0.5, 3.5]] as const) {
      const f = curveFn(id, a, h);
      for (const line of sampleFamily(id, a, h, W)) for (const p of line) {
        const y = f(p.x);
        expect(y, `${id} a=${a} h=${h} x=${p.x}`).not.toBeNull();
        const clip = 20 * 14;
        if (Math.abs(y!) < clip) expect(p.y).toBeCloseTo(y!, 9);
        if (id === 'ln') expect(p.x).toBeGreaterThan(h);
      }
    }
  });
  it('ln gets close to its vertical asymptote x = h and the left part is empty', () => {
    for (const h of [-3, 0, 2.5]) {
      const lines = sampleFamily('ln', 1, h, W);
      expect(lines).toHaveLength(1);
      const first = lines[0]![0]!;
      expect(first.x - h).toBeLessThan(1e-6);
      expect(first.x).toBeGreaterThan(h);
      expect(lines[0]!.every(p => p.x > h)).toBe(true);
    }
    expect(sampleFamily('ln', 1, 8, W)).toEqual([]); // the asymptote is to the right of the window: nothing is defined
    expect(sampleFamily('ln', 1, -8, W)[0]![0]!.x).toBe(W.xMin); // the asymptote is to the left: starts at the window edge
  });
  it('sampling depends only on (family, a, h, window): the input x is not a parameter, and the result is deterministic', () => {
    const one = sampleFamily('sin', 1.5, 0.5, W);
    const two = sampleFamily('sin', 1.5, 0.5, W);
    expect(two).toEqual(one);
    expect(sampleFamily.length).toBeLessThanOrEqual(5); // (id, a, h, window, samples?): no x anywhere
  });
  it('a steep branch stays a finite polyline (e^x at a = 3 is clamped, never Infinity)', () => {
    for (const line of sampleFamily('exp', 3, -4, W)) for (const p of line) expect(Number.isFinite(p.y)).toBe(true);
  });
});

describe('powers: x², x³ exact; √x exact only for perfect squares', () => {
  it('values', () => {
    expect(powerValue(2, rat(-3, 2))).toEqual({ kind: 'exact', value: rat(9, 4) });
    expect(powerValue(3, rat(-2))).toEqual({ kind: 'exact', value: rat(-8) });
    expect(powerValue('sqrt', rat(9, 4))).toEqual({ kind: 'exact', value: rat(3, 2) });
    expect(powerValue('sqrt', rat(2))).toEqual({ kind: 'numeric', value: Math.SQRT2 });
    expect(powerValue('sqrt', rat(-1)).kind).toBe('undefined');
    expect(powerValue('sqrt', ZERO)).toEqual({ kind: 'exact', value: ZERO });
  });
});

// ------------------------------------------------------------------------------------------------ facts vs the sampled function
describe('facts are verified against the sampled function', () => {
  const GRID = Array.from({ length: 2001 }, (_, i) => -10 + (20 * i) / 2000);
  const combos: [number, number][] = [[1, 0], [2, 1], [-1.5, -2], [0.5, 3.5], [3, -1], [-1, 2.25]];
  const params = (id: FamilyId, a: number, h: number) => ({ f: curveFn(id, a, h), facts: factsOf(id, exactDecimal(a, 2), exactDecimal(h, 2)), h: exactDecimal(h, 2) });

  it('domain: ln is defined exactly for x > h, the others everywhere', () => {
    for (const id of FAMILY_IDS) for (const [a, h] of combos) {
      const { f, facts } = params(id, a, h);
      expect(facts.domain).toBe(id === 'ln' ? 'u>0' : 'all');
      for (const x of GRID) expect(f(x) !== null, `${id} x=${x}`).toBe(facts.domain === 'all' || x - h > 0);
    }
  });
  it('range: every sampled value is inside the claimed range, and closed bounds are attained', () => {
    for (const id of FAMILY_IDS) for (const [a, h] of combos) {
      const { f, facts } = params(id, a, h);
      const ys = GRID.map(f).filter((y): y is number => y !== null);
      const lo = facts.range.lo === null ? -Infinity : toNumber(facts.range.lo);
      const hi = facts.range.hi === null ? Infinity : toNumber(facts.range.hi);
      for (const y of ys) {
        if (facts.range.loOpen) expect(y).toBeGreaterThan(lo - 1e-12); else expect(y).toBeGreaterThanOrEqual(lo - 1e-12);
        if (facts.range.hiOpen) expect(y).toBeLessThan(hi + 1e-12); else expect(y).toBeLessThanOrEqual(hi + 1e-12);
      }
      if (id === 'sin' || id === 'cos') { expect(Math.max(...ys)).toBeCloseTo(Math.abs(a), 3); expect(Math.min(...ys)).toBeCloseTo(-Math.abs(a), 3); }
      if (id === 'square') expect(Math.min(...ys.map(y => (a > 0 ? y : -y)))).toBeCloseTo(0, 2);
    }
  });
  it('the range is a point {0} when a = 0', () => {
    for (const id of FAMILY_IDS) {
      const facts = factsOf(id, ZERO, ZERO);
      expect(facts.range).toEqual({ lo: ZERO, hi: ZERO, loOpen: false, hiOpen: false });
      expect(facts.zeros.kind).toBe('everywhere');
    }
  });
  it('zeros: f vanishes at each claimed zero, and the sign changes (or touches) nowhere else', () => {
    for (const id of FAMILY_IDS) for (const [a, h] of combos) {
      const { f, facts, h: hRat } = params(id, a, h);
      const claimed = zerosIn(facts, hRat, -10, 10);
      for (const z of claimed) expect(Math.abs(f(z)!), `${id} zero ${z}`).toBeLessThan(1e-12);
      // count sign changes on a fine grid (excluding grid points that are zeros of the touching kind)
      // a grid point may land exactly on a zero: look at consecutive NON-zero samples
      const ys = GRID.map(f).filter((y): y is number => y !== null && Math.abs(y) > 1e-13);
      let changes = 0;
      for (let i = 1; i < ys.length; i++) if (Math.sign(ys[i - 1]!) !== Math.sign(ys[i]!)) changes++;
      const crossing = facts.zeros.kind === 'single' && facts.zeros.touches ? 0 : claimed.length;
      expect(changes, `${id} a=${a} h=${h}`).toBe(crossing);
      if (facts.zeros.kind === 'none') expect(claimed).toEqual([]);
    }
  });
  it('the touching zero of x² is a minimum (or maximum) that the graph does not cross', () => {
    const { facts } = params('square', 2, 1);
    expect(facts.zeros).toMatchObject({ kind: 'single', touches: true });
  });
  it('asymptotes: ln blows up at x = h; e^x approaches 0 on the left', () => {
    for (const [a, h] of combos) {
      const ln = params('ln', a, h);
      expect(ln.facts.asymptote).toMatchObject({ kind: 'vertical' });
      expect(Math.abs(ln.f(h + 1e-12)!)).toBeGreaterThan(10 * Math.abs(a));
      const ex = params('exp', a, h);
      expect(ex.facts.asymptote).toMatchObject({ kind: 'horizontal', side: 'left' });
      expect(Math.abs(ex.f(h - 40)!)).toBeLessThan(1e-15 * Math.abs(a) + 1e-300);
      for (const id of ['linear', 'square', 'sin', 'cos'] as const) expect(params(id, a, h).facts.asymptote.kind).toBe('none');
    }
  });
  it('monotonicity: each listed piece increases or decreases as claimed (sampled differences)', () => {
    for (const id of FAMILY_IDS) for (const [a, h] of combos) {
      const { f, facts } = params(id, a, h);
      for (const piece of facts.pieces) {
        const lo = Math.max(piece.fromU, -9) + 1e-6;
        const hi = Math.min(piece.toU, 9) - 1e-6;
        if (!(hi > lo)) continue;
        const hh = h;
        for (let i = 0; i < 40; i++) {
          const u0 = lo + ((hi - lo) * i) / 40;
          const u1 = lo + ((hi - lo) * (i + 1)) / 40;
          const d = f(hh + u1)! - f(hh + u0)!;
          if (piece.trend === 'increasing') expect(d, `${id} u=${u0}`).toBeGreaterThan(0);
          else if (piece.trend === 'decreasing') expect(d, `${id} u=${u0}`).toBeLessThan(0);
          else expect(d).toBe(0);
        }
      }
    }
  });
  it('symmetry: even about x = h (x², cos), odd about the point (h, 0) (x, sin), none for e^x and ln', () => {
    for (const id of FAMILY_IDS) for (const [a, h] of combos) {
      const { f, facts } = params(id, a, h);
      for (const d of [0.25, 1, 2.5, 3.9]) {
        const p = f(h + d), m = f(h - d);
        if (facts.symmetry.kind === 'even') expect(m!).toBeCloseTo(p!, 12);
        else if (facts.symmetry.kind === 'odd') expect(m!).toBeCloseTo(-p!, 12);
        else if (id === 'exp') expect(Math.abs(m! - p!)).toBeGreaterThan(1e-9);
      }
    }
  });
  it('sin and cos have period 2π: f(x + 2π) = f(x) (to rounding), and no smaller positive shift works', () => {
    for (const id of ['sin', 'cos'] as const) {
      const f = curveFn(id, 1.5, 0.5);
      expect(factsOf(id, rat(3, 2), rat(1, 2)).periodic).toBe(true);
      for (const x of GRID.filter((_, i) => i % 37 === 0)) expect(f(x + 2 * Math.PI)!).toBeCloseTo(f(x)!, 12);
      for (const shift of [Math.PI / 2, Math.PI, 1, 3]) expect(GRID.some(x => Math.abs(f(x + shift)! - f(x)!) > 1e-3)).toBe(true);
    }
    expect(factsOf('exp', ONE, ZERO).periodic).toBe(false);
  });
  it('zerosIn lists sin zeros at h + kπ and cos zeros at h + π/2 + kπ', () => {
    const z = zerosIn(factsOf('sin', ONE, ZERO), ZERO, -7, 7);
    expect(z.map(v => Math.round((v / Math.PI) * 1e9) / 1e9)).toEqual([-2, -1, 0, 1, 2]);
    const c = zerosIn(factsOf('cos', ONE, rat(1)), rat(1), -7, 7);
    for (const v of c) expect(Math.cos(v - 1)).toBeCloseTo(0, 12);
    expect(c.length).toBe(5);
  });
});

describe('a·eᵘ near the edge of the double range', () => {
  const at = (a: number, x: number) => deriveCompare({ ...CANONICAL_COMPARE, a, h: 0, x }).values.exp;
  it('0.01·e^713 is finite (≈ 4.49e+307) although e^713 alone overflows a double: no spurious overflow', () => {
    expect(Math.exp(713)).toBe(Infinity);
    const v = at(0.01, 713);
    expect(v.kind).toBe('numeric');
    expect((v as { value: number }).value / 4.487e307).toBeGreaterThan(0.9);
    expect((v as { value: number }).value / 4.487e307).toBeLessThan(1.1);
  });
  it('3·e^711 really does overflow (≈ 3 × 2e308 > 1.8e308)', () => {
    expect(at(3, 711).kind).toBe('overflow');
  });
  it('1·e^-800 is 0 (underflow) and keeps its sign convention (+0 for a < 0 too)', () => {
    expect(at(1, -800)).toEqual({ kind: 'numeric', value: 0 });
    const neg = at(-1, -800) as { value: number };
    expect(Object.is(neg.value, 0)).toBe(true);
  });
});
