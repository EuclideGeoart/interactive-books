/**
 * I.1 domain model: exact rationals, n-th roots in radical form, integer powers and their rules, units as exponent vectors, and the
 * square ⇄ root relationship. Hand-worked values first, then seeded properties (never unseeded randomness).
 */
import { describe, expect, it } from 'vitest';
import { AREA, DIMENSIONLESS, LENGTH, MASS, SPEED, TIME, applyOp, combine, dimVectorText, kindOf, powerOf, squareRootOf, unitSpoken, unitTex, unitText, type Dim, type Quantity } from '../../src/math/quantity/dimension';
import { rationalForm, rootForm } from '../../src/math/quantity/exactform';
import { EXPONENT_MAX, EXPONENT_MIN, derivePowers } from '../../src/math/quantity/powers';
import { abs, add, cmp, decimalText, div, eq, fromDecimal, iroot, isqrt, mul, neg, parseDecimal, power, rational, sub, terminatingDecimals, toNumber } from '../../src/math/quantity/rational';
import { approxRoot, isNthRootOf, maxRadicand, rootOf, rootPower, splitPower, type ExactRoot } from '../../src/math/quantity/root';
import { deriveSquare } from '../../src/math/quantity/square';

/** Deterministic generator (splitmix-style, 32-bit): the same sequence on every machine. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return (lo: number, hi: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return lo + (s % (hi - lo + 1));
  };
}
const q = (n: number, d = 1) => rational(BigInt(n), BigInt(d));
const dec = (text: string) => parseDecimal(text)!;
const q2 = (value: number): Quantity => ({ value: dec(String(value)), dim: DIMENSIONLESS });
const quantity = (value: string, dim: Dim): Quantity => ({ value: dec(value), dim });
const shape = (r: ExactRoot) => `${r.a}|${r.b}|${r.c}`;

describe('rational arithmetic is exact', () => {
  it('normalises to lowest terms with a positive denominator', () => {
    expect(rational(6n, -8n)).toEqual({ num: -3n, den: 4n });
    expect(rational(0n, -5n)).toEqual({ num: 0n, den: 1n });
    expect(() => rational(1n, 0n)).toThrow(RangeError);
  });
  it('0.1 × 0.1 is exactly 1/100 (the double 0.1 * 0.1 is 0.010000000000000002)', () => {
    const tenth = fromDecimal(0.1, 6)!;
    expect(mul(tenth, tenth)).toEqual(q(1, 100));
    expect(decimalText(mul(tenth, tenth))).toBe('0.01');
    expect(0.1 * 0.1).not.toBe(0.01);
  });
  it('0.1 + 0.2 is exactly 0.3', () => {
    expect(add(fromDecimal(0.1, 6)!, fromDecimal(0.2, 6)!)).toEqual(fromDecimal(0.3, 6));
  });
  it('reads the decimal string, not the binary expansion; refuses finer detail than the contract', () => {
    expect(fromDecimal(2.3, 2)).toEqual(q(23, 10));
    expect(fromDecimal(-0.07, 2)).toEqual(q(-7, 100));
    expect(fromDecimal(0.123, 2)).toBeNull();
    expect(fromDecimal(1e-7, 6)).toBeNull();
    expect(fromDecimal(Number.NaN, 2)).toBeNull();
    expect(fromDecimal(Number.POSITIVE_INFINITY, 2)).toBeNull();
    expect(fromDecimal(-0, 2)).toEqual(q(0));
  });
  it('parseDecimal accepts plain decimals (and U+2212) and nothing else', () => {
    expect(parseDecimal('−2.5')).toEqual(q(-5, 2));
    expect(parseDecimal('.5')).toEqual(q(1, 2));
    expect(parseDecimal('7.')).toEqual(q(7));
    for (const bad of ['', '.', '1e3', '1/2', '1 2', 'abc', '--1']) expect(parseDecimal(bad)).toBeNull();
  });
  it('terminating decimals are detected from the denominator (2^a 5^b), and printed exactly', () => {
    expect(terminatingDecimals(q(1, 8))).toBe(3);
    expect(terminatingDecimals(q(3, 20))).toBe(2);
    expect(terminatingDecimals(q(1, 3))).toBeNull();
    expect(terminatingDecimals(q(100, 9))).toBeNull();
    expect(decimalText(q(3, 8))).toBe('0.375');
    expect(decimalText(q(-5, 2))).toBe('-2.5');
    expect(decimalText(q(7))).toBe('7');
    expect(decimalText(q(1, 1000000))).toBe('0.000001');
    expect(decimalText(q(1, 3))).toBeNull();
  });
  it('toNumber rounds once, from the exact value', () => {
    expect(toNumber(q(1, 3))).toBe(1 / 3);
    expect(toNumber(q(1, 10))).toBe(0.1);
    expect(toNumber(q(-22, 7))).toBe(-22 / 7);
    expect(toNumber(rational(10n ** 30n + 1n, 10n ** 30n))).toBe(1);
  });
  it('isqrt and iroot are floors of the real roots', () => {
    for (const [n, r] of [[0n, 0n], [1n, 1n], [3n, 1n], [4n, 2n], [15n, 3n], [16n, 4n], [10n ** 30n, 10n ** 15n], [10n ** 30n - 1n, 10n ** 15n - 1n]] as const) expect(isqrt(n)).toBe(r);
    for (const [n, k, r] of [[26n, 3, 2n], [27n, 3, 3n], [1023n, 5, 3n], [1024n, 5, 4n], [10n ** 30n, 5, 10n ** 6n]] as const) expect(iroot(n, k)).toBe(r);
    expect(() => isqrt(-1n)).toThrow();
  });
  it('seeded: field laws hold exactly (a + b − b = a, a·b/b = a, ordering is a total order)', () => {
    const r = lcg(7);
    for (let i = 0; i < 300; i++) {
      const a = q(r(-60, 60), r(1, 40));
      const b = q(r(-60, 60) || 1, r(1, 40));
      expect(eq(sub(add(a, b), b), a)).toBe(true);
      expect(eq(div(mul(a, b), b), a)).toBe(true);
      expect(cmp(a, b)).toBe(-cmp(b, a));
      expect(eq(abs(neg(a)), abs(a))).toBe(true);
    }
  });
});

describe('integer powers', () => {
  it('hand-worked values', () => {
    expect(power(q(2), -3)).toEqual({ kind: 'value', value: q(1, 8) });
    expect(power(q(-2), 3)).toEqual({ kind: 'value', value: q(-8) });
    expect(power(q(-2), 6)).toEqual({ kind: 'value', value: q(64) });
    expect(power(dec('0.1'), 2)).toEqual({ kind: 'value', value: q(1, 100) });
    expect(power(dec('-1.5'), -2)).toEqual({ kind: 'value', value: q(4, 9) });
    expect(power(q(5), 0)).toEqual({ kind: 'value', value: q(1) });
    expect(power(q(0), 3)).toEqual({ kind: 'value', value: q(0) });
  });
  it('0⁰ and 0 to a negative power are undefined, each with its reason', () => {
    const zeroZero = power(q(0), 0);
    expect(zeroZero.kind).toBe('undefined');
    if (zeroZero.kind === 'undefined') expect(zeroZero.reason).toContain('0⁰');
    const neg2 = power(q(0), -2);
    expect(neg2.kind).toBe('undefined');
    if (neg2.kind === 'undefined') expect(neg2.reason).toContain('divides by zero');
  });
  it('a negative base gives a sign that alternates with the exponent', () => {
    const base = dec('-1.5');
    for (let k = EXPONENT_MIN; k <= EXPONENT_MAX; k++) {
      const p = power(base, k);
      expect(p.kind).toBe('value');
      if (p.kind === 'value') expect(p.value.num < 0n).toBe(Math.abs(k) % 2 === 1);
    }
  });
});

describe('the rules of powers: computed on both sides, exactly', () => {
  it('whenever a rule applies, both sides are equal — every base with one decimal in [−5, 5], every pair of exponents (including base 0)', () => {
    let applied = 0;
    let skipped = 0;
    for (let tenths = -50; tenths <= 50; tenths++) {
      const base = q(tenths, 10);
      for (let m = EXPONENT_MIN; m <= EXPONENT_MAX; m++) for (let n = EXPONENT_MIN; n <= EXPONENT_MAX; n++) {
        for (const rule of derivePowers(base, m, n).rules) {
          if (rule.applies) { applied++; expect(rule.equal, `${tenths / 10}^(${m},${n}) ${rule.id}`).toBe(true); } else { skipped++; expect(tenths, `${rule.id} should only be skipped for base 0`).toBe(0); expect(rule.note).toBeTruthy(); }
        }
      }
    }
    expect(applied).toBeGreaterThan(40000);
    expect(skipped).toBeGreaterThan(0);
  });
  it('hand-worked: 2² · 2³ = 2⁵ = 32 and (2²)³ = 2⁶ = 64', () => {
    const d = derivePowers(q(2), 2, 3);
    const [product, pop] = d.rules;
    expect(product!.left).toEqual({ kind: 'value', value: q(32) });
    expect(product!.right).toEqual({ kind: 'value', value: q(32) });
    expect(pop!.left).toEqual({ kind: 'value', value: q(64) });
    expect(pop!.right).toEqual({ kind: 'value', value: q(64) });
  });
  it('for base 0 the rules stop making claims where a power is undefined: (0⁻¹)⁻¹ has no value although 0¹ = 0', () => {
    const d = derivePowers(q(0), -1, -1);
    const pop = d.rules.find(r => r.id === 'power-of-power')!;
    expect(pop.left.kind).toBe('undefined');
    expect(pop.right).toEqual({ kind: 'value', value: q(0) });
    expect(pop.applies).toBe(false);
    const product = derivePowers(q(0), 2, 3).rules.find(r => r.id === 'product')!;
    expect(product.applies).toBe(true);
    expect(product.equal).toBe(true);
  });
  it('the ladder lists every exponent from −3 to 6', () => {
    expect(derivePowers(q(2), 0, 0).ladder.map(l => l.k)).toEqual([-3, -2, -1, 0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('exact n-th roots', () => {
  const cases: [string, number, string][] = [
    ['12', 2, '2|3|1'], ['72', 2, '6|2|1'], ['8/9', 2, '2|2|3'], ['1/4', 2, '1|1|2'], ['1/2', 2, '1|2|2'], ['13', 2, '1|13|1'], ['0', 2, '0|1|1'], ['2.25', 2, '3|1|2'],
    ['0.01', 2, '1|1|10'], ['0.08', 2, '1|2|5'], ['143.99', 2, '11|119|10'], ['9', 2, '3|1|1'], ['1', 2, '1|1|1'], ['2', 2, '1|2|1'],
    ['-8', 3, '-2|1|1'], ['24', 3, '2|3|1'], ['1/8', 3, '1|1|2'], ['27/8', 3, '3|1|2'], ['-24', 3, '-2|3|1'], ['16', 3, '2|2|1'],
    ['16', 4, '2|1|1'], ['48', 4, '2|3|1'], ['32', 5, '2|1|1'], ['-32', 5, '-2|1|1'], ['64', 3, '4|1|1'], ['1/2', 3, '1|4|2'],
  ];
  for (const [text, n, expected] of cases) {
    it(`${n === 2 ? '√' : `ⁿ√`.replace('ⁿ', String(n))}(${text}) = ${expected}`, () => {
      const A = text.includes('/') ? q(Number(text.split('/')[0]), Number(text.split('/')[1])) : dec(text);
      const res = rootOf(A, n);
      expect(res.kind).toBe('exact');
      if (res.kind === 'exact') {
        expect(shape(res.root)).toBe(expected);
        expect(isNthRootOf(res.root, A)).toBe(true);
        expect(res.approx).toBeCloseTo(approxRoot(A, n), 12);
      }
    });
  }
  it('an even root of a negative number does not exist in the reals; an odd root does', () => {
    for (const n of [2, 4]) {
      const res = rootOf(q(-4), n);
      expect(res.kind).toBe('undefined');
      if (res.kind === 'undefined') expect(res.reason.length).toBeGreaterThan(30);
    }
    for (const n of [3, 5]) expect(rootOf(q(-1), n).kind).toBe('exact');
  });
  it('a radical is irrational exactly when its radicand b exceeds 1', () => {
    expect((rootOf(q(13), 2) as { root: ExactRoot }).root.b).toBe(13n);
    expect((rootOf(q(16), 2) as { root: ExactRoot }).root.b).toBe(1n);
  });
  it('√(q²) = |q| for every q with at most two decimals in [−12, 12] — including the huge denominators of q²', () => {
    for (let h = -1200; h <= 1200; h++) {
      const x = q(h, 100);
      const res = rootOf(mul(x, x), 2);
      expect(res.kind).toBe('exact');
      if (res.kind === 'exact') expect(eq(rational(res.root.a, res.root.c), abs(x)) && res.root.b === 1n, `h=${h}`).toBe(true);
    }
  });
  it('seeded: the radical form squares back to A exactly, b is n-th-power-free, a/c is in lowest terms and the double matches', () => {
    const r = lcg(2026);
    for (let i = 0; i < 400; i++) {
      const n = r(2, 5);
      const A = q(r(0, 400000), r(1, 1000));
      const res = rootOf(A, n);
      if (res.kind !== 'exact') { expect(A.num).toBeLessThan(0n); continue; }
      const { root } = res;
      expect(eq(rootPower(root), A)).toBe(true);
      for (let p = 2n; p <= 400n; p++) expect(root.b % (p ** BigInt(n)), `b=${root.b} n=${n}`).not.toBe(0n);
      expect(root.c > 0n).toBe(true);
      const g = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : g(b, a % b));
      expect(g(root.a, root.c)).toBe(1n);
      expect(Math.abs(res.approx - (Number(root.a) / Number(root.c)) * Math.pow(Number(root.b), 1 / n)) <= 1e-9 * Math.max(1, Math.abs(res.approx))).toBe(true);
    }
  });
  it('a negative radicand with an odd index is the negative of the root of its absolute value', () => {
    const r = lcg(11);
    for (let i = 0; i < 100; i++) {
      const n = [3, 5][r(0, 1)]!;
      const A = q(r(1, 5000), r(1, 100));
      const pos = rootOf(A, n);
      const negRes = rootOf(neg(A), n);
      expect(pos.kind === 'exact' && negRes.kind === 'exact').toBe(true);
      if (pos.kind === 'exact' && negRes.kind === 'exact') expect(negRes.root).toEqual({ ...pos.root, a: -pos.root.a });
    }
  });
  it('splitPower: N = s^n · b, and refuses a radicand beyond the guarded range instead of guessing', () => {
    expect(splitPower(72n, 2)).toEqual({ s: 6n, b: 2n });
    expect(splitPower(1439900n, 2)).toEqual({ s: 110n, b: 119n });
    expect(splitPower(54n, 3)).toEqual({ s: 3n, b: 2n });
    expect(splitPower(maxRadicand(2), 2)).toBeNull();
    // a leftover square of a prime above the trial limit is still found
    const bigPrime = 1000003n;
    expect(splitPower(bigPrime * bigPrime * 2n, 2)).toEqual({ s: bigPrime, b: 2n });
    expect(() => splitPower(0n, 2)).toThrow();
    const res = rootOf(rational(maxRadicand(2) + 1n, 1n), 2);
    expect(res.kind).toBe('numeric');
  });
  it('the double for an odd root of a negative number is the real root (JS Math.pow(−8, 1/3) is NaN; the model is not)', () => {
    expect(Math.pow(-8, 1 / 3)).toBeNaN();
    expect(approxRoot(q(-8), 3)).toBe(-2);
    expect(approxRoot(q(-32), 5)).toBeCloseTo(-2, 14);
    expect(approxRoot(q(-1), 2)).toBeNaN(); // callers never ask: rootOf reports undefined first
  });
});

describe('exact forms are written correctly', () => {
  it('rationals', () => {
    expect(rationalForm(q(7))).toMatchObject({ text: '7', tex: '7', integer: true });
    expect(rationalForm(q(1, 100))).toMatchObject({ text: '0.01', tex: '0.01', integer: true, irrational: false });
    expect(rationalForm(q(-5, 2))).toMatchObject({ text: '−2.5', tex: '-2.5' });
    expect(rationalForm(q(100, 9))).toMatchObject({ text: '100/9', tex: '\\frac{100}{9}', integer: false, irrational: true });
    expect(rationalForm(q(-1, 3)).tex).toBe('-\\frac{1}{3}');
  });
  it('radicals', () => {
    const f = (a: number, b: number, c: number, index = 2) => rootForm({ index, a: BigInt(a), b: BigInt(b), c: BigInt(c) });
    expect(f(2, 3, 1)).toMatchObject({ text: '2√3', tex: '2\\sqrt{3}' });
    expect(f(1, 13, 1)).toMatchObject({ text: '√13', tex: '\\sqrt{13}' });
    expect(f(2, 2, 3)).toMatchObject({ text: '2√2/3', tex: '\\frac{2\\sqrt{2}}{3}' });
    expect(f(1, 2, 2)).toMatchObject({ text: '√2/2', tex: '\\frac{\\sqrt{2}}{2}' });
    expect(f(-2, 3, 1, 3)).toMatchObject({ text: '−2³√3', tex: '-2\\sqrt[3]{3}' });
    expect(f(3, 1, 2)).toMatchObject({ text: '1.5', integer: true });
    expect(f(2, 3, 1).spoken).toBe('2 times the square root of 3');
  });
});

describe('the square ⇄ root relationship (the hero)', () => {
  const side = (v: number) => deriveSquare({ mode: 'side', side: v, area: 2, unit: 'none' });
  const area = (v: number, unit: 'none' | 'm' = 'none') => deriveSquare({ mode: 'area', side: 3, area: v, unit });
  it('the square of a negative side is positive, and the root brings back |q|, not q', () => {
    const d = side(-3);
    expect(d.mode === 'side' && d.square).toEqual(q(9));
    if (d.mode === 'side') {
      expect(d.signLost).toBe(true);
      expect(d.rootOfSquare.kind === 'exact' && shape(d.rootOfSquare.root)).toBe('3|1|1');
      expect(d.abs).toEqual(q(3));
    }
    const p = side(3);
    if (p.mode === 'side') expect(p.signLost).toBe(false);
  });
  it('0.1² = 0.01 exactly and √0.01 = 0.1 exactly', () => {
    const d = side(0.1);
    if (d.mode !== 'side') throw new Error('mode');
    expect(d.square).toEqual(q(1, 100));
    expect(d.rootOfSquare.kind === 'exact' && shape(d.rootOfSquare.root)).toBe('1|1|10');
  });
  it('area → side: exact radicals, the round trip (√A)² = A holds exactly, and ±√A are the two solutions of x² = A', () => {
    for (const [a, expected, solutions] of [[2, '1|2|1', 2], [12, '2|3|1', 2], [0.25, '1|1|2', 2], [0.5, '1|2|2', 2], [0, '0|1|1', 1]] as const) {
      const d = area(a);
      if (d.mode !== 'area' || d.root.kind !== 'exact') throw new Error('expected exact');
      expect(shape(d.root.root)).toBe(expected);
      expect(d.roundTrip).toBe(true);
      expect(d.solutions).toBe(solutions);
    }
  });
  it('a negative area has no real root: undefined with a reason, no NaN, zero solutions', () => {
    const d = area(-4);
    if (d.mode !== 'area') throw new Error('mode');
    expect(d.root.kind).toBe('undefined');
    expect(d.solutions).toBe(0);
    expect(d.squareOfRoot).toBeNull();
    expect(d.roundTrip).toBe(false);
  });
  it('units: a side in metres has an area in square metres, and the root of that area is back in metres', () => {
    const d = area(9, 'm');
    expect(d.sideDim).toEqual(LENGTH);
    expect(d.areaDim).toEqual(AREA);
  });
  it('rejects a value finer than two decimals (a bug in the caller, not silent rounding)', () => {
    expect(() => side(0.123)).toThrow(RangeError);
  });
  it('seeded: for every side with ≤ 2 decimals the round trip is |q|, and for every area ≥ 0 the round trip is the identity', () => {
    const r = lcg(99);
    for (let i = 0; i < 300; i++) {
      const s = r(-600, 600) / 100;
      const d = side(s);
      if (d.mode !== 'side' || d.rootOfSquare.kind !== 'exact') throw new Error('x');
      expect(eq(rational(d.rootOfSquare.root.a, d.rootOfSquare.root.c), d.abs)).toBe(true);
      const a = deriveSquare({ mode: 'area', side: 0, area: r(0, 3600) / 100, unit: 'none' });
      if (a.mode === 'area') expect(a.roundTrip).toBe(true);
    }
  });
});

describe('units are exponent vectors', () => {
  const m = (v: string) => quantity(v, LENGTH);
  const s = (v: string) => quantity(v, TIME);
  const m2 = (v: string) => quantity(v, AREA);
  const value = (o: ReturnType<typeof combine>) => (o.ok && o.result.value.kind === 'rational' ? o.result.value.r : null);

  it('names: m, m², m/s, kg·m/s², 1/s, 1/(kg·s), and nothing for a ratio', () => {
    expect(unitText(LENGTH)).toBe('m');
    expect(unitText(AREA)).toBe('m²');
    expect(unitText(SPEED)).toBe('m/s');
    expect(unitText([1, -2, 1])).toBe('kg·m/s²');
    expect(unitText([0, -1, 0])).toBe('1/s');
    expect(unitText([0, -1, -1])).toBe('1/(kg·s)');
    expect(unitText([1, 1, 0])).toBe('m·s');
    expect(unitText(DIMENSIONLESS)).toBe('');
    expect(unitTex(SPEED)).toBe('\\mathrm{m}/\\mathrm{s}');
    expect(unitTex([1, -2, 1])).toBe('\\mathrm{kg}\\cdot \\mathrm{m}/\\mathrm{s}^{2}');
    expect(unitSpoken(AREA)).toBe('square metres');
    expect(unitSpoken(SPEED)).toBe('metres per second');
    expect(kindOf(AREA)).toBe('an area');
    expect(dimVectorText([1, -1, 0])).toBe('(L, T, M) = (1, −1, 0)');
    expect(unitText(MASS)).toBe('kg');
  });
  it('add / subtract: identical dimensions carry over unchanged; different ones are rejected with the reason', () => {
    expect(value(combine('add', m('3'), m('2')))).toEqual(q(5));
    expect(value(combine('subtract', m('3'), m('5')))).toEqual(q(-2));
    const bad = combine('add', m('3'), m2('4'));
    expect(bad.ok).toBe(false);
    if (!bad.ok) { expect(bad.reason).toContain('m + m² has no meaning'); expect(bad.reason).toContain('a length'); expect(bad.reason).toContain('an area'); }
    const bad2 = combine('subtract', m('3'), s('1'));
    expect(!bad2.ok && bad2.reason).toContain('m − s has no meaning');
    const plain = combine('add', q2(3), m('2'));
    expect(!plain.ok && plain.reason).toContain('a plain number + m has no meaning');
  });
  it('multiply adds exponents; divide subtracts them; m ÷ m is dimensionless', () => {
    const area = combine('multiply', m('3'), m('3'));
    expect(area.ok && area.result.dim).toEqual(AREA);
    expect(value(area)).toEqual(q(9));
    const speed = combine('divide', m('10'), s('4'));
    expect(speed.ok && speed.result.dim).toEqual(SPEED);
    expect(value(speed)).toEqual(q(5, 2));
    const ratio = combine('divide', m('6'), m('3'));
    expect(ratio.ok && ratio.result.dim).toEqual(DIMENSIONLESS);
    expect(value(ratio)).toEqual(q(2));
    const force = combine('multiply', quantity('2', MASS), quantity('3', [1, -2, 0]));
    expect(force.ok && force.result.dim).toEqual([1, -2, 1]);
  });
  it('dividing by a zero quantity is undefined', () => {
    const r = combine('divide', m('3'), m('0'));
    expect(r.ok).toBe(false);
  });
  it('powers scale the vector; the exact value follows power()', () => {
    const cube = powerOf(m('2'), 3);
    expect(cube.ok && cube.result.dim).toEqual([3, 0, 0]);
    expect(value(cube as ReturnType<typeof combine>)).toEqual(q(8));
    const inv = powerOf(m('2'), -1);
    expect(inv.ok && inv.result.dim).toEqual([-1, 0, 0]);
    expect(powerOf(m('0'), 0).ok).toBe(false);
  });
  it('√(9 m²) = 3 m; √(2 m²) = √2 m; √(9 m) is not a quantity of this model; √(−4 m²) does not exist', () => {
    const ok = squareRootOf(m2('9'));
    expect(ok.ok && ok.result.dim).toEqual(LENGTH);
    expect(value(ok as ReturnType<typeof combine>)).toEqual(q(3));
    const irr = squareRootOf(m2('2'));
    expect(irr.ok && irr.result.value.kind).toBe('root');
    const bad = squareRootOf(m('9'));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toContain('not a quantity of this model');
    const neg = squareRootOf(m2('-4'));
    expect(!neg.ok && neg.reason).toContain('negative');
    expect(squareRootOf(quantity('16', [4, -2, 0])).ok).toBe(true);
    expect(squareRootOf(quantity('16', [4, -1, 0])).ok).toBe(false);
  });
  it('applyOp dispatches', () => {
    expect(applyOp('square', m('3'), m('0')).ok).toBe(true);
    expect(applyOp('root', m2('4'), m('0')).ok).toBe(true);
    expect(applyOp('add', m('1'), m('1')).ok).toBe(true);
  });
  it('seeded: (a·b)/b = a with the dimension restored, for random quantities', () => {
    const r = lcg(5);
    for (let i = 0; i < 100; i++) {
      const a = quantity(String(r(1, 90) / 10), [r(-2, 2), r(-2, 2), r(-1, 1)]);
      const b = quantity(String(r(1, 90) / 10), [r(-2, 2), r(-2, 2), r(-1, 1)]);
      const prod = combine('multiply', a, b);
      if (!prod.ok || prod.result.value.kind !== 'rational') throw new Error('x');
      const back = combine('divide', { value: prod.result.value.r, dim: prod.result.dim }, b);
      expect(back.ok && back.result.dim).toEqual(a.dim);
      expect(value(back)).toEqual(a.value);
    }
  });
});
