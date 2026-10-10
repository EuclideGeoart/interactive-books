/**
 * TypeScript ⇄ Python oracle parity (master plan §9.4, §12.3).
 *
 * The inputs AND the expected values come from `fixtures/vector2.fixtures.json`, written by the independent
 * Python oracle (`oracle/vector2_oracle.py`). Nothing here recomputes an expected value with the code under test.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXACT_RADICAND_LIMIT, toExactForm } from '../../src/math/vector2/exact';
import { deriveVector2 } from '../../src/math/vector2/vector2';

interface Case {
  id: string;
  tags: string[];
  input: { x: number; y: number };
  expected: {
    isZero: boolean;
    magnitude: number | null;
    magnitudeStatus: 'finite' | 'overflow';
    magnitudeSquared: number | null;
    magnitudeSquaredStatus?: 'overflow';
    magnitudeSquaredExact: string | null;
    directionRadians: number | null;
    directionDegrees: number | null;
    exact: { coefficient: string; radicand: string; text: string; tex: string } | null;
  };
}
interface Fixture {
  schema: string;
  exactRadicandLimit: string;
  tolerance: { magnitude: number; magnitudeSquared: number; directionRadians: number; directionDegrees: number };
  cases: Case[];
}

const fixture = JSON.parse(readFileSync('fixtures/vector2.fixtures.json', 'utf8')) as Fixture;

const view = new DataView(new ArrayBuffer(8));
/** Map a double onto an integer line on which neighbouring doubles differ by exactly 1. */
function ordered(x: number): bigint {
  view.setFloat64(0, x);
  const bits = view.getBigInt64(0);
  return bits < 0n ? -(bits & 0x7fffffffffffffffn) : bits;
}
const ulps = (a: number, b: number): number => Number(ordered(a) > ordered(b) ? ordered(a) - ordered(b) : ordered(b) - ordered(a));

const worst = { magnitude: 0, magnitudeSquared: 0, directionRadians: 0, directionDegrees: 0 };
const note = (key: keyof typeof worst, d: number) => { worst[key] = Math.max(worst[key], d); };

describe('fixture sanity', () => {
  it('has the expected schema, plan example, and coverage of every edge-case family', () => {
    expect(fixture.schema).toBe('book2.vector2.fixtures/1');
    expect(fixture.cases.length).toBeGreaterThan(250);
    const tags = new Set(fixture.cases.flatMap(c => c.tags));
    for (const required of ['plan-9.4', 'zero-vector', 'negative-zero', 'axis', 'quadrant', 'branch-cut', 'exact-integer', 'exact-irrational', 'numeric-only', 'tiny', 'large', 'underflow-in-square', 'overflow-in-square', 'overflow-in-magnitude', 'random'])
      expect(tags.has(required), required).toBe(true);
    expect(fixture.cases.find(c => c.id === 'canonical_3_2')?.expected.magnitude).toBe(3.605551275463989); // plan §9.4 literal
  });
  it('TypeScript and Python agree on the exact-form attempt limit', () => {
    expect(EXACT_RADICAND_LIMIT.toString()).toBe(fixture.exactRadicandLimit);
  });
});

describe('Vector2 model ⇄ Python oracle', () => {
  for (const c of fixture.cases) {
    it(c.id, () => {
      const d = deriveVector2(c.input);
      const e = c.expected;
      expect(d.isZero).toBe(e.isZero);

      // magnitude
      if (e.magnitudeStatus === 'overflow') expect(d.magnitude).toBe(Infinity);
      else { const u = ulps(d.magnitude, e.magnitude!); note('magnitude', u); expect(u).toBeLessThanOrEqual(fixture.tolerance.magnitude); }

      // x² + y² as the textbook formula computes it
      if (e.magnitudeSquared === null) expect(d.magnitudeSquared).toBe(Infinity);
      else { const u = ulps(d.magnitudeSquared, e.magnitudeSquared); note('magnitudeSquared', u); expect(u).toBeLessThanOrEqual(fixture.tolerance.magnitudeSquared); }
      if (e.magnitudeSquaredExact !== null) expect(BigInt(d.x) ** 2n + BigInt(d.y) ** 2n).toBe(BigInt(e.magnitudeSquaredExact));

      // direction: null must be null (undefined is not 0)
      if (e.directionRadians === null) { expect(d.directionRadians).toBeNull(); expect(d.directionDegrees).toBeNull(); }
      else {
        const ur = ulps(d.directionRadians!, e.directionRadians); note('directionRadians', ur);
        expect(ur).toBeLessThanOrEqual(fixture.tolerance.directionRadians);
        const ud = ulps(d.directionDegrees!, e.directionDegrees!); note('directionDegrees', ud);
        expect(ud).toBeLessThanOrEqual(fixture.tolerance.directionDegrees);
      }

      // exact forms must match EXACTLY (not within a tolerance)
      if (e.exact === null) expect(d.exactMagnitude).toBeNull();
      else {
        expect(d.exactMagnitude).not.toBeNull();
        expect(d.exactMagnitude!.coefficient.toString()).toBe(e.exact.coefficient);
        expect(d.exactMagnitude!.radicand.toString()).toBe(e.exact.radicand);
        const form = toExactForm(d.exactMagnitude!);
        expect(form.text).toBe(e.exact.text);
        expect(form.tex).toBe(e.exact.tex);
      }
    });
  }

  it('reports the largest ulp error observed across the fixture (documents that the tolerances are not arbitrary)', () => {
    console.info('max observed ulp error vs oracle:', JSON.stringify(worst), 'tolerances:', JSON.stringify(fixture.tolerance));
    expect(worst.magnitude).toBeLessThanOrEqual(fixture.tolerance.magnitude);
  });
});
