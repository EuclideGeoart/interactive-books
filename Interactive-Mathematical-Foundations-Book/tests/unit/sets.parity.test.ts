/**
 * TypeScript ⇄ Python oracle parity for sets, intervals, products and relations (chapter I.7; master plan §9.4, §12.3).
 * Inputs AND expected values come from `fixtures/sets.fixtures.json`, written by `oracle/sets_oracle.py`, which uses Python's own set
 * operators, an elementary-cell decomposition for intervals (no sorting and merging), `itertools.product`, and all()-style property
 * checks — not the bit masks, normalisation or witness searches of the model. Every claim here is exact: no tolerances.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rat, type Rat } from '../../src/math/families/rational';
import { deriveSets, maskOf, type SetOp } from '../../src/math/sets/finite';
import { complement, contains, fromSpec, intersect, setText, union, type Endpoint, type IntervalSet, type IntervalSpec } from '../../src/math/sets/intervals';
import { deriveProduct, productMask } from '../../src/math/sets/product';
import { cellIndex, deriveRelation, type PresetId } from '../../src/math/sets/relations';

type Piece = { lo: string | null; hi: string | null; loClosed: boolean; hiClosed: boolean };
type Pieces = { pieces: Piece[]; text: string };
interface Fixture {
  schema: string;
  finite: { a: number[]; b: number[]; expected: Record<string, number[] | boolean | number | null> }[];
  intervals: { id: string; a: Piece; b: Piece; expected: Record<string, Pieces | boolean> }[];
  membership: { id: string; a: Piece; b: Piece; x: string; inA: boolean; inB: boolean; inUnion: boolean; inIntersection: boolean }[];
  floatPitfall: Record<string, number | boolean | string>;
  products: { a: number[]; b: number[]; expected: { count: number; pairs: number[][]; reversed: number[][]; commutes: boolean; theorem: boolean; witnessExists: boolean } }[];
  relations: { id: string; n: number; k: number; pairs: number[][]; expected: Record<string, unknown> }[];
}
const fixture = JSON.parse(readFileSync('fixtures/sets.fixtures.json', 'utf8')) as Fixture;

const parse = (text: string): Rat => { const [n, d] = text.split('/'); return rat(BigInt(n!), BigInt(d!)); };
const endpoint = (text: string | null): Endpoint => (text === null ? null : parse(text));
const toSpec = (p: Piece): IntervalSpec => ({ lo: endpoint(p.lo), hi: endpoint(p.hi), loClosed: p.loClosed, hiClosed: p.hiClosed });
const encode = (s: IntervalSet): Piece[] => s.map(p => ({
  lo: p.lo === null ? null : `${p.lo.num}/${p.lo.den}`, hi: p.hi === null ? null : `${p.hi.num}/${p.hi.den}`, loClosed: p.loClosed, hiClosed: p.hiClosed,
}));
const sorted = (pairs: readonly (readonly number[])[]) => pairs.map(p => [...p]).sort((x, y) => x[0]! - y[0]! || x[1]! - y[1]!);

describe('fixture', () => {
  it('has the expected schema and a useful number of cases', () => {
    expect(fixture.schema).toBe('book2.sets.fixtures/1');
    expect(fixture.finite.length).toBeGreaterThanOrEqual(60);
    expect(fixture.intervals.length).toBeGreaterThanOrEqual(90);
    expect(fixture.membership.length).toBeGreaterThanOrEqual(60);
    expect(fixture.products.length).toBeGreaterThanOrEqual(40);
    expect(fixture.relations.length).toBeGreaterThanOrEqual(100);
  });
});

describe('finite sets: the model agrees with Python frozensets', () => {
  for (const [i, c] of fixture.finite.entries()) {
    it(`case ${i}: A = {${c.a.join(',')}}, B = {${c.b.join(',')}}`, () => {
      const d = deriveSets({ a: maskOf(c.a), b: maskOf(c.b), op: 'union' });
      const e = c.expected;
      expect(d.union).toEqual(e.union);
      expect(d.intersection).toEqual(e.intersection);
      expect(d.aMinusB).toEqual(e.aMinusB);
      expect(d.bMinusA).toEqual(e.bMinusA);
      expect(d.symmetric).toEqual(e.symmetric);
      expect(d.complementA).toEqual(e.complementA);
      expect(d.complementB).toEqual(e.complementB);
      expect(d.regions).toEqual({ onlyA: e.onlyA, both: e.both, onlyB: e.onlyB, neither: e.neither });
      expect(d.subsetAB.holds).toBe(e.subsetAB);
      expect(d.subsetBA.holds).toBe(e.subsetBA);
      expect(d.subsetAB.witness).toBe(e.witnessAB);
      expect(d.subsetBA.witness).toBe(e.witnessBA);
      expect(d.properSubsetAB).toBe(e.properSubsetAB);
      expect(d.properSubsetBA).toBe(e.properSubsetBA);
      expect(d.equal).toBe(e.equal);
      expect(d.disjoint).toBe(e.disjoint);
      expect(d.inclusionExclusion.holds).toBe(e.inclusionExclusion);
      expect(d.deMorgan.firstHolds).toBe(e.deMorganFirst);
      expect(d.deMorgan.secondHolds).toBe(e.deMorganSecond);
      const ops: [SetOp, string][] = [['union', 'union'], ['intersection', 'intersection'], ['a-minus-b', 'aMinusB'], ['b-minus-a', 'bMinusA'], ['symmetric', 'symmetric'], ['complement-a', 'complementA'], ['complement-b', 'complementB']];
      for (const [op, key] of ops) expect(deriveSets({ a: maskOf(c.a), b: maskOf(c.b), op }).selected).toEqual(e[key]);
    });
  }
});

describe('intervals: the model agrees with the elementary-cell decomposition', () => {
  for (const c of fixture.intervals) {
    it(c.id, () => {
      const a = fromSpec(toSpec(c.a));
      const b = fromSpec(toSpec(c.b));
      const e = c.expected as Record<string, Pieces>;
      const check = (got: IntervalSet, want: Pieces) => {
        expect(encode(got)).toEqual(want.pieces);
        expect(setText(got)).toBe(want.text);
      };
      check(a, e.a!);
      check(b, e.b!);
      check(union(a, b), e.union!);
      check(intersect(a, b), e.intersection!);
      check(intersect(a, complement(b)), e['a-minus-b']!);
      check(complement(a), e['complement-a']!);
      check(complement(b), e['complement-b']!);
      expect(a.length === 0).toBe(c.expected.emptyA);
      expect(b.length === 0).toBe(c.expected.emptyB);
    });
  }
});

describe('interval membership: exact rationals, decided from the raw inequalities in Python', () => {
  for (const m of fixture.membership) {
    it(m.id, () => {
      const a = fromSpec(toSpec(m.a));
      const b = fromSpec(toSpec(m.b));
      const x = parse(m.x);
      expect(contains(a, x)).toBe(m.inA);
      expect(contains(b, x)).toBe(m.inB);
      expect(contains(union(a, b), x)).toBe(m.inUnion);
      expect(contains(intersect(a, b), x)).toBe(m.inIntersection);
    });
  }
});

describe('the floating-point pitfall', () => {
  it('doubles: 0.1 + 0.2 is not 0.3; exact rationals: it is', () => {
    const p = fixture.floatPitfall;
    expect(0.1 + 0.2).toBe(p.doubleSum);
    expect(0.1 + 0.2 === 0.3).toBe(p.doubleSumEqualsPointThree);
    expect(0.3 <= 0.1 + 0.2 && 0.1 + 0.2 <= 0.3).toBe(p.closedIntervalContainsDoubleSum);
    const point = fromSpec({ lo: parse('3/10'), hi: parse('3/10'), loClosed: true, hiClosed: true });
    const exactSum = rat(1n, 10n);
    const sum = rat(exactSum.num * 5n + 1n * exactSum.den, exactSum.den * 5n); // 1/10 + 1/5
    expect(`${sum.num}/${sum.den}`).toBe(p.exactSum);
    expect(contains(point, sum)).toBe(p.closedIntervalContainsExactSum);
  });
});

describe('products agree with itertools.product', () => {
  for (const [i, c] of fixture.products.entries()) {
    it(`case ${i}: A = {${c.a.join(',')}}, B = {${c.b.join(',')}}`, () => {
      const d = deriveProduct({ a: productMask(c.a), b: productMask(c.b) });
      expect(d.pairs).toHaveLength(c.expected.count);
      expect(d.count.product).toBe(c.expected.count);
      expect(sorted(d.pairs)).toEqual(c.expected.pairs);
      expect(sorted(d.reversed)).toEqual(c.expected.reversed);
      expect(d.commutes).toBe(c.expected.commutes);
      expect(d.commutesByTheorem).toBe(c.expected.theorem);
      expect(d.witness !== null).toBe(c.expected.witnessExists);
    });
  }
});

describe('relations agree with all()-style property checks', () => {
  for (const c of fixture.relations) {
    it(c.id, () => {
      // build the cell string from the pair list with the model's own index convention, so the convention is part of what is tested
      const cells = Array.from({ length: c.n * c.k }, () => '0');
      for (const [a, b] of c.pairs) cells[cellIndex(c.n, a!, b!)] = '1';
      const d = deriveRelation({ n: c.n, k: c.k, cells: cells.join('') });
      const e = c.expected as {
        size: number; presets: PresetId[]; pairs: number[][]; isFunction: boolean; functionFailure: { a: number; kind: string; images: number[] } | null;
        reflexive: boolean | null; symmetric: boolean | null; antisymmetric: boolean | null; transitive: boolean | null; equivalence: boolean | null; classes: number[][] | null;
      };
      expect(d.size).toBe(e.size);
      expect(sorted(d.pairs)).toEqual(e.pairs);
      if (e.presets.length === 0) expect(d.preset).toBeNull();
      else expect(e.presets).toContain(d.preset);
      expect(d.function.isFunction).toBe(e.isFunction);
      expect(d.function.failure === null ? null : { a: d.function.failure.a, kind: d.function.failure.kind, images: [...d.function.failure.images] }).toEqual(e.functionFailure);
      expect(d.reflexive?.holds ?? null).toBe(e.reflexive);
      expect(d.symmetric?.holds ?? null).toBe(e.symmetric);
      expect(d.antisymmetric?.holds ?? null).toBe(e.antisymmetric);
      expect(d.transitive?.holds ?? null).toBe(e.transitive);
      expect(d.equivalence).toBe(e.equivalence);
      expect(d.classes === null ? null : d.classes.map(cl => [...cl])).toEqual(e.classes);
    });
  }
});
