/**
 * Summation (I.8): hand-worked values, the empty sum, the trace contract, exhaustive closed-form checks, the Gauss pairing, linearity and
 * shift, the off-by-one variants, and nested sums in both orders. Every expected value below is written by hand or by an independent loop.
 */
import { describe, expect, it } from 'vitest';
import { add, equals, form, mul, parseQ, pow, q, type Q } from '../../src/math/summation/rational';
import { CONSTANT_VALUE, DEFAULT_PARAMS, MAX_LIST, SEQ_IDS, closedForm, prefix, term, type SeqId, type SeqParams } from '../../src/math/summation/sequences';
import { BOUND_MAX, BOUND_MIN, MAX_TERMS, checkIdentities, checkLoops, checkSum, deriveIdentities, deriveSum, deriveVariants, gauss, termCount } from '../../src/math/summation/sum';
import { NESTED_MAX, TABLE, cellsInOrder, deriveNested, type NestedKind, type NestedOrder, type NestedRule } from '../../src/math/summation/nested';

const P = (over: Partial<SeqParams> = {}): SeqParams => ({ ...DEFAULT_PARAMS, ...over });
const sumOf = (seq: SeqId, m: number, n: number, params = P()) => deriveSum({ seq, params, m, n });
const textOf = (a: Q | null): string => (a === null ? 'none' : form(a).text);
/** An independent loop: plain BigInt fractions, no use of the model's frames. */
function brute(seq: SeqId, params: SeqParams, m: number, n: number): Q {
  let acc = q(0);
  for (let i = m; i <= n; i++) {
    const t = term(seq, params, i);
    if (!t.ok) throw new Error('undefined term in brute');
    acc = add(acc, t.value);
  }
  return acc;
}

describe('exact rationals', () => {
  it('normalise, compare structurally and print', () => {
    expect(q(6, -4)).toEqual({ num: -3n, den: 2n });
    expect(equals(q(2, 4), q(1, 2))).toBe(true);
    expect(form(q(-3, 2)).text).toBe('−3/2');
    expect(form(q(-3, 2)).tex).toBe('-\\frac{3}{2}');
    expect(form(q(7)).text).toBe('7');
    expect(form(q(0)).text).toBe('0');
    expect(pow(q(-2, 3), 3)).toEqual(q(-8, 27));
    expect(pow(q(2), -2)).toEqual(q(1, 4));
    expect(pow(q(0), 0)).toEqual(q(1));
    expect(() => pow(q(0), -1)).toThrow();
  });
  it('parses integers, fractions and short decimals, and rejects everything else', () => {
    expect(parseQ('3')).toEqual(q(3));
    expect(parseQ(' −5 ')).toEqual(q(-5));
    expect(parseQ('3/6')).toEqual(q(1, 2));
    expect(parseQ('-1/ 4')).toEqual(q(-1, 4));
    expect(parseQ('0.25')).toEqual(q(1, 4));
    expect(parseQ('1.5')).toEqual(q(3, 2));
    expect(parseQ('0.00001')).toBeNull(); // more than 4 places
    expect(parseQ('1/0')).toBeNull();
    for (const bad of ['', 'abc', '1,5', '1e3', '--2', '1/2/3', '½']) expect(parseQ(bad), bad).toBeNull();
  });
});

describe('terms', () => {
  it('hand values', () => {
    expect(term('identity', P(), 7)).toEqual({ ok: true, value: q(7) });
    expect(term('square', P(), -3)).toEqual({ ok: true, value: q(9) });
    expect(term('odd', P(), 4)).toEqual({ ok: true, value: q(7) });
    expect(term('odd', P(), 0)).toEqual({ ok: true, value: q(-1) });
    expect(term('reciprocal', P(), -4)).toEqual({ ok: true, value: q(-1, 4) });
    expect(term('alternating', P(), 3)).toEqual({ ok: true, value: q(-1) });
    expect(term('alternating', P(), -3)).toEqual({ ok: true, value: q(-1) });
    expect(term('alternating', P(), -2)).toEqual({ ok: true, value: q(1 ) });
    expect(term('constant', P(), 99)).toEqual({ ok: true, value: q(CONSTANT_VALUE) });
    expect(term('pronic', P(), 4)).toEqual({ ok: true, value: q(20) });
    expect(term('geometric', P({ r: q(1, 2) }), 3)).toEqual({ ok: true, value: q(1, 8) });
    expect(term('geometric', P({ r: q(1, 2) }), -2)).toEqual({ ok: true, value: q(4) });
    expect(term('geometric', P({ r: q(0) }), 0)).toEqual({ ok: true, value: q(1) });
  });
  it('a term that does not exist is reported, never zero', () => {
    const rec = term('reciprocal', P(), 0);
    expect(rec.ok).toBe(false);
    if (!rec.ok) { expect(rec.reason).toMatch(/division by zero/); expect(rec.pythonError).toBe('ZeroDivisionError'); }
    const geo = term('geometric', P({ r: q(0) }), -1);
    expect(geo.ok).toBe(false);
    const list = P({ list: [q(1), q(2)] });
    expect(term('list', list, 2)).toEqual({ ok: true, value: q(2) });
    const past = term('list', list, 3);
    expect(past.ok).toBe(false);
    if (!past.ok) { expect(past.pythonError).toBe('IndexError'); expect(past.reason).toMatch(/only 2 entries/); }
    const before = term('list', list, 0);
    expect(before.ok).toBe(false);
    if (!before.ok) expect(before.reason).toMatch(/silently wrap/);
    expect(MAX_LIST).toBe(8);
  });
});

describe('the sum and its trace', () => {
  it('hand-worked sums', () => {
    expect(textOf(sumOf('identity', 1, 5).total)).toBe('15');
    expect(textOf(sumOf('square', 1, 5).total)).toBe('55');
    expect(textOf(sumOf('odd', 1, 5).total)).toBe('25');
    expect(textOf(sumOf('reciprocal', 1, 4).total)).toBe('25/12'); // 1 + 1/2 + 1/3 + 1/4
    expect(textOf(sumOf('alternating', 1, 5).total)).toBe('−1');
    expect(textOf(sumOf('alternating', 1, 4).total)).toBe('0');
    expect(textOf(sumOf('constant', 1, 5).total)).toBe('15');
    expect(textOf(sumOf('pronic', 1, 3).total)).toBe('20'); // 2 + 6 + 12
    expect(textOf(sumOf('geometric', 0, 4).total)).toBe('31/16'); // 1 + 1/2 + 1/4 + 1/8 + 1/16
    expect(textOf(sumOf('geometric', 0, 4, P({ r: q(1) })).total)).toBe('5');
    expect(textOf(sumOf('list', 1, 4).total)).toBe('13/2'); // 3 − 1 + 1/2 + 4
    expect(textOf(sumOf('identity', -2, 3).total)).toBe('3'); // −2 − 1 + 0 + 1 + 2 + 3
    expect(textOf(sumOf('identity', 4, 4).total)).toBe('4'); // one term
  });
  it('bounds are inclusive and the count is n − m + 1', () => {
    for (const [m, n] of [[1, 5], [3, 3], [-2, 2], [0, 7]] as const) {
      const d = sumOf('identity', m, n);
      expect(d.count).toBe(n - m + 1);
      expect(d.rows.map(r => r.i)).toEqual(Array.from({ length: n - m + 1 }, (_, a) => m + a));
      expect(termCount(m, n)).toBe(n - m + 1);
    }
  });
  it('the empty sum is 0 with count 0 and one frame (the state before the loop)', () => {
    for (const [m, n] of [[3, 2], [5, 2], [1, 0], [20, -5]] as const) {
      const d = deriveSum({ seq: 'identity', params: P(), m: Math.min(m, BOUND_MAX), n: Math.max(n, BOUND_MIN) });
      if (d.input.n >= d.input.m) continue;
      expect(d.empty).toBe(true);
      expect(d.count).toBe(0);
      expect(d.total).toEqual(q(0));
      expect(d.frames).toHaveLength(1);
      expect(d.frames[0]).toMatchObject({ k: 0, i: null, term: null });
    }
    // an empty sum of an otherwise undefined sequence has no terms to be undefined: it is still 0
    expect(sumOf('reciprocal', 1, 0).total).toEqual(q(0));
    expect(sumOf('reciprocal', 0, -1).total).toEqual(q(0));
  });
  it('trace: frame 0 is acc = 0, frame k is after the k-th term, terms + 1 frames, every frame adds exactly its term', () => {
    for (const seq of SEQ_IDS) {
      for (const [m, n] of [[1, 6], [-2, 3], [4, 4], [1, 1]] as const) {
        const d = sumOf(seq, m, n);
        if (d.failure) continue;
        expect(d.frames).toHaveLength(d.count + 1);
        expect(d.frames[0]).toMatchObject({ k: 0, before: q(0), after: q(0) });
        d.frames.forEach((f, k) => {
          expect(f.k).toBe(k);
          if (k === 0) return;
          expect(f.i).toBe(m + k - 1);
          expect(equals(f.after, add(f.before, f.term!))).toBe(true);
          expect(equals(f.before, d.frames[k - 1]!.after)).toBe(true);
          expect(equals(f.after, brute(seq, P(), m, m + k - 1))).toBe(true); // the k-th frame is the sum of the first k terms
        });
        expect(equals(d.frames.at(-1)!.after, d.total!)).toBe(true);
      }
    }
  });
  it('a missing term stops the loop with an error frame; the sum is undefined and nothing is skipped', () => {
    const d = sumOf('reciprocal', -2, 3);
    expect(d.total).toBeNull();
    expect(d.failure).toMatchObject({ i: 0, pythonError: 'ZeroDivisionError' });
    expect(d.frames.map(f => f.i)).toEqual([null, -2, -1, 0]); // frame 0, a_-2, a_-1, then the failing i = 0
    expect(d.frames.at(-1)!.error).toMatch(/division by zero/);
    expect(textOf(d.frames[2]!.after)).toBe('−3/2'); // −1/2 − 1
    expect(d.rows).toHaveLength(6); // the rows still list every index, so the learner sees which ones are fine
    expect(d.rows.find(r => r.i === 0)!.error).not.toBeNull();
    expect(d.closedMatches).toBeNull();
    const list = sumOf('list', 1, 6);
    expect(list.failure).toMatchObject({ i: 5, pythonError: 'IndexError' });
    expect(list.total).toBeNull();
  });
  it('rejects bounds outside the range or too many terms (never clamps)', () => {
    const bad = (m: number, n: number) => checkSum({ seq: 'identity', params: P(), m, n });
    expect(bad(1, 5).ok).toBe(true);
    expect(bad(BOUND_MIN, BOUND_MAX).ok).toBe(true);
    expect(bad(BOUND_MIN - 1, 3).ok).toBe(false);
    expect(bad(1, BOUND_MAX + 1).ok).toBe(false);
    expect(bad(1.5, 3).ok).toBe(false);
    expect(BOUND_MAX - BOUND_MIN + 1).toBeLessThanOrEqual(MAX_TERMS);
    expect(() => deriveSum({ seq: 'identity', params: P(), m: 1, n: 99 })).toThrow();
    expect(checkSum({ seq: 'identity', params: P(), m: 0, n: MAX_TERMS + 5 - 1 + 0 }).ok).toBe(false);
  });
});

describe('closed forms agree with the loop EXACTLY, for every bound pair', () => {
  const ratios = [q(1), q(2), q(1, 2), q(-1), q(-2), q(3), q(1, 3), q(-2, 3), q(5, 4), q(0)];
  it('prefix sums satisfy S(k) − S(k − 1) = a_k for every integer k (the telescoping fact the closed forms rest on)', () => {
    for (const seq of ['identity', 'square', 'odd', 'alternating', 'constant', 'pronic'] as const) {
      for (let k = -30; k <= 30; k++) {
        const hi = prefix(seq, k)!;
        const lo = prefix(seq, k - 1)!;
        const t = term(seq, P(), k);
        expect(t.ok && equals(add(hi.value, mul(q(-1), lo.value)), t.value), `${seq} k=${k}`).toBe(true);
      }
    }
  });
  it('Σ_{i=m}^{n} a_i = S(n) − S(m − 1) for every sequence with a closed form and every m, n in range (n ≥ m − 1)', () => {
    let checked = 0;
    for (const seq of ['identity', 'square', 'odd', 'alternating', 'constant', 'pronic'] as const) {
      for (let m = BOUND_MIN; m <= BOUND_MAX; m++) for (let n = Math.max(m - 1, BOUND_MIN); n <= BOUND_MAX; n++) {
        const d = sumOf(seq, m, n);
        expect(d.closed!.applies).toBe(true);
        expect(d.closedMatches, `${seq} ${m}..${n}`).toBe(true);
        expect(equals(d.total!, brute(seq, P(), m, n))).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(2000);
  });
  it('geometric: (r^m − r^(n+1))/(1 − r) for r ≠ 1, and n − m + 1 for r = 1 (the special case)', () => {
    for (const r of ratios) {
      for (let m = BOUND_MIN; m <= 8; m++) for (let n = Math.max(m - 1, BOUND_MIN); n <= 12; n++) {
        if (r.num === 0n && m < 0) {
          const e = sumOf('geometric', m, n, P({ r }));
          if (n >= m) expect(e.total).toBeNull(); // 0 to a negative power
          else expect(e.total).toEqual(q(0)); // empty: no term is ever asked for
          expect(e.closedMatches).toBeNull(); // no closed form is claimed there
          continue;
        }
        const d = sumOf('geometric', m, n, P({ r }));
        if (d.total === null) continue;
        expect(d.closedMatches, `r=${form(r).text} ${m}..${n}`).toBe(true);
      }
    }
    expect(sumOf('geometric', 0, 4, P({ r: q(1) })).closed!.special).toMatch(/special case/);
    expect(sumOf('geometric', 0, 4, P({ r: q(2) })).closed!.special).toBeNull();
    expect(textOf(sumOf('geometric', 0, 5, P({ r: q(2) })).closed!.value)).toBe('63'); // 2^6 − 1
  });
  it('the closed form is not claimed when n < m − 1 (the empty-sum convention decides), and does not exist for 1/i or a list', () => {
    expect(sumOf('identity', 5, 2).closed!.applies).toBe(false);
    expect(sumOf('identity', 5, 2).closedMatches).toBeNull();
    expect(sumOf('identity', 5, 4).closedMatches).toBe(true); // n = m − 1: empty, and S(4) − S(4) = 0
    expect(sumOf('reciprocal', 1, 5).closed).toBeNull();
    expect(sumOf('list', 1, 3).closed).toBeNull();
    expect(closedForm('square', P(), 1, 5)!.workTex).toBe('\\frac{5(5+1)(2\\cdot5+1)}{6}=55');
    expect(closedForm('identity', P(), 1, 10)!.workTex).toBe('\\frac{10(10+1)}{2}=55');
  });
  it('the textbook values', () => {
    expect(textOf(sumOf('identity', 1, 20).total)).toBe('210'); // n(n+1)/2
    expect(textOf(sumOf('odd', 1, 12).total)).toBe('144'); // n²
    expect(textOf(sumOf('square', 1, 10).total)).toBe('385');
  });
});

describe('Gauss pairing', () => {
  it('1 + … + 10: five pairs, each summing to 11', () => {
    const g = gauss('identity', P(), 1, 10)!;
    expect(g.pairs).toHaveLength(5);
    expect(g.pairs.every(p => equals(p.sum, q(11)))).toBe(true);
    expect(g.middle).toBeNull();
    expect(g.total).toEqual(q(55));
  });
  it('an odd count leaves the middle term alone: 1 + 3 + 5 + 7 + 9', () => {
    const g = gauss('odd', P(), 1, 5)!;
    expect(g.pairs).toHaveLength(2);
    expect(g.pairSum).toEqual(q(10));
    expect(g.middle).toEqual({ i: 3, value: q(5) });
    expect(g.total).toEqual(q(25));
  });
  it('agrees with the loop for every range, and only exists for arithmetic sequences', () => {
    for (const seq of ['identity', 'odd', 'constant'] as const) {
      for (let m = BOUND_MIN; m <= 12; m++) for (let n = m; n <= 12; n++) {
        const g = gauss(seq, P(), m, n)!;
        expect(equals(g.total, brute(seq, P(), m, n)), `${seq} ${m}..${n}`).toBe(true);
        expect(g.pairs.every(p => equals(p.sum, g.pairSum))).toBe(true); // every pair has the same sum: that is WHY it works
        expect(g.pairs.length).toBe(Math.floor((n - m + 1) / 2));
      }
    }
    expect(gauss('square', P(), 1, 5)).toBeNull();
    expect(gauss('identity', P(), 5, 2)).toBeNull();
  });
});

describe('linearity and index shift', () => {
  it('Σ(c·i + i²) = cΣi + Σi² for every bound pair and every c', () => {
    for (let m = -5; m <= 8; m++) for (let n = Math.max(m - 1, -5); n <= 8; n++) for (let c = -5; c <= 5; c++) {
      const d = deriveIdentities(m, n, c, 0);
      expect(d.linearity.holds, `${m}..${n} c=${c}`).toBe(true);
      expect(equals(d.linearity.lhs, d.linearity.rhs)).toBe(true);
    }
    expect(textOf(deriveIdentities(1, 4, 2, 0).linearity.lhs)).toBe('50'); // 2·10 + 30
  });
  it('Σ_{i=m}^{n} i² = Σ_{j=m+k}^{n+k} (j − k)² for every shift k', () => {
    for (let m = -5; m <= 8; m++) for (let n = Math.max(m - 1, -5); n <= 8; n++) for (let k = -5; k <= 5; k++) {
      const d = deriveIdentities(m, n, 1, k);
      expect(d.shift.holds, `${m}..${n} k=${k}`).toBe(true);
    }
  });
  it('shifting the bounds but forgetting the term is wrong (unless k = 0, or by coincidence)', () => {
    const d = deriveIdentities(1, 3, 1, 2); // Σ_{j=3}^{5} j² = 9+16+25 = 50, not 14
    expect(textOf(d.shift.original)).toBe('14');
    expect(textOf(d.shift.wrong)).toBe('50');
    expect(textOf(d.shift.wrongDifference)).toBe('36');
    expect(d.shift.wrongHolds).toBe(false);
    expect(deriveIdentities(1, 3, 1, 0).shift.wrongHolds).toBe(true);
    // a coincidence is not a proof: the window −3..−1 and the window 1..3 have the same squares
    expect(deriveIdentities(-3, -1, 1, 4).shift.wrongHolds).toBe(true);
  });
  it('rejects c, k or bounds outside the ranges', () => {
    expect(checkIdentities(1, 5, 6, 0).ok).toBe(false);
    expect(checkIdentities(1, 5, 1, -6).ok).toBe(false);
    expect(checkIdentities(1, 99, 1, 0).ok).toBe(false);
    expect(checkIdentities(1, 5, 1.5, 0).ok).toBe(false);
  });
});

describe('the five loops in Python', () => {
  it('identity, 1 … 5: the correct loop gives 15; range(m, n) drops the last term; range(m−1, n) slides the window', () => {
    const v = deriveVariants('identity', 1, 5);
    const by = Object.fromEntries(v.variants.map(x => [x.id, x]));
    expect(textOf(v.correct)).toBe('15');
    expect(by['correct']!.loop).toEqual([1, 2, 3, 4, 5]);
    expect(textOf(by['stop-excluded']!.total)).toBe('10');
    expect(textOf(by['stop-excluded']!.difference)).toBe('−5'); // it lost exactly a_n
    expect(by['stop-excluded']!.loop).toEqual([1, 2, 3, 4]);
    expect(by['start-shifted']!.read).toEqual([0, 1, 2, 3, 4]);
    expect(textOf(by['start-shifted']!.total)).toBe('10'); // a_0 = 0: the slide is invisible here
    expect(by['list-unshifted']!.total).toBeNull();
    expect(by['list-unshifted']!.error).toMatch(/IndexError: a\[5\]/);
    expect(by['list-unshifted']!.read).toEqual([2, 3, 4, 5]); // a[1..4] are a_2 … a_5
    expect(textOf(by['list-shifted']!.total)).toBe('15');
    expect(by['list-shifted']!.difference).toEqual(q(0));
  });
  it('the odd numbers make the slide visible: a_0 = −1', () => {
    const v = deriveVariants('odd', 1, 4);
    const by = Object.fromEntries(v.variants.map(x => [x.id, x]));
    expect(textOf(v.correct)).toBe('16');
    expect(textOf(by['start-shifted']!.total)).toBe('8'); // −1 + 1 + 3 + 5
    expect(textOf(by['start-shifted']!.difference)).toBe('−8');
  });
  it('1/i: the slid window reads a_0 and fails with a ZeroDivisionError', () => {
    const v = deriveVariants('reciprocal', 1, 3);
    const s = v.variants.find(x => x.id === 'start-shifted')!;
    expect(s.total).toBeNull();
    expect(s.error).toMatch(/ZeroDivisionError/);
  });
  it('the correct and the zero-based-correct loops always agree with an independent loop, for every sequence and window', () => {
    for (const seq of ['identity', 'square', 'odd', 'reciprocal', 'alternating', 'constant', 'pronic'] as const) {
      for (let m = 1; m <= 12; m++) for (let n = 1; n <= 12; n++) {
        const v = deriveVariants(seq, m, n);
        const want = n >= m ? brute(seq, P(), m, n) : q(0);
        expect(equals(v.correct!, want), `${seq} ${m}..${n}`).toBe(true);
        const shifted = v.variants.find(x => x.id === 'list-shifted')!;
        expect(equals(shifted.total!, want)).toBe(true);
        const stop = v.variants.find(x => x.id === 'stop-excluded')!;
        if (n >= m) expect(equals(stop.difference!, mul(q(-1), term(seq, P(), n).ok ? (term(seq, P(), n) as { value: Q }).value : q(0)))).toBe(true); // it loses exactly a_n
      }
    }
  });
  it('rejects the sequences and bounds this comparison does not offer', () => {
    expect(checkLoops('list', 1, 3).ok).toBe(false);
    expect(checkLoops('geometric', 1, 3).ok).toBe(false);
    expect(checkLoops('identity', 0, 3).ok).toBe(false);
    expect(checkLoops('identity', 1, 13).ok).toBe(false);
  });
});

describe('nested sums', () => {
  it('rectangular 3 × 4 with a_ij = i·j: (1+2+3)(1+2+3+4) = 60', () => {
    const d = deriveNested({ kind: 'rectangular', n: 3, k: 4, rule: 'product', order: 'rows-first' });
    expect(d.total).toEqual(q(60));
    expect(d.cellCount).toBe(12);
    expect(d.frames).toHaveLength(13);
    expect(d.rowSums).toEqual([q(10), q(20), q(30)]);
    expect(d.colSums).toEqual([q(6), q(12), q(18), q(24)]);
    expect(d.closed!.holds).toBe(true);
  });
  it('triangular n = 4 with a_ij = i·j: 1 + (2 + 4) + (3 + 6 + 9) + (4 + 8 + 12 + 16) = 65, ten cells', () => {
    const d = deriveNested({ kind: 'triangular', n: 4, k: 4, rule: 'product', order: 'rows-first' });
    expect(d.total).toEqual(q(65));
    expect(d.cellCount).toBe(10); // n(n+1)/2
    expect(d.rowSums).toEqual([q(1), q(6), q(18), q(40)]);
    expect(d.colSums).toEqual([q(10), q(18), q(21), q(16)]);
    expect(d.sameTotal).toBe(true);
  });
  it('the swapped bounds of the triangular sum: Σ_{j=1}^{n} Σ_{i=j}^{n}', () => {
    expect(cellsInOrder('triangular', 3, 3, 'rows-first').map(c => `${c.i}${c.j}`)).toEqual(['11', '21', '22', '31', '32', '33']);
    expect(cellsInOrder('triangular', 3, 3, 'columns-first').map(c => `${c.i}${c.j}`)).toEqual(['11', '21', '31', '22', '32', '33']);
    expect(cellsInOrder('rectangular', 2, 3, 'columns-first').map(c => `${c.i}${c.j}`)).toEqual(['11', '21', '12', '22', '13', '23']);
  });
  it('the data table: row sums 5, 4, 5, 7, 4 and column sums 4, 10, 5, 3, 3 add to the same 25; the lower triangle of the top 3 × 3 is 13', () => {
    const d = deriveNested({ kind: 'rectangular', n: 5, k: 5, rule: 'table', order: 'columns-first' });
    expect(d.total).toEqual(q(25));
    expect(d.rowSums).toEqual([5, 4, 5, 7, 4].map(x => q(x)));
    expect(d.colSums).toEqual([4, 10, 5, 3, 3].map(x => q(x)));
    expect(d.closed).toBeNull();
    const t = deriveNested({ kind: 'triangular', n: 3, k: 3, rule: 'table', order: 'columns-first' });
    expect(t.total).toEqual(q(13)); // 2 + (1 + 4) + (0 + 5 + 1)
    expect(TABLE.flat().reduce((a, b) => a + b, 0)).toBe(25);
  });
  it('both orders visit the same cells and give the same total, for every kind, rule, order and size', () => {
    let count = 0;
    for (const kind of ['rectangular', 'triangular'] as NestedKind[]) for (const rule of ['product', 'sum', 'table'] as NestedRule[]) for (const order of ['rows-first', 'columns-first'] as NestedOrder[]) {
      for (let n = 1; n <= NESTED_MAX; n++) for (let k = 1; k <= NESTED_MAX; k++) {
        const d = deriveNested({ kind, n, k, rule, order });
        expect(d.sameCells && d.sameTotal, `${kind} ${rule} ${order} ${n}x${k}`).toBe(true);
        expect(d.cellCount).toBe(kind === 'rectangular' ? n * k : (n * (n + 1)) / 2);
        expect(d.frames).toHaveLength(d.cellCount + 1);
        expect(equals(d.frames.at(-1)!.after, d.total)).toBe(true);
        // row sums add to the total, and so do column sums
        expect(equals(d.rowSums.reduce(add, q(0)), d.total)).toBe(true);
        expect(equals(d.colSums.reduce(add, q(0)), d.total)).toBe(true);
        if (d.closed) expect(d.closed.holds, `${kind} ${rule}`).toBe(true);
        // an independent brute force over the grid
        let want = 0;
        for (let i = 1; i <= n; i++) for (let j = 1; j <= d.cols; j++) {
          if (kind === 'triangular' && j > i) continue;
          want += rule === 'product' ? i * j : rule === 'sum' ? i + j : TABLE[i - 1]![j - 1]!;
        }
        expect(d.total).toEqual(q(want));
        count++;
      }
    }
    expect(count).toBe(2 * 3 * 2 * 25);
  });
  it('swapping a triangular loop but keeping the old bounds visits the other triangle', () => {
    const d = deriveNested({ kind: 'triangular', n: 3, k: 3, rule: 'table', order: 'columns-first' });
    expect(d.total).toEqual(q(13)); // the lower triangle, j <= i
    expect(d.swapMistake).toEqual({ cells: 6, total: q(4), differs: true }); // the upper triangle: 2 - 1 + 4 + 0 - 2 + 1
    // i * j is symmetric, so the slip does not show: that is how it goes unnoticed
    expect(deriveNested({ kind: 'triangular', n: 4, k: 4, rule: 'product', order: 'rows-first' }).swapMistake!.differs).toBe(false);
    expect(deriveNested({ kind: 'rectangular', n: 3, k: 3, rule: 'table', order: 'rows-first' }).swapMistake).toBeNull();
  });
  it('rejects sizes outside 1 … 5', () => {
    expect(() => deriveNested({ kind: 'rectangular', n: 0, k: 3, rule: 'sum', order: 'rows-first' })).toThrow();
    expect(() => deriveNested({ kind: 'rectangular', n: 3, k: 6, rule: 'sum', order: 'rows-first' })).toThrow();
  });
});
