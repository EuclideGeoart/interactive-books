/**
 * Inverse round trips, exponential/logarithm bases, and the checked logarithm identities (I.6).
 * The mathematical claims are hand-worked; the floating-point claims name the threshold (e^x overflows above ≈ 709.78) and use explicit tolerances.
 */
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_GROWTH, NO_LOG_BASE_1, NO_LOG_X, deriveGrowth, exactLog, sampleBase, type GrowthState,
} from '../../src/math/families/growth';
import { CANONICAL_IDENTITY, deriveIdentities } from '../../src/math/families/identities';
import {
  CANONICAL_ROUNDTRIP, EXP_OVERFLOW_ABOVE, EXP_UNDERFLOW_BELOW, ROUNDTRIP_LIMIT, reflectPolylines, roundTrip, undoCurves, type RoundTripState,
} from '../../src/math/families/roundtrip';
import { rationalForm, rat, toNumber } from '../../src/math/families/rational';

const rt = (family: RoundTripState['family'], order: RoundTripState['order'], x: number) => roundTrip({ family, order, x });
const mulberry = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const round2 = (v: number) => Number(v.toFixed(2));

describe('round trip: ln(e^x) — the mathematics always holds', () => {
  it('canonical state is e^x then ln at x = 1.5, which comes back', () => {
    const r = roundTrip(CANONICAL_ROUNDTRIP);
    expect(CANONICAL_ROUNDTRIP).toEqual({ family: 'exp', order: 'forward-first', x: 1.5 });
    expect(r.mathReturns).toBe(true);
    expect(r.returned).toBe(true);
    expect(r.steps[0].output).toEqual({ kind: 'numeric', value: Math.exp(1.5) });
    expect(Math.abs((r.steps[1].output as { value: number }).value - 1.5)).toBeLessThanOrEqual(r.tolerance);
  });
  it('x = 0 is exact: e⁰ = 1 and ln 1 = 0', () => {
    const r = rt('exp', 'forward-first', 0);
    expect(r.steps[0].output).toMatchObject({ kind: 'exact' });
    expect(r.steps[1].output).toMatchObject({ kind: 'exact' });
    expect(r.cause).toBe('ok');
    expect(r.error).toBe(0);
  });
  it('overflow: x = 800 gives ∞ although ln(e^800) = 800 mathematically; cause is overflow, not a mathematical failure', () => {
    for (const x of [710, 750, 800]) {
      const r = rt('exp', 'forward-first', x);
      expect(r.steps[0].output.kind).toBe('overflow');
      expect(r.steps[1].output.kind).toBe('lost');
      expect(r.mathReturns).toBe(true);
      expect(r.returned).toBe(false);
      expect(r.cause).toBe('overflow');
      expect(r.mirror).toBeNull();
    }
  });
  it('the overflow threshold is where Math.exp becomes Infinity: 709.78 is finite, 709.79 is not', () => {
    expect(Number.isFinite(Math.exp(709.78))).toBe(true);
    expect(Math.exp(709.79)).toBe(Infinity);
    expect(EXP_OVERFLOW_ABOVE).toBeGreaterThan(709.78);
    expect(EXP_OVERFLOW_ABOVE).toBeLessThan(709.79);
    expect(rt('exp', 'forward-first', 709.78).cause).not.toBe('overflow');
    expect(rt('exp', 'forward-first', 709.79).cause).toBe('overflow');
  });
  it('underflow: below ≈ −745.13 the value rounds to 0 and ln 0 does not exist', () => {
    expect(Math.exp(-745.14)).toBe(0);
    expect(Math.exp(-745.13)).toBeGreaterThan(0);
    expect(EXP_UNDERFLOW_BELOW).toBeGreaterThan(-745.14);
    expect(EXP_UNDERFLOW_BELOW).toBeLessThan(-745.13);
    for (const x of [-745.14, -780, -800]) {
      const r = rt('exp', 'forward-first', x);
      expect(r.cause).toBe('underflow');
      expect(r.steps[1].output.kind).toBe('undefined');
      expect(r.returned).toBe(false);
      expect(r.mathReturns).toBe(true);
    }
  });
  it('subnormal: e^−740 keeps almost no significant bits, so ln of it is off by ≈ 1% of 1, and the cause says so', () => {
    const r = rt('exp', 'forward-first', -740);
    expect(r.cause).toBe('subnormal');
    expect(r.returned).toBe(false);
    expect(r.error).toBeGreaterThan(1e-3);
  });
  it('just above the normal range (x = −700) the round trip is still within tolerance', () => {
    const r = rt('exp', 'forward-first', -700);
    expect(r.returned).toBe(true);
  });
  it('seeded sweep over the whole normal range: always returns within the stated tolerance', () => {
    const rand = mulberry(7);
    for (let i = 0; i < 2000; i++) {
      const x = round2(-708 + rand() * (709.78 + 708));
      const r = rt('exp', 'forward-first', x);
      expect(r.returned, `x=${x}`).toBe(true);
      expect(r.error!).toBeLessThanOrEqual(r.tolerance);
    }
  });
});

describe('round trip: e^(ln x) — only for x > 0', () => {
  it('x ≤ 0 is a domain failure: the first step is undefined and the second is never reached', () => {
    for (const x of [0, -0.01, -3, -800]) {
      const r = rt('exp', 'inverse-first', x);
      expect(r.cause).toBe('domain');
      expect(r.mathReturns).toBe(false);
      expect(r.returned).toBeNull();
      expect(r.steps[0].output.kind).toBe('undefined');
      expect(r.steps[1].output.kind).toBe('lost');
    }
  });
  it('x = 1 is exact (ln 1 = 0, e⁰ = 1)', () => {
    expect(rt('exp', 'inverse-first', 1).steps.map(s => s.output.kind)).toEqual(['exact', 'exact']);
  });
  it('x > 0 returns within the stated tolerance for the whole control range', () => {
    const rand = mulberry(11);
    for (let i = 0; i < 2000; i++) {
      const x = Math.max(0.01, round2(rand() * ROUNDTRIP_LIMIT));
      const r = rt('exp', 'inverse-first', x);
      expect(r.mathReturns).toBe(true);
      expect(r.returned, `x=${x}`).toBe(true);
    }
  });
});

describe('round trip: √(x²) and (√x)²', () => {
  it('x = −3: squaring forgets the sign; the root returns 3, not −3 (cause sign-lost, and the error is 6)', () => {
    const r = rt('square', 'forward-first', -3);
    expect(r.steps[0].output).toMatchObject({ kind: 'exact' });
    expect(rationalForm((r.steps[0].output as { value: ReturnType<typeof rat> }).value).text).toBe('9');
    expect(rationalForm((r.steps[1].output as { value: ReturnType<typeof rat> }).value).text).toBe('3');
    expect(r.cause).toBe('sign-lost');
    expect(r.mathReturns).toBe(false);
    expect(r.returned).toBe(false);
    expect(r.error).toBe(6);
  });
  it('x ≥ 0 returns exactly, for decimals too: 1.2² = 1.44 and √1.44 = 1.2 exactly', () => {
    const r = rt('square', 'forward-first', 1.2);
    expect(rationalForm((r.steps[0].output as { value: ReturnType<typeof rat> }).value).text).toBe('1.44');
    expect(rationalForm((r.steps[1].output as { value: ReturnType<typeof rat> }).value).text).toBe('1.2');
    expect(r.cause).toBe('ok');
    expect(r.returned).toBe(true);
    expect(rt('square', 'forward-first', 0).cause).toBe('ok');
  });
  it('(√x)² for x < 0: no real root; the round trip never starts', () => {
    const r = rt('square', 'inverse-first', -1);
    expect(r.cause).toBe('domain');
    expect(r.steps[0].output.kind).toBe('undefined');
  });
  it('(√x)² for a perfect square is exact: x = 2.25 → 1.5 → 2.25', () => {
    const r = rt('square', 'inverse-first', 2.25);
    expect(r.steps.map(s => s.output.kind)).toEqual(['exact', 'exact']);
    expect(r.cause).toBe('ok');
    expect(r.error).toBe(0);
  });
  it('(√2)² is 2.0000000000000004 — within tolerance (it returned) but NOT identical (Math.sqrt(2)² ≠ 2); math says exactly 2', () => {
    const r = rt('square', 'inverse-first', 2);
    expect((r.steps[1].output as { value: number }).value).toBe(Math.sqrt(2) * Math.sqrt(2));
    expect(Math.sqrt(2) * Math.sqrt(2)).not.toBe(2);
    expect(r.returned).toBe(true);
    expect(r.identical).toBe(false);
    expect(r.cause).toBe('rounding');
    expect(r.error!).toBeGreaterThan(0);
    expect(r.error!).toBeLessThanOrEqual(r.tolerance);
  });
  it('seeded sweep: (√x)² always within tolerance for x in [0, 800]', () => {
    const rand = mulberry(3);
    for (let i = 0; i < 2000; i++) {
      const x = round2(rand() * 800);
      const r = rt('square', 'inverse-first', x);
      expect(r.returned, `x=${x}`).toBe(true);
    }
  });
  it('mirror points: (x, f(x)) reflected is (f(x), x); the reflected point of eˣ sits on ln', () => {
    const r = rt('exp', 'forward-first', 2);
    expect(r.mirror!.onFirst.y).toBe(Math.exp(2));
    expect(r.mirror!.reflected).toEqual({ x: Math.exp(2), y: 2 });
    expect(Math.log(r.mirror!.reflected.x)).toBeCloseTo(r.mirror!.reflected.y, 14);
  });
});

describe('graphs of inverse pairs', () => {
  const window = { xMin: -4, xMax: 6, yMin: -4, yMax: 6 };
  it('the inverse graph is the mirror image of the forward graph in the line y = x', () => {
    const exp = undoCurves('exp', window);
    // far outside the window the sampler clamps heights (a steep branch stays a finite line), so compare only where it does not
    for (const line of reflectPolylines(exp.forward)) for (const p of line) {
      if (p.x > 1e-9 && p.x < 100) expect(Math.log(p.x)).toBeCloseTo(p.y, 9); // reflected points of e^x lie on y = ln x
    }
    const sq = undoCurves('square', window);
    for (const line of reflectPolylines(sq.forward)) for (const p of line) if (p.x < 100) expect(Math.abs(p.y) ** 2).toBeCloseTo(p.x, 9); // x ≥ 0 only: the reflection of y = x² has x = y²
  });
  it('x² reflects to a SIDEWAYS parabola: the upper branch is √x, the lower branch is −√x, and the lower one is not a function value', () => {
    const sq = undoCurves('square', window);
    for (const line of sq.inverse) for (const p of line) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y ** 2).toBeCloseTo(p.x, 9); }
    for (const line of sq.otherBranch) for (const p of line) { expect(p.y).toBeLessThanOrEqual(0); expect(p.y ** 2).toBeCloseTo(p.x, 9); }
    expect(sq.otherBranch.length).toBeGreaterThan(0);
    expect(undoCurves('exp', window).otherBranch).toEqual([]);
  });
  it('the diagonal is y = x across the window', () => {
    const d = undoCurves('exp', window).diagonal;
    expect(d[0].x).toBe(d[0].y);
    expect(d[1].x).toBe(d[1].y);
    expect(d[1].x).toBeGreaterThan(d[0].x);
  });
  it('the curves do not depend on the chosen x (sampling is a function of (family, window) only)', () => {
    expect(undoCurves('exp', window)).toEqual(undoCurves('exp', window));
  });
});

describe('exponential and logarithm with a chosen base', () => {
  const g = (state: Partial<GrowthState>) => deriveGrowth({ ...CANONICAL_GROWTH, ...state });
  it('canonical: 2² = 4 exactly, base 2 growth, doubling time exactly 1, log₂ 2 = 1', () => {
    const d = g({});
    expect(d.kind).toBe('growth');
    expect(d.power).toMatchObject({ kind: 'exact' });
    expect(rationalForm((d.power as { value: ReturnType<typeof rat> }).value).text).toBe('4');
    expect(d.period).toMatchObject({ kind: 'doubling', value: { kind: 'exact' } });
    expect(d.logAtX).toMatchObject({ kind: 'exact' });
  });
  it('base 1/2 is decay with halving time exactly 1; (1/2)⁻³ = 8 exactly', () => {
    const d = g({ preset: 'half', x: -3 });
    expect(d.kind).toBe('decay');
    expect(d.period.kind).toBe('halving');
    expect(rationalForm((d.power as { value: ReturnType<typeof rat> }).value).text).toBe('8');
    expect(g({ preset: 'half', x: 3 }).power).toMatchObject({ kind: 'exact' });
    expect(rationalForm((g({ preset: 'half', x: 3 }).power as { value: ReturnType<typeof rat> }).value).text).toBe('0.125'); // a terminating decimal is shown as a decimal
    expect(rationalForm((g({ preset: 'custom', custom: 3, x: -2 }).power as { value: ReturnType<typeof rat> }).value).tex).toBe('\\frac{1}{9}');
  });
  it('base e: ln e = 1 exactly; e^0 = 1 exactly; e^1 is a double; doubling time ln 2 ≈ 0.693', () => {
    expect(g({ preset: 'e' }).lnBase).toMatchObject({ kind: 'exact' });
    expect(g({ preset: 'e', x: 0 }).power).toMatchObject({ kind: 'exact' });
    expect(g({ preset: 'e', x: 1 }).power).toEqual({ kind: 'numeric', value: Math.E });
    const p = g({ preset: 'e' }).period as { value: { kind: 'numeric'; value: number } };
    expect(p.value.value).toBeCloseTo(Math.LN2, 15);
  });
  it('base 10: 10²⁰ is exact, 10²¹ is a double; log₁₀ 100 = 2, log₁₀ 10 = 1 exactly', () => {
    expect(g({ preset: 'ten', x: 20 }).power).toMatchObject({ kind: 'exact' });
    expect(g({ preset: 'ten', x: 21 }).power).toMatchObject({ kind: 'numeric' });
    expect(toNumber((g({ preset: 'ten', x: 20 }).power as { value: ReturnType<typeof rat> }).value)).toBe(1e20);
    expect(g({ preset: 'ten', x: 100 }).logAtX).toMatchObject({ kind: 'exact' });
    expect(rationalForm((g({ preset: 'ten', x: 100 }).logAtX as { value: ReturnType<typeof rat> }).value).text).toBe('2');
    expect(rationalForm((g({ preset: 'ten', x: 0.01 }).logAtX as { value: ReturnType<typeof rat> }).value).text).toBe('-2'.replace('-', '−'));
    expect(g({ preset: 'ten', x: 10 }).logAtX).toMatchObject({ kind: 'exact' });
    expect(g({ preset: 'ten', x: 50 }).logAtX).toMatchObject({ kind: 'numeric' }); // log₁₀ 50 is irrational
  });
  it('exactLog finds whole-number logarithms and nothing else: log₂ 8 = 3, log_{1/2} 4 = −2, log₂ 3 has none', () => {
    expect(exactLog(rat(2), rat(8))).toEqual(rat(3));
    expect(exactLog(rat(1, 2), rat(4))).toEqual(rat(-2));
    expect(exactLog(rat(4), rat(1, 2))).toBeNull(); // log₄ (1/2) = −1/2: rational but not a whole number
    expect(exactLog(rat(2), rat(3))).toBeNull();
    expect(exactLog(rat(2), rat(1))).toEqual(rat(0));
    expect(exactLog(rat(1), rat(1))).toBeNull();
    expect(exactLog(rat(2), rat(-4))).toBeNull();
    expect(g({ x: 8 }).logAtX).toMatchObject({ kind: 'exact' }); // base 2
    expect(g({ x: 8 }).bits).toMatchObject({ kind: 'exact' });
    expect(g({ x: 3 }).bits).toMatchObject({ kind: 'numeric' });
  });
  it('custom base 1.5: 1.5² = 9/4 exactly; log_1.5 x = ln x / ln 1.5', () => {
    const d = g({ preset: 'custom', custom: 1.5, x: 2 });
    expect(rationalForm((d.power as { value: ReturnType<typeof rat> }).value).text).toBe('2.25');
    expect((d.logAtX as { value: number }).value).toBeCloseTo(Math.log(2) / Math.log(1.5), 14);
    expect((d.period as { value: { value: number } }).value.value).toBeCloseTo(Math.LN2 / Math.log(1.5), 14);
  });
  it('base 1 is not an exponential family: constant, no logarithm, no doubling time', () => {
    const d = g({ preset: 'custom', custom: 1, x: 5 });
    expect(d.kind).toBe('constant');
    expect(d.logAtX).toEqual({ kind: 'undefined', reason: NO_LOG_BASE_1 });
    expect(d.period.kind).toBe('none');
    expect(sampleBase(1, { xMin: -3, xMax: 3, yMin: -3, yMax: 3 }).logarithm).toEqual([]);
  });
  it('base ≤ 0 is rejected, not clamped', () => {
    expect(() => g({ preset: 'custom', custom: 0 })).toThrow(RangeError);
    expect(() => g({ preset: 'custom', custom: -2 })).toThrow(RangeError);
    expect(() => g({ preset: 'custom', custom: 1.234 })).toThrow(RangeError);
  });
  it('the logarithm needs a positive input: x ≤ 0 is undefined with the reason, bits and nats too', () => {
    for (const x of [0, -1]) {
      const d = g({ x });
      expect(d.logAtX).toEqual({ kind: 'undefined', reason: NO_LOG_X });
      expect(d.bits).toEqual({ kind: 'undefined', reason: NO_LOG_X });
      expect(d.nats).toEqual({ kind: 'undefined', reason: NO_LOG_X });
    }
  });
  it('bits = nats / ln 2: x = 8 → 2.0794 nats ≈ 3 bits', () => {
    const d = g({ x: 8 });
    expect((d.nats as { value: number }).value).toBeCloseTo(2.0794415416798357, 14);
    expect(d.bits).toMatchObject({ kind: 'exact' }); // 8 = 2³, so log₂ 8 is exactly 3
    expect((g({ x: 5 }).bits as { value: number }).value).toBeCloseTo(2.321928094887362, 14);
  });
  it('the graphs: b^x is positive and monotone in the right direction; log_b is its mirror image', () => {
    const window = { xMin: -4, xMax: 6, yMin: -4, yMax: 6 };
    for (const base of [0.5, 2, Math.E, 10, 1.5]) {
      const { exponential, logarithm } = sampleBase(base, window);
      for (const line of exponential) for (const p of line) if (Math.pow(base, p.x) < 100) expect(p.y).toBeCloseTo(Math.pow(base, p.x), 9); // (heights beyond the window are clamped by the sampler)
      for (const line of logarithm) for (const p of line) expect(Math.pow(base, p.y)).toBeCloseTo(p.x, 6);
      const flat = exponential.flat();
      for (let i = 1; i < flat.length; i++) expect(base > 1 ? flat[i]!.y >= flat[i - 1]!.y : flat[i]!.y <= flat[i - 1]!.y).toBe(true);
    }
  });
});

describe('logarithm identities are checked, not asserted', () => {
  const ids = (s: Partial<typeof CANONICAL_IDENTITY>) => deriveIdentities({ ...CANONICAL_IDENTITY, ...s });
  it('canonical a = 6, b = 4, k = 3: four checks, all within tolerance; ln 24 = ln 6 + ln 4 ≈ 3.178054', () => {
    const d = ids({});
    expect(CANONICAL_IDENTITY).toEqual({ a: 6, b: 4, k: 3 });
    expect(d.checks.map(c => c.id)).toEqual(['product', 'power', 'change-of-base', 'bits-nats']);
    for (const c of d.checks) { expect(c.status).toBe('checked'); expect(c.within).toBe(true); }
    expect(d.checks[0]!.lhs).toBeCloseTo(3.1780538303479458, 14);
    expect(d.checks[1]!.lhs).toBeCloseTo(3 * Math.log(6), 14);
  });
  it('the shown difference is the true difference of the two computed sides and the tolerance is 8 ulp of the scale', () => {
    for (const c of ids({ a: 0.3, b: 7.77, k: -2.5 }).checks) {
      expect(c.difference).toBe(c.lhs! - c.rhs!);
      expect(c.tolerance!).toBeGreaterThanOrEqual(8 * 2 ** -52);
      expect(Math.abs(c.difference!)).toBeLessThanOrEqual(c.tolerance!);
    }
  });
  it('a ≤ 0 or b ≤ 0 makes the dependent checks undefined, with a reason; the power check needs only a > 0', () => {
    const neg = ids({ a: -1, b: 4 });
    expect(neg.checks.map(c => c.status)).toEqual(['undefined', 'undefined', 'undefined', 'undefined']);
    for (const c of neg.checks) expect(c.reason).toMatch(/a > 0|non-positive/);
    const negB = ids({ a: 6, b: 0 });
    expect(negB.checks.map(c => c.status)).toEqual(['undefined', 'checked', 'undefined', 'checked']);
    expect(negB.checks[0]!.reason).toMatch(/b > 0/);
  });
  it('base 1 has no change of base; the other three still hold', () => {
    const d = ids({ b: 1 });
    expect(d.checks[2]!.status).toBe('undefined');
    expect(d.checks[2]!.reason).toMatch(/base 1/);
    expect(d.checks.filter(c => c.status === 'checked')).toHaveLength(3);
  });
  it('change of base near b = 1 amplifies rounding (exponent ≈ 462): the tolerance accounts for it and still holds', () => {
    const c = ids({ a: 100, b: 1.01 }).checks[2]!;
    expect(c.status).toBe('checked');
    expect(c.within).toBe(true);
    expect(c.tolerance!).toBeGreaterThan(8 * 2 ** -52 * 100); // wider than the plain tolerance, by the factor 1 + |ln a|
  });
  it('a value beyond the double range is reported as unable to compare, never as a failed identity', () => {
    expect(() => ids({ a: 1e300 })).toThrow(RangeError); // not a 2-decimal number: rejected, not clamped
    const p = ids({ a: 99, k: 400 } as never).checks[1]!; // 99^400 overflows
    expect(p.status).toBe('undefined');
    expect(p.reason).toMatch(/double/);
  });
  it('seeded sweep: every identity holds within tolerance for random a, b > 0 (b ≠ 1), k', () => {
    const rand = mulberry(99);
    for (let i = 0; i < 3000; i++) {
      const a = Math.max(0.01, round2(rand() * 50));
      let b = Math.max(0.01, round2(rand() * 50));
      if (b === 1) b = 2;
      const k = round2((rand() - 0.5) * 10);
      for (const c of ids({ a, b, k }).checks) {
        if (c.status === 'checked') expect(c.within, `${c.id} a=${a} b=${b} k=${k} diff=${c.difference} tol=${c.tolerance}`).toBe(true);
      }
    }
  });
  it('the difference is generally NOT zero: a computer-level fact the lesson shows (some pair has a non-zero difference)', () => {
    const rand = mulberry(5);
    let nonzero = 0;
    for (let i = 0; i < 400; i++) {
      const a = Math.max(0.01, round2(rand() * 50)), b = Math.max(0.01, round2(rand() * 50));
      if (ids({ a, b }).checks[0]!.difference !== 0) nonzero++;
    }
    expect(nonzero).toBeGreaterThan(0);
  });
});

describe('identities near the edge of the double range', () => {
  it('a subnormal power (0.01¹⁶⁰ ≈ 1e-320) is reported as out of range, not as a failed identity', () => {
    const c = deriveIdentities({ a: 0.01, b: 4, k: 160 }).checks[1]!;
    expect(c.status).toBe('undefined');
    expect(c.reason).toMatch(/too large or too small/);
    expect(deriveIdentities({ a: 0.01, b: 4, k: 100 }).checks[1]!.status).toBe('checked'); // 1e-200 is a normal double
  });
});
