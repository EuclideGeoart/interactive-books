/**
 * TypeScript ⇄ Python oracle parity for the notation map (chapter I.9; master plan §9.4, §12.3).
 * Inputs AND expected values come from `fixtures/notation.fixtures.json`, written by `oracle/notation_oracle.py`, which builds real nested lists
 * (positions by `itertools.product`, indexing errors by Python itself), multiplies all-ones matrices with three nested loops, finds the largest
 * square divisor by scanning down from `isqrt`, scans a loss table with `min` and `list.index`, uses `Fraction` for expectations and runs the same
 * IEEE-754 operations as the page for the finite differences. Every claim here is exact; the one tolerance compares the exact radical with
 * `math.hypot`, a different algorithm for the same real number.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { q, toNumber, type Q } from '../../src/math/notation/rational';
import { deriveAlgebra, deriveShape, tupleText, type AlgebraOp, type ObjectKind } from '../../src/math/notation/shapes';
import { norms, radicalToNumber } from '../../src/math/notation/norms';
import { deriveArgmin, type LossKind } from '../../src/math/notation/argmin';
import { deriveExpect, type OutcomeSet } from '../../src/math/notation/expectation';
import { deriveGradient } from '../../src/math/notation/gradient';
import { deriveShapeLesson, shapeCode } from '../../src/lessons/notation/shape-lesson';
import { deriveAlgebraLesson, algebraCode } from '../../src/lessons/notation/algebra-lesson';

interface ShapeCase {
  kind: ObjectKind; n: number; d: number; B: number; T: number; i: number; j: number; k: number;
  expected: { shape: string; count: number; valid: boolean; outcome: 'value' | 'wraps' | 'IndexError'; strides: number[]; offset: number | null; idx0: number[]; slices: [string, string][] };
}
interface AlgebraCase { op: AlgebraOp; n: number; d: number; p: number; q: number; expected: { valid: boolean; reason: string | null; result: number[] | null; resultTuple: string | null; entries: number[] } }
interface NormCase {
  x: string[];
  expected: { zero: boolean; l1: string; linf: string; l2squared: string; l2coef: string; l2radicand: number; l2double: number; hypot: number; chain: { infLeL2: boolean; l2LeL1: boolean; l1LeDInf: boolean }; equalities: string[] };
}
interface ArgminCase { kind: LossKind; c: number; b: number; expected: { losses: number[]; min: number; argmin: number[]; npIndex: number; npTheta: number } }
interface ExpectCase {
  set: OutcomeSet; counts: number[];
  expected: { values: number[]; counts: number[]; total: number; defined: boolean; error: string | null; p: string[]; sumP: string | null; expectation: string | null; weightedMean: string | null; modes: number[]; isOutcome: boolean | null };
}
interface GradientCase { t1: number; t2: number; e: number; expected: { f: string; grad: string[]; stationary: boolean; h: number; estimate: number[]; error: number[]; shape: string } }
interface Fixture { schema: string; shapes: ShapeCase[]; algebra: AlgebraCase[]; norms: NormCase[]; argmin: ArgminCase[]; expect: ExpectCase[]; gradient: GradientCase[] }

const fixture = JSON.parse(readFileSync('fixtures/notation.fixtures.json', 'utf8')) as Fixture;
const parse = (text: string): Q => { const [a, b] = text.split('/'); return q(BigInt(a!), BigInt(b!)); };
const str = (a: Q | null): string | null => (a === null ? null : `${a.num}/${a.den}`);

describe('fixture', () => {
  it('has the expected schema and a useful number of cases', () => {
    expect(fixture.schema).toBe('book2.notation.fixtures/1');
    expect(fixture.shapes.length).toBeGreaterThanOrEqual(1000);
    expect(fixture.algebra.length).toBe(125 + 256 + 128);
    expect(fixture.norms.length).toBeGreaterThanOrEqual(400);
    expect(fixture.argmin.length).toBe(3 * 7 * 7);
    expect(fixture.expect.length).toBeGreaterThanOrEqual(390);
    expect(fixture.gradient.length).toBeGreaterThanOrEqual(500);
  });
});

describe('shapes agree with nested lists, itertools.product positions and Python indexing', () => {
  it('matches every case', () => {
    for (const c of fixture.shapes) {
      const id = JSON.stringify({ kind: c.kind, n: c.n, d: c.d, B: c.B, T: c.T, i: c.i, j: c.j, k: c.k });
      const d = deriveShape({ kind: c.kind, n: c.n, d: c.d, B: c.B, T: c.T, i: c.i, j: c.j, k: c.k });
      const e = c.expected;
      expect(d.shapeTuple, id).toBe(e.shape);
      expect(d.count, id).toBe(e.count);
      if (c.kind === 'scalar') { expect(d.selection, id).toBeNull(); continue; }
      expect(d.selection!.valid, id).toBe(e.valid);
      expect(d.selection!.offset, id).toBe(e.offset);
      expect([...d.selection!.values0], id).toEqual(e.idx0);
      expect([...d.selection!.strides], id).toEqual(e.strides);
      expect(d.slices.map(s => [s.id, s.shapeTuple]), id).toEqual(e.slices);
      expect(tupleText(d.shape), id).toBe(e.shape);
    }
  });
  it('knows exactly when Python would raise and when a negative index silently wraps', () => {
    for (const c of fixture.shapes) {
      if (c.kind === 'scalar') continue;
      const lesson = deriveShapeLesson({ kind: c.kind, n: c.n, d: c.d, B: c.B, T: c.T, i: c.i, j: c.j, k: c.k });
      const code = shapeCode(lesson).split('\n').at(-1)!;
      const id = JSON.stringify(c);
      if (c.expected.outcome === 'value') expect(code, id).not.toMatch(/IndexError|does NOT fail/);
      if (c.expected.outcome === 'IndexError') expect(code, id).toMatch(/IndexError/);
      if (c.expected.outcome === 'wraps') expect(code, id).toMatch(/does NOT fail/);
      expect(lesson.d.selection!.valid, id).toBe(c.expected.outcome === 'value');
    }
  });
  it('covers all three outcomes', () => {
    const outcomes = new Set(fixture.shapes.map(c => c.expected.outcome));
    expect([...outcomes].sort()).toEqual(['IndexError', 'value', 'wraps']);
  });
});

describe('products agree with nested-loop multiplication', () => {
  it('matches every case, including the reason a product does not exist', () => {
    for (const c of fixture.algebra) {
      const id = JSON.stringify({ op: c.op, n: c.n, d: c.d, p: c.p, q: c.q });
      const a = deriveAlgebra({ op: c.op, n: c.n, d: c.d, p: c.p, q: c.q });
      expect(a.valid, id).toBe(c.expected.valid);
      expect(a.result === null ? null : [...a.result], id).toEqual(c.expected.result);
      expect(a.resultTuple, id).toBe(c.expected.resultTuple);
      expect(a.reason === null, id).toBe(c.expected.reason === null);
      if (a.reason) {
        // the oracle's own loops hit "inner dimensions differ: a and b"; the page words the same two numbers
        const [left, right] = (c.expected.reason!.match(/\d+/g) ?? []).map(Number);
        expect(a.reason, id).toContain(`${left} ≠ ${right}`);
      }
      const lesson = deriveAlgebraLesson({ op: c.op, n: c.n, d: c.d, p: c.p, q: c.q });
      expect(algebraCode(lesson).includes('ValueError'), id).toBe(!c.expected.valid);
    }
  });
});

describe('norms agree with Fractions, the largest square divisor and math.hypot', () => {
  it('matches every case', () => {
    for (const c of fixture.norms) {
      const x = c.x.map(parse);
      const n = norms(x);
      const e = c.expected;
      const id = c.x.join(', ');
      expect(n.zero, id).toBe(e.zero);
      expect(str(n.l1), id).toBe(e.l1);
      expect(str(n.linf), id).toBe(e.linf);
      expect(str(n.l2squared), id).toBe(e.l2squared);
      expect(str(n.l2.coef), id).toBe(e.l2coef);
      expect(Number(n.l2.radicand), id).toBe(e.l2radicand);
      expect(radicalToNumber(n.l2), id).toBe(e.l2double);
      expect(Math.abs(radicalToNumber(n.l2) - e.hypot), id).toBeLessThanOrEqual(1e-12 * Math.max(1, e.hypot));
      expect(n.chain, id).toEqual(e.chain);
      expect([...n.equalities].sort(), id).toEqual(e.equalities);
    }
  });
});

describe('arg min agrees with a brute-force scan', () => {
  it('matches every case', () => {
    for (const c of fixture.argmin) {
      const d = deriveArgmin({ kind: c.kind, c: c.c, b: c.b });
      const id = JSON.stringify({ kind: c.kind, c: c.c, b: c.b });
      expect(d.rows.map(r => r.loss), id).toEqual(c.expected.losses);
      expect(d.minValue, id).toBe(c.expected.min);
      expect([...d.argmin], id).toEqual(c.expected.argmin);
      expect(d.npIndex, id).toBe(c.expected.npIndex);
      expect(d.npTheta, id).toBe(c.expected.npTheta);
    }
  });
  it('contains ties, and in a tie np.argmin is the first minimiser, not the set', () => {
    const ties = fixture.argmin.filter(c => c.expected.argmin.length > 1);
    expect(ties.length).toBeGreaterThanOrEqual(20);
    for (const c of ties) expect(c.expected.npTheta).toBe(c.expected.argmin[0]);
  });
});

describe('expectations agree with Fractions', () => {
  it('matches every case, including the undefined ones', () => {
    for (const c of fixture.expect) {
      const [c1, c2, c3, c4, c5, c6] = [...c.counts, 0, 0, 0, 0, 0, 0];
      const id = `${c.set} ${c.counts.join(',')}`;
      const d = deriveExpect({ set: c.set, c1: c1!, c2: c2!, c3: c3!, c4: c4!, c5: c5!, c6: c6! });
      const e = c.expected;
      expect([...d.values], id).toEqual(e.values);
      expect([...d.counts], id).toEqual(e.counts);
      expect(d.total, id).toBe(e.total);
      expect(d.defined, id).toBe(e.defined);
      if (!e.defined) {
        expect(e.error, id).toBe('ZeroDivisionError');
        expect(d.expectation, id).toBeNull();
        expect(d.reason, id).toMatch(/divide by 0/);
        continue;
      }
      expect(d.p.map(x => str(x)), id).toEqual(e.p);
      expect(str(d.sumP), id).toBe(e.sumP);
      expect(str(d.expectation), id).toBe(e.expectation);
      expect(str(d.weightedMean), id).toBe(e.weightedMean);
      expect([...d.modes], id).toEqual(e.modes);
      expect(d.isOutcome, id).toBe(e.isOutcome);
    }
  });
});

describe('finite differences agree with the same IEEE-754 operations in Python', () => {
  it('matches every case exactly', () => {
    for (const c of fixture.gradient) {
      const id = JSON.stringify({ t1: c.t1, t2: c.t2, e: c.e });
      const d = deriveGradient({ t1: c.t1, t2: c.t2, e: c.e });
      const e = c.expected;
      expect(str(d.f), id).toBe(e.f);
      expect(d.grad.map(x => str(x)), id).toEqual(e.grad);
      expect(d.stationary, id).toBe(e.stationary);
      expect(d.h, id).toBe(e.h);
      expect([...d.estimate], id).toEqual(e.estimate);
      expect([...d.error], id).toEqual(e.error);
      expect(d.shapeTuple, id).toBe(e.shape);
      expect([toNumber(d.grad[0]), toNumber(d.grad[1])], id).toEqual([Number(e.grad[0]!.split('/')[0]) / Number(e.grad[0]!.split('/')[1]), Number(e.grad[1]!.split('/')[0]) / Number(e.grad[1]!.split('/')[1])]);
    }
  });
});
