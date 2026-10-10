/**
 * TypeScript ⇄ Python oracle parity for I.2 (points and quadrants, the number line, distance and midpoint between two points, the
 * image-array (row, col) convention). Inputs AND expected values come from `fixtures/coordinates.fixtures.json`, written by
 * `oracle/coordinates_oracle.py` (see its docstring for how it differs: sign-pair table, factorisation-based roots, math.dist, a labelled
 * and flipped array). Exact values, positions and indices must match exactly; the double of a distance within the stated ulps.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deriveLine } from '../../src/math/coordinates/numberline';
import { derivePixel } from '../../src/math/coordinates/pixel';
import { derivePoint, type Position } from '../../src/math/coordinates/point';
import { deriveSegment } from '../../src/math/coordinates/segment';
import { parseDecimal, rational, type Rational } from '../../src/math/quantity/rational';
import type { RootResult } from '../../src/math/quantity/root';

interface RadicalExpected { kind: string; a?: string; b?: string; c?: string; rational?: boolean; approx?: number }
interface Fixture {
  schema: string;
  tolerance: { approxSqrt: number };
  points: { id: string; tags: string[]; input: { x: string; y: string }; expected: { position: string; distToYAxis: string; distToXAxis: string; distSq: string; distance: RadicalExpected } }[];
  lines: { id: string; tags: string[]; input: { a: string; b: string }; expected: { forward: string; backward: string; distance: string; midpoint: string; order: string; viaZero: string; viaZeroEqualsDistance: boolean; sameSide: boolean } }[];
  segments: { id: string; tags: string[]; input: { ax: string; ay: string; bx: string; by: string }; expected: { dx: string; dy: string; rdx: string; rdy: string; distSq: string; distance: RadicalExpected; midpoint: [string, string]; taxicab: string; crossTerm: string; kind: string; taxicabEqualsDistance: boolean } }[];
  pixels: { id: string; tags: string[]; input: { w: number; h: number; x: number; y: number }; expected: { row: number; col: number; index: number; naiveRow: number; naiveRowInRange: boolean; swappedInRange: boolean } }[];
}
const fixture = JSON.parse(readFileSync('fixtures/coordinates.fixtures.json', 'utf8')) as Fixture;

const view = new DataView(new ArrayBuffer(8));
function ordered(x: number): bigint {
  view.setFloat64(0, x);
  const bits = view.getBigInt64(0);
  return bits < 0n ? -(bits & 0x7fffffffffffffffn) : bits;
}
const ulps = (a: number, b: number): number => (a === b ? 0 : Number(ordered(a) > ordered(b) ? ordered(a) - ordered(b) : ordered(b) - ordered(a)));

/** "8/9" or a decimal string, exactly. */
function exactOf(text: string): Rational {
  if (text.includes('/')) { const [n, d] = text.split('/'); return rational(BigInt(n!), BigInt(d!)); }
  return parseDecimal(text)!;
}
const same = (r: Rational, text: string) => expect(`${r.num}/${r.den}`).toBe(`${exactOf(text).num}/${exactOf(text).den}`);
const num = (text: string): number => Number(text);

const POSITION: Record<string, Position> = {
  Q1: { kind: 'quadrant', index: 1 }, Q2: { kind: 'quadrant', index: 2 }, Q3: { kind: 'quadrant', index: 3 }, Q4: { kind: 'quadrant', index: 4 },
  'axis-x': { kind: 'axis-x' }, 'axis-y': { kind: 'axis-y' }, origin: { kind: 'origin' },
};

function sameRadical(res: RootResult, expected: RadicalExpected) {
  expect(res.kind).toBe(expected.kind);
  if (res.kind !== 'exact') return;
  expect(String(res.root.a)).toBe(expected.a);
  expect(String(res.root.b)).toBe(expected.b);
  expect(String(res.root.c)).toBe(expected.c);
  expect(res.root.b === 1n).toBe(expected.rational);
  expect(ulps(res.approx, expected.approx!)).toBeLessThanOrEqual(fixture.tolerance.approxSqrt);
}

describe('fixture sanity', () => {
  it('has the expected schema and covers every family of cases', () => {
    expect(fixture.schema).toBe('book2.coordinates.fixtures/1');
    expect(fixture.points.length).toBeGreaterThan(400);
    expect(fixture.lines.length).toBeGreaterThan(200);
    expect(fixture.segments.length).toBeGreaterThan(250);
    expect(fixture.pixels.length).toBeGreaterThan(100);
    expect(new Set(fixture.points.map(c => c.expected.position))).toEqual(new Set(Object.keys(POSITION)));
    expect(new Set(fixture.segments.map(c => c.expected.kind))).toEqual(new Set(['coincident', 'horizontal', 'vertical', 'oblique']));
    expect(fixture.segments.some(c => c.expected.distance.rational)).toBe(true);
    expect(fixture.segments.some(c => !c.expected.distance.rational)).toBe(true);
    expect(fixture.lines.some(c => c.expected.viaZeroEqualsDistance)).toBe(true);
    expect(fixture.lines.some(c => !c.expected.viaZeroEqualsDistance)).toBe(true);
    expect(fixture.pixels.some(c => !c.expected.naiveRowInRange)).toBe(true);
    expect(fixture.pixels.some(c => !c.expected.swappedInRange)).toBe(true);
  });
});

describe('points: quadrant, distances to the axes, distance to the origin ⇄ Python oracle', () => {
  for (const c of fixture.points) {
    it(c.id, () => {
      const p = derivePoint({ x: num(c.input.x), y: num(c.input.y) });
      expect(p.position).toEqual(POSITION[c.expected.position]);
      same(p.distToYAxis, c.expected.distToYAxis);
      same(p.distToXAxis, c.expected.distToXAxis);
      same(p.distSq, c.expected.distSq);
      sameRadical(p.distance, c.expected.distance);
    });
  }
});

describe('number line: differences, distance, midpoint ⇄ Python oracle', () => {
  for (const c of fixture.lines) {
    it(c.id, () => {
      const l = deriveLine({ a: num(c.input.a), b: num(c.input.b) });
      same(l.forward, c.expected.forward);
      same(l.backward, c.expected.backward);
      same(l.distance, c.expected.distance);
      same(l.midpoint, c.expected.midpoint);
      same(l.viaZero, c.expected.viaZero);
      expect(l.order).toBe(c.expected.order);
      expect(l.viaZeroEqualsDistance).toBe(c.expected.viaZeroEqualsDistance);
      expect(l.sameSide).toBe(c.expected.sameSide);
    });
  }
});

describe('two points: displacement, distance, midpoint, taxicab ⇄ Python oracle', () => {
  for (const c of fixture.segments) {
    it(c.id, () => {
      const s = deriveSegment({ ax: num(c.input.ax), ay: num(c.input.ay), bx: num(c.input.bx), by: num(c.input.by) });
      same(s.dx, c.expected.dx);
      same(s.dy, c.expected.dy);
      same(s.rdx, c.expected.rdx);
      same(s.rdy, c.expected.rdy);
      same(s.distSq, c.expected.distSq);
      sameRadical(s.distance, c.expected.distance);
      same(s.midpoint.x, c.expected.midpoint[0]);
      same(s.midpoint.y, c.expected.midpoint[1]);
      same(s.taxicab, c.expected.taxicab);
      same(s.crossTerm, c.expected.crossTerm);
      expect(s.kind).toBe(c.expected.kind);
      expect(s.taxicabEqualsDistance).toBe(c.expected.taxicabEqualsDistance);
      expect(s.distanceIsRational).toBe(Boolean(c.expected.distance.rational));
    });
  }
});

describe('pixels: (x, y) ⇄ (row, col) ⇄ flat index ⇄ Python oracle (labelled, flipped array)', () => {
  for (const c of fixture.pixels) {
    it(c.id, () => {
      const p = derivePixel(c.input);
      expect({ row: p.row, col: p.col, index: p.index, naiveRow: p.naiveRow, naiveRowInRange: p.naiveRowInRange, swappedInRange: p.swappedInRange }).toEqual(c.expected);
      expect(p.roundTrip).toBe(true);
    });
  }
});
