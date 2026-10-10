import { describe, expect, it } from 'vitest';
import { deriveVector2 } from '../../src/math/vector2/vector2';
import { EXACT_RADICAND_LIMIT, exactMagnitude, toExactForm } from '../../src/math/vector2/exact';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const relErr = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), Number.MIN_VALUE);
/** Smallest signed difference between two angles, in (−π, π]. */
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

describe('canonical vector (3, 2) — the plan’s §9.4 / §15.3 values', () => {
  const d = deriveVector2({ x: 3, y: 2 });
  it('magnitude² = 13 and magnitude = √13 ≈ 3.605551275463989', () => {
    expect(d.xSquared).toBe(9);
    expect(d.ySquared).toBe(4);
    expect(d.magnitudeSquared).toBe(13);
    expect(d.magnitude).toBeCloseTo(3.605551275463989, 14);
  });
  it('direction = atan2(2, 3) ≈ 0.5880026035475675 rad ≈ 33.690068°', () => {
    expect(d.directionRadians).toBeCloseTo(0.5880026035475675, 15);
    expect(d.directionDegrees).toBeCloseTo(33.69006752597979, 11);
  });
  it('exact magnitude is √13', () => {
    expect(d.exactMagnitude).toEqual({ coefficient: 1n, radicand: 13n });
    expect(toExactForm(d.exactMagnitude!).text).toBe('√13');
  });
});

describe('the zero vector has magnitude 0 and NO direction (plan §15.4, §19)', () => {
  it('direction is null, not 0', () => {
    const d = deriveVector2({ x: 0, y: 0 });
    expect(d.isZero).toBe(true);
    expect(d.magnitude).toBe(0);
    expect(d.directionRadians).toBeNull();
    expect(d.directionDegrees).toBeNull();
    expect(d.exactMagnitude).toEqual({ coefficient: 0n, radicand: 1n });
  });
  it('negative zero components are still the zero vector', () => {
    expect(deriveVector2({ x: -0, y: -0 }).directionRadians).toBeNull();
    expect(deriveVector2({ x: -0, y: 0 }).isZero).toBe(true);
  });
  it('"zero" is decided from the components, not from magnitude === 0: (1e-200, 1e-200) underflows in x² but HAS a direction', () => {
    const d = deriveVector2({ x: 1e-200, y: 1e-200 });
    expect(d.isZero).toBe(false);
    expect(d.xSquared).toBe(0); // the textbook intermediate underflows…
    expect(d.magnitudeSquared).toBe(0);
    expect(d.magnitude).toBeGreaterThan(0); // …but hypot does not
    expect(relErr(d.magnitude, Math.SQRT2 * 1e-200)).toBeLessThan(1e-15);
    expect(d.directionRadians).toBeCloseTo(Math.PI / 4, 15);
  });
  it('very large components: x² overflows but the magnitude and direction are finite and right', () => {
    const d = deriveVector2({ x: 1e200, y: 1e200 });
    expect(d.magnitudeSquared).toBe(Infinity);
    expect(Number.isFinite(d.magnitude)).toBe(true);
    expect(relErr(d.magnitude, Math.SQRT2 * 1e200)).toBeLessThan(1e-15);
    expect(d.directionRadians).toBeCloseTo(Math.PI / 4, 15);
    expect(d.exactMagnitude).toBeNull();
  });
});

describe('direction is quadrant-aware (atan2) with a stable branch cut', () => {
  const dir = (x: number, y: number) => deriveVector2({ x, y }).directionRadians!;
  it('axis-aligned vectors', () => {
    expect(dir(5, 0)).toBe(0);
    expect(dir(0, 5)).toBeCloseTo(Math.PI / 2, 15);
    expect(dir(-5, 0)).toBeCloseTo(Math.PI, 15);
    expect(dir(0, -5)).toBeCloseTo(-Math.PI / 2, 15);
  });
  it('all four quadrants, relative to the reference angle atan(2/3)', () => {
    const a = Math.atan(2 / 3);
    expect(dir(3, 2)).toBeCloseTo(a, 15);
    expect(dir(-3, 2)).toBeCloseTo(Math.PI - a, 15);
    expect(dir(-3, -2)).toBeCloseTo(-(Math.PI - a), 15);
    expect(dir(3, -2)).toBeCloseTo(-a, 15);
  });
  it('the negative x-axis is +π whichever zero sign the y component carries', () => {
    expect(dir(-1, 0)).toBe(Math.PI);
    expect(dir(-1, -0)).toBe(Math.PI); // raw Math.atan2(-0, -1) would be −π
  });
  it('is always in (−π, π]', () => {
    const rnd = mulberry32(7);
    for (let i = 0; i < 2000; i++) {
      const t = deriveVector2({ x: (rnd() - 0.5) * 20, y: (rnd() - 0.5) * 20 }).directionRadians!;
      expect(t).toBeGreaterThan(-Math.PI);
      expect(t).toBeLessThanOrEqual(Math.PI);
    }
  });
});

describe('invalid input is an error, not a silent NaN', () => {
  it('throws on non-finite components', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => deriveVector2({ x: bad, y: 1 })).toThrow(RangeError);
      expect(() => deriveVector2({ x: 1, y: bad })).toThrow(RangeError);
    }
  });
});

describe('exact magnitude a·√b (b square-free) for integer vectors', () => {
  const text = (x: number, y: number) => {
    const r = exactMagnitude(x, y);
    return r === null ? null : toExactForm(r).text;
  };
  it('matches hand-computed values', () => {
    expect(text(3, 4)).toBe('5');
    expect(text(1, 1)).toBe('√2');
    expect(text(2, 2)).toBe('2√2'); // √8
    expect(text(4, 4)).toBe('4√2'); // √32
    expect(text(1, 2)).toBe('√5');
    expect(text(3, 6)).toBe('3√5'); // √45
    expect(text(7, 1)).toBe('5√2'); // √50
    expect(text(12, 16)).toBe('20');
    expect(text(0, -3)).toBe('3');
    expect(text(6, 0)).toBe('6');
    expect(text(-3, -2)).toBe('√13');
  });
  it('is null when either component is not an integer (no exactness is claimed)', () => {
    expect(exactMagnitude(0.5, 0.5)).toBeNull();
    expect(exactMagnitude(2.5, 0)).toBeNull();
    expect(exactMagnitude(1e200, 0)).toBeNull();
  });
  it('is not attempted beyond the stated limit', () => {
    expect(EXACT_RADICAND_LIMIT).toBe(10n ** 12n);
    expect(exactMagnitude(1_000_000, 1_000_000)).toBeNull(); // 2·10¹² > 10¹²
    expect(exactMagnitude(999_999, 0)).toEqual({ coefficient: 999_999n, radicand: 1n });
  });
  it('invariants on every integer pair in [−15, 15]²: a²·b = x²+y², b is square-free, and a√b ≈ hypot', () => {
    for (let x = -15; x <= 15; x++) {
      for (let y = -15; y <= 15; y++) {
        const r = exactMagnitude(x, y)!;
        const n = BigInt(x * x + y * y);
        expect(r.coefficient * r.coefficient * r.radicand).toBe(n);
        for (let p = 2n; p * p <= r.radicand; p++) expect(r.radicand % (p * p), `(${x},${y}) b=${r.radicand} p=${p}`).not.toBe(0n);
        expect(relErr(Number(r.coefficient) * Math.sqrt(Number(r.radicand)), Math.hypot(x, y))).toBeLessThan(1e-15);
      }
    }
  });
  it('integer results are flagged integer; radicals are flagged irrational', () => {
    expect(toExactForm({ coefficient: 5n, radicand: 1n })).toMatchObject({ integer: true, irrational: false });
    expect(toExactForm({ coefficient: 2n, radicand: 5n })).toMatchObject({ integer: false, irrational: true, tex: '2\\sqrt{5}' });
    expect(toExactForm({ coefficient: 1n, radicand: 13n }).tex).toBe('\\sqrt{13}');
  });
});

describe('invariants (plan §12.4, §15.8) on 3000 seeded random vectors', () => {
  const rnd = mulberry32(20261010);
  const vectors = Array.from({ length: 3000 }, () => ({ x: (rnd() - 0.5) * 24, y: (rnd() - 0.5) * 24 }));
  it('‖v‖ ≥ 0 and ‖v‖² ≈ x² + y²', () => {
    for (const v of vectors) {
      const d = deriveVector2(v);
      expect(d.magnitude).toBeGreaterThanOrEqual(0);
      expect(relErr(d.magnitude * d.magnitude, d.magnitudeSquared)).toBeLessThan(1e-14);
    }
  });
  it('‖αv‖ ≈ |α|·‖v‖ for positive and negative α', () => {
    for (const [i, v] of vectors.entries()) {
      const alpha = (rnd() - 0.5) * 10 || 1;
      const scaled = deriveVector2({ x: alpha * v.x, y: alpha * v.y });
      expect(relErr(scaled.magnitude, Math.abs(alpha) * deriveVector2(v).magnitude), `case ${i}`).toBeLessThan(1e-14);
    }
  });
  it('scaling by α > 0 preserves direction; α < 0 reverses it (differs by π)', () => {
    for (const v of vectors.slice(0, 1000)) {
      const alpha = rnd() * 5 + 0.1;
      const base = deriveVector2(v).directionRadians!;
      expect(Math.abs(angleDiff(deriveVector2({ x: alpha * v.x, y: alpha * v.y }).directionRadians!, base))).toBeLessThan(1e-14);
      expect(Math.abs(Math.abs(angleDiff(deriveVector2({ x: -alpha * v.x, y: -alpha * v.y }).directionRadians!, base)) - Math.PI)).toBeLessThan(1e-14);
    }
  });
  it('rotation by φ preserves magnitude and adds φ to the direction', () => {
    for (const v of vectors.slice(0, 1000)) {
      const phi = (rnd() - 0.5) * 2 * Math.PI;
      const rotated = deriveVector2({ x: v.x * Math.cos(phi) - v.y * Math.sin(phi), y: v.x * Math.sin(phi) + v.y * Math.cos(phi) });
      const d = deriveVector2(v);
      expect(relErr(rotated.magnitude, d.magnitude)).toBeLessThan(1e-13);
      expect(Math.abs(angleDiff(rotated.directionRadians!, d.directionRadians! + phi))).toBeLessThan(1e-12);
    }
  });
});
