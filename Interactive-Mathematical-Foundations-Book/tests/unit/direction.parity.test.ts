/**
 * TypeScript ⇄ Python oracle parity for direction and placement (master plan §9.4, §12.3).
 * Inputs AND expected values come from `fixtures/vector2-direction.fixtures.json`, written by `oracle/direction_oracle.py`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareDirections, type DirectionLocation } from '../../src/math/vector2/direction';
import { derivePlacement } from '../../src/math/vector2/placement';

type Num = number | 'Infinity' | '-Infinity' | null;
interface DirectionCase {
  id: string;
  tags: string[];
  input: { x: number; y: number };
  expected: { location: string; mirror: { x: number; y: number }; atan2Radians: number | null; ratio: Num; naiveRadians: number | null; halfTurns: number | null; naiveIsCorrect: boolean | null };
}
interface PlacementCase {
  id: string;
  input: { tx: number; ty: number; vx: number; vy: number };
  expected: { tip: { x: number; y: number }; measured: { x: number; y: number } };
}
interface Fixture {
  schema: string;
  tolerance: { ratio: number; naiveRadians: number; atan2Radians: number; placement: number };
  direction: DirectionCase[];
  placement: PlacementCase[];
}
const fixture = JSON.parse(readFileSync('fixtures/vector2-direction.fixtures.json', 'utf8')) as Fixture;

const view = new DataView(new ArrayBuffer(8));
function ordered(x: number): bigint {
  view.setFloat64(0, x);
  const bits = view.getBigInt64(0);
  return bits < 0n ? -(bits & 0x7fffffffffffffffn) : bits;
}
const ulps = (a: number, b: number): number => Number(ordered(a) > ordered(b) ? ordered(a) - ordered(b) : ordered(b) - ordered(a));
const worst = { ratio: 0, naiveRadians: 0, atan2Radians: 0 };

const locationName = (l: DirectionLocation): string => (l.kind === 'origin' ? 'origin' : l.kind === 'quadrant' ? l.quadrant : l.axis);
const decodeRatio = (r: Num): number | null => (r === 'Infinity' ? Infinity : r === '-Infinity' ? -Infinity : r);

describe('fixture sanity', () => {
  it('has the expected schema and covers every family of cases', () => {
    expect(fixture.schema).toBe('book2.vector2.direction.fixtures/1');
    expect(fixture.direction.length).toBeGreaterThan(150);
    expect(fixture.placement.length).toBeGreaterThan(100);
    const tags = new Set(fixture.direction.flatMap(c => c.tags));
    for (const t of ['quadrant', 'axis', 'zero-vector', 'negative-zero', 'branch-cut', 'ratio-undefined', 'ratio-overflows', 'ratio-underflows', 'tiny', 'large', 'grid', 'random']) expect(tags.has(t), t).toBe(true);
    expect(fixture.direction.find(c => c.id === 'quadrant_2')?.expected.halfTurns).toBe(1);
  });
});

describe('direction comparison ⇄ Python oracle', () => {
  for (const c of fixture.direction) {
    it(c.id, () => {
      const got = compareDirections(c.input);
      const e = c.expected;
      expect(locationName(got.location)).toBe(e.location);
      expect(got.mirror).toEqual(e.mirror);
      // undefined must be null, never a fabricated number
      expect(got.ratio === null).toBe(e.ratio === null);
      expect(got.naiveRadians === null).toBe(e.naiveRadians === null);
      expect(got.atan2Radians === null).toBe(e.atan2Radians === null);
      expect(got.halfTurns).toBe(e.halfTurns);
      expect(got.naiveIsCorrect).toBe(e.naiveIsCorrect);
      if (e.ratio !== null) { const u = decodeRatio(e.ratio) === got.ratio ? 0 : ulps(got.ratio!, decodeRatio(e.ratio)!); worst.ratio = Math.max(worst.ratio, u); expect(u).toBeLessThanOrEqual(fixture.tolerance.ratio); }
      if (e.naiveRadians !== null) { const u = ulps(got.naiveRadians!, e.naiveRadians); worst.naiveRadians = Math.max(worst.naiveRadians, u); expect(u).toBeLessThanOrEqual(fixture.tolerance.naiveRadians); }
      if (e.atan2Radians !== null) { const u = ulps(got.atan2Radians!, e.atan2Radians); worst.atan2Radians = Math.max(worst.atan2Radians, u); expect(u).toBeLessThanOrEqual(fixture.tolerance.atan2Radians); }
    });
  }
  it('reports the largest ulp error observed (the tolerances are not arbitrary)', () => {
    console.info('direction: max observed ulp error vs oracle:', JSON.stringify(worst), 'tolerances:', JSON.stringify(fixture.tolerance));
    expect(worst.ratio).toBe(0);
  });
});

describe('placement ⇄ Python oracle (exact decimal arithmetic)', () => {
  for (const c of fixture.placement) {
    it(c.id, () => {
      const d = derivePlacement(c.input);
      expect(d.tip).toEqual(c.expected.tip);
      expect(d.measured).toEqual(c.expected.measured);
      expect(Object.is(d.tip.x, -0) || Object.is(d.tip.y, -0)).toBe(false);
    });
  }
});
