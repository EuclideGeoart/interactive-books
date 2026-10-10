/**
 * The rotating unit vector (I.6): the exact special-angle table, reduction by quadrant, the Pythagorean identity, periodicity, the
 * inverse-trig representatives, and the input paths (pointer projection, keyboard step). All exact claims are re-checked numerically
 * against Math.sin / Math.cos on a sweep, and the oracle (Decimal, independent algorithm) checks them again in the parity test.
 */
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_CIRCLE, DEFAULT_RADIANS, DEFAULT_TWELFTHS, RADIANS_LIMIT, angleTowards, arcsinRepresentative, atan2Representative, deriveCircle, exactAngle, exactTrig,
  freeAngle, mod24, piMultiple, reduceTwelfths, stepAngle,
} from '../../src/math/families/circle';

const K = Array.from({ length: 97 }, (_, i) => i - 48); // −48 … 48 twelfths: four full turns each way

describe('exact table: sin and cos of k·π/12', () => {
  const cases: [number, string, string][] = [
    [0, '0', '1'], [1, '(√6−√2)/4', '(√6+√2)/4'], [2, '1/2', '√3/2'], [3, '√2/2', '√2/2'], [4, '√3/2', '1/2'], [5, '(√6+√2)/4', '(√6−√2)/4'], [6, '1', '0'],
    [7, '(√6+√2)/4', '−(√6−√2)/4'], [8, '√3/2', '−1/2'], [9, '√2/2', '−√2/2'], [10, '1/2', '−√3/2'], [11, '(√6−√2)/4', '−(√6+√2)/4'], [12, '0', '−1'],
    [13, '−(√6−√2)/4', '−(√6+√2)/4'], [14, '−1/2', '−√3/2'], [16, '−√3/2', '−1/2'], [18, '−1', '0'], [20, '−√3/2', '1/2'], [22, '−1/2', '√3/2'], [23, '−(√6−√2)/4', '(√6+√2)/4'],
    [-2, '−1/2', '√3/2'], [-6, '−1', '0'], [-12, '0', '−1'], [24, '0', '1'], [26, '1/2', '√3/2'],
  ];
  for (const [k, sin, cos] of cases) {
    it(`sin and cos of ${k}π/12`, () => {
      const t = exactTrig(k);
      expect(t.sin.text).toBe(sin);
      expect(t.cos.text).toBe(cos);
    });
  }
  it('every exact value agrees with Math.sin / Math.cos (to 1e-15 within one turn; the argument k·π/12 itself carries rounding error beyond that) and is exactly 0 on the axes, where Math.cos(π/2) is 6e-17', () => {
    for (const k of K) {
      const t = exactTrig(k);
      const bound = Math.abs(k) <= 24 ? 1e-15 : 1e-14;
      expect(Math.abs(t.sin.numeric - Math.sin((k * Math.PI) / 12)), `sin ${k}`).toBeLessThan(bound);
      expect(Math.abs(t.cos.numeric - Math.cos((k * Math.PI) / 12)), `cos ${k}`).toBeLessThan(bound);
    }
    expect(exactTrig(6).cos.numeric).toBe(0);
    expect(Math.cos(Math.PI / 2)).not.toBe(0);
    expect(Object.is(exactTrig(12).sin.numeric, 0)).toBe(true); // +0, never −0
  });
  it('cos²θ + sin²θ = 1 exactly: the exact squares of each pair sum to 1 (hand check for π/12: (2−√3)/4 + (2+√3)/4 = 4/4)', () => {
    for (const k of K) {
      const t = exactTrig(k);
      expect(t.sin2.numeric + t.cos2.numeric).toBeCloseTo(1, 15);
      expect(t.sin.numeric ** 2).toBeCloseTo(t.sin2.numeric, 15);
      expect(t.cos.numeric ** 2).toBeCloseTo(t.cos2.numeric, 15);
    }
    expect(exactTrig(1).sin2.text).toBe('(2−√3)/4');
    expect(exactTrig(1).cos2.text).toBe('(2+√3)/4');
    expect(exactTrig(3).sin2.text).toBe('1/2');
  });
  it('periodicity: k and k + 24 have identical exact values; the table is odd/even as sin and cos are', () => {
    for (let k = -24; k <= 24; k++) {
      expect(exactTrig(k + 24).sin.text).toBe(exactTrig(k).sin.text);
      expect(exactTrig(k + 24).cos.text).toBe(exactTrig(k).cos.text);
      expect(exactTrig(-k).cos.text).toBe(exactTrig(k).cos.text); // cos is even
      const a = exactTrig(k).sin.text, b = exactTrig(-k).sin.text;
      expect(b).toBe(a === '0' ? '0' : a.startsWith('−') ? a.slice(1) : `−${a}`); // sin is odd
    }
  });
  it('the forms are classified: rational values and radicals', () => {
    expect(exactTrig(2).sin.kind).toBe('rational');
    expect(exactTrig(3).sin.kind).toBe('radical');
    expect(exactTrig(6).cos.nonzero).toBe(false);
  });
});

describe('reduction modulo 2π, quadrants, reference angles', () => {
  it('mod24 is a true modulus for negative k', () => {
    expect([mod24(-2), mod24(26), mod24(24), mod24(-24), mod24(-25), mod24(0)]).toEqual([22, 2, 0, 0, 23, 0]);
  });
  it('quadrant, reference angle and signs for 5π/6 (k = 10): quadrant II, reference π/6, sin positive, cos negative', () => {
    const r = reduceTwelfths(10);
    expect(r.location).toEqual({ kind: 'quadrant', quadrant: 'II' });
    expect(r.referenceIndex).toBe(2);
    expect([r.sinSign, r.cosSign]).toEqual([1, -1]);
  });
  it('axes and quadrant boundaries', () => {
    expect(reduceTwelfths(0).location).toEqual({ kind: 'axis', axis: '+x' });
    expect(reduceTwelfths(6).location).toEqual({ kind: 'axis', axis: '+y' });
    expect(reduceTwelfths(12).location).toEqual({ kind: 'axis', axis: '−x' });
    expect(reduceTwelfths(18).location).toEqual({ kind: 'axis', axis: '−y' });
    expect(reduceTwelfths(-6).location).toEqual({ kind: 'axis', axis: '−y' });
    expect([reduceTwelfths(1).location, reduceTwelfths(7).location, reduceTwelfths(13).location, reduceTwelfths(19).location].map(l => (l.kind === 'quadrant' ? l.quadrant : '?'))).toEqual(['I', 'II', 'III', 'IV']);
  });
  it('signs agree with the sign of the double value for every k (the quadrant rule is right)', () => {
    for (const k of K) {
      const r = reduceTwelfths(k);
      const s = Math.sin((k * Math.PI) / 12), c = Math.cos((k * Math.PI) / 12);
      expect(r.sinSign, `sin ${k}`).toBe(Math.abs(s) < 1e-12 ? 0 : Math.sign(s));
      expect(r.cosSign, `cos ${k}`).toBe(Math.abs(c) < 1e-12 ? 0 : Math.sign(c));
      expect(r.referenceIndex).toBeGreaterThanOrEqual(0);
      expect(r.referenceIndex).toBeLessThanOrEqual(6);
      // the reference angle really is the acute angle to the x-axis (or π/2 on the y-axis)
      expect(Math.abs(Math.sin((r.referenceIndex * Math.PI) / 12))).toBeCloseTo(Math.abs(s), 12);
    }
  });
});

describe('multiples of π', () => {
  it('lowest terms', () => {
    const cases: [number, string][] = [[0, '0'], [1, 'π/12'], [2, 'π/6'], [3, 'π/4'], [4, 'π/3'], [5, '5π/12'], [6, 'π/2'], [8, '2π/3'], [9, '3π/4'], [10, '5π/6'], [12, 'π'], [18, '3π/2'], [24, '2π'], [-3, '−π/4'], [-24, '−2π']];
    for (const [k, text] of cases) expect(piMultiple(k).text).toBe(text);
    expect(piMultiple(2).tex).toBe('\\frac{\\pi}{6}');
    expect(piMultiple(12).tex).toBe('\\pi');
    expect(piMultiple(-8).tex).toBe('-\\frac{2\\pi}{3}');
    expect(() => piMultiple(1.5)).toThrow(RangeError);
  });
});

describe('inverse-trig representatives', () => {
  it('arcsin(sin θ) = θ only for θ in [−π/2, π/2]; otherwise the representative in that interval', () => {
    const cases: [number, number][] = [[2, 2], [-6, -6], [6, 6], [7, 5], [8, 4], [10, 2], [12, 0], [14, -2], [17, -5], [18, -6], [19, -5], [24, 0], [30, 6], [-7, -5]];
    for (const [k, rep] of cases) expect(arcsinRepresentative(k), `k=${k}`).toBe(rep);
    for (const k of K) {
      const rep = arcsinRepresentative(k);
      expect(Math.abs(rep)).toBeLessThanOrEqual(6);
      expect(Math.sin((rep * Math.PI) / 12)).toBeCloseTo(Math.sin((k * Math.PI) / 12), 12); // same sine
      expect(deriveCircle(exactAngle(Math.max(-24, Math.min(24, k)))).arcsinOfSin).toMatchObject({ kind: 'exact' });
    }
  });
  it('atan2(sin θ, cos θ) ≡ θ (mod 2π) in (−π, π]: k = 12 gives π (not −π) and k = −12 also gives π', () => {
    expect(atan2Representative(12)).toBe(12);
    expect(atan2Representative(-12)).toBe(12);
    expect(atan2Representative(13)).toBe(-11);
    expect(atan2Representative(24)).toBe(0);
    expect(atan2Representative(-1)).toBe(-1);
    for (const k of K) {
      const rep = atan2Representative(k);
      expect(rep).toBeGreaterThan(-12);
      expect(rep).toBeLessThanOrEqual(12);
      expect(mod24(rep)).toBe(mod24(k)); // congruent mod 2π
      // the double-precision atan2 gives −π for k = −12 (sin(−π) = −1.2e-16); the model's convention is (−π, π], so compare by direction
      expect(Math.cos((rep * Math.PI) / 12)).toBeCloseTo(Math.cos((k * Math.PI) / 12), 12);
      expect(Math.sin((rep * Math.PI) / 12)).toBeCloseTo(Math.sin((k * Math.PI) / 12), 12);
      const ref = Math.atan2(Math.sin((k * Math.PI) / 12), Math.cos((k * Math.PI) / 12));
      if (Math.abs(ref + Math.PI) > 1e-9) expect(ref).toBeCloseTo((rep * Math.PI) / 12, 12);
    }
  });
});

describe('derived object — exact mode', () => {
  it('canonical angle is π/6: (cos, sin) = (√3/2, 1/2), degrees exactly 30, quadrant I', () => {
    const d = deriveCircle(CANONICAL_CIRCLE);
    expect(CANONICAL_CIRCLE).toEqual({ mode: 'exact', twelfths: DEFAULT_TWELFTHS, radians: DEFAULT_RADIANS });
    expect(d.piMultiple?.text).toBe('π/6');
    expect(d.degrees).toEqual({ exact: true, value: 30 });
    expect(d.cos).toMatchObject({ kind: 'exact', form: { text: '√3/2' } });
    expect(d.sin).toMatchObject({ kind: 'exact', form: { text: '1/2' } });
    expect(d.point.x).toBe(Math.sqrt(3) / 2);
    expect(d.point.y).toBe(0.5);
    expect(d.location).toEqual({ kind: 'quadrant', quadrant: 'I' });
    expect(d.pythagorean).toEqual({ exact: true, value: 1 });
    expect(d.reduced).toEqual({ kind: 'exact', twelfths: 2 });
  });
  it('θ = π/2 lies exactly on the y-axis: the drawn point is (0, 1), not (6e-17, 1)', () => {
    const d = deriveCircle(exactAngle(6));
    expect(d.point).toEqual({ x: 0, y: 1 });
    expect(d.location).toEqual({ kind: 'axis', axis: '+y' });
  });
  it('θ = 7π/6: third quadrant, both components negative; θ + 2π has the very same exact values', () => {
    const d = deriveCircle(exactAngle(14));
    expect(d.sin).toMatchObject({ form: { text: '−1/2' } });
    expect(d.cos).toMatchObject({ form: { text: '−√3/2' } });
    expect(d.sinPlusTurn).toEqual(d.sin);
    expect(d.cosPlusTurn).toEqual(d.cos);
    expect(d.arcsinOfSin).toMatchObject({ twelfths: -2, returnsTheta: false });
    expect(d.atan2OfComponents).toMatchObject({ twelfths: -10, returnsTheta: false });
  });
  it('returnsTheta flags: arcsin returns θ for |k| ≤ 6, atan2 returns θ for −12 < k ≤ 12', () => {
    for (let k = -24; k <= 24; k++) {
      const d = deriveCircle(exactAngle(k));
      expect(d.arcsinOfSin.returnsTheta).toBe(Math.abs(k) <= 6);
      expect(d.atan2OfComponents.returnsTheta).toBe(k > -12 && k <= 12);
    }
  });
  it('the radians double is k·π/12 and the degrees are exactly 15k', () => {
    for (const k of K.filter(k => Math.abs(k) <= 24)) {
      const d = deriveCircle(exactAngle(k));
      expect(d.radians).toBeCloseTo((k * Math.PI) / 12, 14);
      expect(d.degrees.value).toBe(15 * k);
    }
  });
});

describe('derived object — free mode', () => {
  it('θ = 1 rad: ≈ (0.540302, 0.841471); first quadrant; arcsin and atan2 return θ', () => {
    const d = deriveCircle(freeAngle(1));
    expect(d.mode).toBe('free');
    expect(d.piMultiple).toBeNull();
    expect(d.cos).toEqual({ kind: 'numeric', value: Math.cos(1) });
    expect(d.sin).toEqual({ kind: 'numeric', value: Math.sin(1) });
    expect(d.degrees.exact).toBe(false);
    expect(d.degrees.value).toBeCloseTo(57.29577951308232, 12);
    expect(d.location).toEqual({ kind: 'quadrant', quadrant: 'I' });
    expect(d.arcsinOfSin).toMatchObject({ kind: 'numeric', returnsTheta: true });
    expect(d.atan2OfComponents).toMatchObject({ kind: 'numeric', returnsTheta: true });
  });
  it('θ = 2 rad: arcsin(sin 2) = π − 2 ≈ 1.141593, a different number; atan2 returns 2', () => {
    const d = deriveCircle(freeAngle(2));
    expect(d.arcsinOfSin).toMatchObject({ kind: 'numeric', returnsTheta: false });
    expect((d.arcsinOfSin as { radians: number }).radians).toBeCloseTo(Math.PI - 2, 14);
    expect((d.atan2OfComponents as { radians: number }).radians).toBeCloseTo(2, 14);
  });
  it('θ = 4 rad: atan2 returns 4 − 2π ≈ −2.283185 (the representative in (−π, π]); θ = −4 gives 2π − 4', () => {
    expect((deriveCircle(freeAngle(4)).atan2OfComponents as { radians: number }).radians).toBeCloseTo(4 - 2 * Math.PI, 14);
    expect((deriveCircle(freeAngle(-4)).atan2OfComponents as { radians: number }).radians).toBeCloseTo(2 * Math.PI - 4, 14);
    expect(deriveCircle(freeAngle(4)).atan2OfComponents.returnsTheta).toBe(false);
  });
  it('θ = 0 is exactly the +x axis in both modes', () => {
    const d = deriveCircle(freeAngle(0));
    expect(d.point).toEqual({ x: 1, y: 0 });
    expect(d.cos).toMatchObject({ kind: 'exact' });
    expect(d.location).toEqual({ kind: 'axis', axis: '+x' });
  });
  it('quadrants and component signs follow the angle; cos² + sin² differs from 1 only by rounding (≤ 4 ulp)', () => {
    for (let r = -6.283; r <= 6.283; r += 0.137) {
      const theta = Number(r.toFixed(3));
      const d = deriveCircle(freeAngle(theta));
      expect(d.cosSign).toBe(Math.sign(Math.cos(theta)));
      expect(d.sinSign).toBe(Math.sign(Math.sin(theta)));
      expect(Math.abs(d.pythagorean.value - 1)).toBeLessThan(8 * 2 ** -53);
      const q = d.location.kind === 'quadrant' ? d.location.quadrant : '?';
      const expected = d.cosSign > 0 ? (d.sinSign > 0 ? 'I' : 'IV') : d.sinSign > 0 ? 'II' : 'III';
      if (theta !== 0) expect(q).toBe(expected);
    }
  });
  it('sin(θ + 2π) equals sin θ to rounding (≤ 1e-14), the numeric form of periodicity', () => {
    for (const theta of [-6, -3.3, -1, 0.5, 2.7, 5.9]) {
      const d = deriveCircle(freeAngle(theta));
      expect((d.sinPlusTurn as { value: number }).value).toBeCloseTo((d.sin as { value: number }).value, 13);
      expect((d.cosPlusTurn as { value: number }).value).toBeCloseTo((d.cos as { value: number }).value, 13);
    }
  });
});

describe('state constructors reject what the controls reject', () => {
  it('keeps the unused field canonical so Reset and isCanonical agree', () => {
    expect(exactAngle(5).radians).toBe(DEFAULT_RADIANS);
    expect(freeAngle(1.234).twelfths).toBe(DEFAULT_TWELFTHS);
  });
  it('rejects non-integers, out-of-range and over-precise angles', () => {
    expect(() => exactAngle(2.5)).toThrow(RangeError);
    expect(() => exactAngle(25)).toThrow(RangeError);
    expect(() => freeAngle(1.2345)).toThrow(RangeError);
    expect(() => freeAngle(6.284)).toThrow(RangeError);
    expect(() => freeAngle(NaN)).toThrow(RangeError);
    expect(Object.is(exactAngle(-0).twelfths, 0)).toBe(true);
  });
});

describe('pointer projection and keyboard steps write the same state shapes', () => {
  const polar = (r: number, phi: number) => ({ x: r * Math.cos(phi), y: r * Math.sin(phi) });
  it('the angle is the DIRECTION of the pointer, whatever its distance from the origin', () => {
    for (const r of [0.2, 1, 3, 40]) {
      expect(angleTowards(CANONICAL_CIRCLE, polar(r, Math.PI / 2), 'exact')).toEqual(exactAngle(6));
      expect(angleTowards(CANONICAL_CIRCLE, polar(r, 1), 'free')).toEqual(freeAngle(1));
    }
    expect(angleTowards(CANONICAL_CIRCLE, { x: 0, y: 0 }, 'exact')).toBeNull();
  });
  it('snaps to the nearest twelfth in exact mode', () => {
    expect(angleTowards(CANONICAL_CIRCLE, polar(1, 0.1), 'exact')).toEqual(exactAngle(0)); // 0.1 rad ≈ 5.7° → 0
    expect(angleTowards(CANONICAL_CIRCLE, polar(1, 0.2), 'exact')).toEqual(exactAngle(1)); // 11.5° → 15°
  });
  it('dragging across the negative x-axis continues smoothly (no jump of a full turn)', () => {
    let state = exactAngle(10);
    for (const deg of [160, 170, 175, 180, 185, 190, 200]) {
      state = angleTowards(state, polar(1, (deg * Math.PI) / 180), 'exact')!;
      expect(state.twelfths).toBe(Math.round(deg / 15));
    }
    expect(state.twelfths).toBe(13);
  });
  it('reaches a full turn (2π = 24 twelfths) and the range is ±2π: past it the pointer continues from the other end', () => {
    let state = exactAngle(20);
    for (const deg of [330, 345, 359]) state = angleTowards(state, polar(1, (deg * Math.PI) / 180), 'exact')!;
    expect(state.twelfths).toBe(24); // 359° is nearest the full turn
    state = angleTowards(state, polar(1, (5 * Math.PI) / 180), 'exact')!;
    expect(state.twelfths).toBe(0); // 365° would exceed 2π, so the representative 5° is used
    for (const deg of [-10, -170, -200, -350, -359]) {
      state = angleTowards(state, polar(1, (deg * Math.PI) / 180), 'exact')!;
      expect(Math.abs(state.twelfths)).toBeLessThanOrEqual(24);
    }
    expect(state.twelfths).toBe(-24);
  });
  it('keyboard: ±1 twelfth (±5 hundredths of a radian when coarse), clamped; free mode ±0.01 / ±0.05', () => {
    expect(stepAngle(exactAngle(2), 1, false)).toEqual(exactAngle(3));
    expect(stepAngle(exactAngle(2), -1, true)).toEqual(exactAngle(-4));
    expect(stepAngle(exactAngle(24), 1, false)).toEqual(exactAngle(24));
    expect(stepAngle(exactAngle(-23), -1, true)).toEqual(exactAngle(-24));
    expect(stepAngle(freeAngle(0.52), 1, false)).toEqual(freeAngle(0.53));
    expect(stepAngle(freeAngle(0.52), 1, true)).toEqual(freeAngle(0.57));
    expect(stepAngle(freeAngle(RADIANS_LIMIT), 1, false)).toEqual(freeAngle(RADIANS_LIMIT));
    expect(stepAngle(freeAngle(0), -1, false)).toEqual(freeAngle(-0.01));
  });
  it('every free state produced by the input paths is a valid three-decimal angle (no float noise)', () => {
    let s = freeAngle(0);
    for (let i = 0; i < 700; i++) { s = stepAngle(s, 1, i % 7 === 0); expect(Number(s.radians.toFixed(3))).toBe(s.radians); }
  });
});
