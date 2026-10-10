/**
 * TypeScript ⇄ Python oracle parity for indexed sums (chapter I.8; master plan §9.4, §12.3).
 * Inputs AND expected values come from `fixtures/summation.fixtures.json`, written by `oracle/summation_oracle.py`, which evaluates the Python
 * term expressions with `eval` (so the exceptions are Python's own), sums with `sum` and `itertools.accumulate`, derives closed forms by
 * Faulhaber's formula with Bernoulli numbers, pairs terms with `zip`, orders nested cells with `sorted(key=…)`, and runs the five loops with
 * `exec`. Every claim here is exact: no tolerances.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { form, q, type Q } from '../../src/math/summation/rational';
import { SEQ_INFO, prefix, type SeqId, type SeqParams } from '../../src/math/summation/sequences';
import { deriveIdentities, deriveSum, deriveVariants, gauss, type VariantId } from '../../src/math/summation/sum';
import { deriveNested, type NestedKind, type NestedOrder, type NestedRule } from '../../src/math/summation/nested';

interface SumCase {
  seq: SeqId; r: string; list: string[]; m: number; n: number;
  expected: {
    count: number; empty: boolean; terms: (string | null)[]; partials: string[];
    failure: { i: number; python: string } | null; total: string | null; closed: string | null; closedMatches: boolean | null;
  };
}
interface Fixture {
  schema: string;
  expressions: Record<string, string>;
  sums: SumCase[];
  prefix: { seq: SeqId; k: number; value: string }[];
  gauss: { seq: SeqId; m: number; n: number; expected: { pairs: [number, number, string][]; pairSum: string; allEqual: boolean; middle: [number, string] | null; total: string; totalByGauss: string } }[];
  identities: { m: number; n: number; c: number; k: number; expected: Record<string, string | boolean> }[];
  variants: { seq: SeqId; m: number; n: number; expected: { correct: string; variants: Record<VariantId, { total: string | null; error: string | null; difference: string | null }> } }[];
  nested: {
    kind: NestedKind; rule: NestedRule; order: NestedOrder; n: number; k: number;
    expected: { cols: number; cells: [number, number][]; cellCount: number; partials: number[]; total: number; rowSums: number[]; colSums: number[]; swapMistake: { cells: number; total: number; differs: boolean } | null; closed: number | null };
  }[];
}
const fixture = JSON.parse(readFileSync('fixtures/summation.fixtures.json', 'utf8')) as Fixture;

const parse = (text: string): Q => { const [a, b] = text.split('/'); return q(BigInt(a!), BigInt(b!)); };
const str = (a: Q | null): string | null => (a === null ? null : `${a.num}/${a.den}`);
const paramsOf = (c: SumCase): SeqParams => ({ r: parse(c.r), list: c.list.map(parse) });

describe('fixture', () => {
  it('has the expected schema and a useful number of cases', () => {
    expect(fixture.schema).toBe('book2.summation.fixtures/1');
    expect(fixture.sums.length).toBeGreaterThanOrEqual(400);
    expect(fixture.prefix.length).toBe(6 * 61);
    expect(fixture.gauss.length).toBeGreaterThanOrEqual(60);
    expect(fixture.identities.length).toBeGreaterThanOrEqual(250);
    expect(fixture.variants.length).toBe(7 * 4 * 5);
    expect(fixture.nested.length).toBe(2 * 3 * 2 * 25);
  });
  it('the Python expression the page shows for each term is the one the oracle evaluated', () => {
    for (const [id, info] of Object.entries(SEQ_INFO)) expect(fixture.expressions[id], id).toBe(info.python);
  });
});

describe('sums agree with sum() over Fractions, and with eval for which terms exist', () => {
  for (const [idx, c] of fixture.sums.entries()) {
    it(`case ${idx}: ${c.seq}, ${c.m} … ${c.n}${c.seq === 'geometric' ? `, r = ${c.r}` : ''}${c.seq === 'list' ? `, a = [${c.list.join(', ')}]` : ''}`, () => {
      const d = deriveSum({ seq: c.seq, params: paramsOf(c), m: c.m, n: c.n });
      const e = c.expected;
      expect(d.count).toBe(e.count);
      expect(d.empty).toBe(e.empty);
      expect(d.rows.map(r => str(r.term))).toEqual(e.terms);
      expect(str(d.total)).toBe(e.total);
      expect(d.frames.filter(f => f.error === null).map(f => str(f.after))).toEqual(e.partials);
      if (e.failure === null) {
        expect(d.failure).toBeNull();
        expect(d.frames).toHaveLength(e.count + 1);
      } else {
        expect(d.failure?.i).toBe(e.failure.i);
        expect(d.frames.at(-1)!.error).not.toBeNull(); // the error frame
        // Python's own outcome: an exception name, or "wraps" when a negative list index silently succeeds
        const got = d.failure!.pythonError;
        if (e.failure.python === 'wraps') expect(got).toMatch(/^no error/);
        else expect(got).toBe(e.failure.python);
      }
      expect(str(d.closed?.applies ? d.closed.value : null)).toBe(e.closed);
      expect(d.closedMatches).toBe(e.closedMatches);
    });
  }
});

describe('prefix sums agree with Faulhaber / Bernoulli', () => {
  for (const c of fixture.prefix) {
    it(`${c.seq} S(${c.k})`, () => expect(str(prefix(c.seq, c.k)!.value)).toBe(c.value));
  }
});

describe('Gauss pairing agrees with zip(terms, reversed(terms))', () => {
  for (const [idx, c] of fixture.gauss.entries()) {
    it(`case ${idx}: ${c.seq}, ${c.m} … ${c.n}`, () => {
      const g = gauss(c.seq, { r: q(1), list: [] }, c.m, c.n)!;
      const e = c.expected;
      expect(g.pairs.map(p => [p.low, p.high, str(p.sum)])).toEqual(e.pairs);
      expect(str(g.pairSum)).toBe(e.pairSum);
      expect(g.middle === null ? null : [g.middle.i, str(g.middle.value)]).toEqual(e.middle);
      expect(str(g.total)).toBe(e.total);
      expect(e.allEqual).toBe(true);
      expect(e.totalByGauss).toBe(e.total);
    });
  }
});

describe('linearity and index shift agree with sum()', () => {
  for (const [idx, c] of fixture.identities.entries()) {
    it(`case ${idx}: ${c.m} … ${c.n}, c = ${c.c}, k = ${c.k}`, () => {
      const d = deriveIdentities(c.m, c.n, c.c, c.k);
      const e = c.expected;
      expect(str(d.linearity.lhs)).toBe(e.lhs);
      expect(str(d.linearity.rhs)).toBe(e.rhs);
      expect(str(d.linearity.sumA)).toBe(e.sumA);
      expect(str(d.linearity.sumB)).toBe(e.sumB);
      expect(d.linearity.holds).toBe(e.linearHolds);
      expect(str(d.shift.original)).toBe(e.original);
      expect(str(d.shift.shifted)).toBe(e.shifted);
      expect(d.shift.holds).toBe(e.shiftHolds);
      expect(str(d.shift.wrong)).toBe(e.wrong);
      expect(str(d.shift.wrongDifference)).toBe(e.wrongDifference);
      expect(d.shift.wrongHolds).toBe(e.wrongHolds);
    });
  }
});

describe('the five loops agree with the same loops run by Python', () => {
  for (const c of fixture.variants) {
    it(`${c.seq}, ${c.m} … ${c.n}`, () => {
      const d = deriveVariants(c.seq, c.m, c.n);
      expect(str(d.correct)).toBe(c.expected.correct);
      for (const v of d.variants) {
        const e = c.expected.variants[v.id];
        expect(str(v.total), v.id).toBe(e.total);
        expect(str(v.difference), v.id).toBe(e.difference);
        if (e.error === null) expect(v.error, v.id).toBeNull();
        else expect(v.error, v.id).toMatch(new RegExp(`^${e.error}`));
      }
    });
  }
});

describe('nested sums agree with the sorted cell set', () => {
  for (const c of fixture.nested) {
    it(`${c.kind} ${c.rule} ${c.order} ${c.n} × ${c.k}`, () => {
      const d = deriveNested({ kind: c.kind, n: c.n, k: c.k, rule: c.rule, order: c.order });
      const e = c.expected;
      expect(d.cols).toBe(e.cols);
      expect(d.cellCount).toBe(e.cellCount);
      expect(d.frames.slice(1).map(f => [f.i, f.j])).toEqual(e.cells);
      expect(d.frames.map(f => f.after)).toEqual(e.partials.map(x => q(x)));
      expect(d.total).toEqual(q(e.total));
      expect(d.rowSums).toEqual(e.rowSums.map(x => q(x)));
      expect(d.colSums).toEqual(e.colSums.map(x => q(x)));
      expect(d.closed === null ? null : Number(d.closed.value.num)).toBe(e.closed);
      expect(d.swapMistake === null ? null : { cells: d.swapMistake.cells, total: Number(d.swapMistake.total.num), differs: d.swapMistake.differs }).toEqual(e.swapMistake);
      expect(form(d.otherTotal).text).toBe(form(d.total).text);
    });
  }
});
