/**
 * Domain-model tests for I.4: exact linear statements, balanced operations, inequality reversal, extraneous roots, the division fallacy and
 * the distributive law. Hand-worked values first (each comment carries the arithmetic), then seeded properties. The central invariant is checked
 * two ways: through the solution sets the model computes, and by BRUTE-FORCE evaluation of the statement at many exact rational points.
 */
import { describe, expect, it } from 'vitest';
import {
  beamAt, deriveBalance, exact, solutionPath, statementOf, tryStep,
  type BalanceState, type StatementSpec, type StepSpec,
} from '../../src/math/algebra/balance';
import { classify, deriveDistribute } from '../../src/math/algebra/expression';
import {
  deriveExtraneous, radicalSum, solvesNegated, solvesOriginal, solvesSquared, sumEq, sumSign, sumSquare, sumValue,
} from '../../src/math/algebra/extraneous';
import { FALLACY_LIMIT, deriveFallacy, isFallacySolution } from '../../src/math/algebra/fallacy';
import {
  applyOperation, deriveHistory, holdsAt, inSolutionSet, linear, reverse, sameSolutionSet, scaleLinear, solve, statement,
  type Operation, type Relation, type Statement,
} from '../../src/math/algebra/linear';
import { deriveReversal } from '../../src/math/algebra/reversal';
import { add, int, rational, toNumber, type Rational } from '../../src/math/quantity/rational';

/** Deterministic generator: the same sequence on every machine. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return (lo: number, hi: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return lo + (s % (hi - lo + 1));
  };
}
const q = (n: number, d = 1) => rational(BigInt(n), BigInt(d));
const txt = (r: Rational) => `${r.num}/${r.den}`;
const L = (a: number, b: number) => linear(q(a), q(b));
const S = (a1: number, b1: number, rel: Relation, a2: number, b2: number): Statement => statement(L(a1, b1), rel, L(a2, b2));
/** Exact rational test points x = k/4 for k in [−60, 60]. */
const POINTS: Rational[] = Array.from({ length: 121 }, (_, i) => q(i - 60, 4));
const RELS: readonly Relation[] = ['=', '<', '≤', '>', '≥'];

describe('solution sets of linear statements (worked by hand)', () => {
  it('3x + 2 = x + 10: 2x = 8, so x = 4 (and 14 = 14 checks it)', () => {
    const s = S(3, 2, '=', 1, 10);
    expect(solve(s)).toEqual({ kind: 'point', x: q(4) });
    expect(holdsAt(s, q(4))).toBe(true);
    expect(holdsAt(s, q(5))).toBe(false);
  });
  it('a single rational that is not an integer: 4x + 1 = x + 3 gives x = 2/3', () => {
    const set = solve(S(4, 1, '=', 1, 3));
    expect(set.kind === 'point' && txt(set.x)).toBe('2/3');
  });
  it('2x + 3 = 2x + 7 has no solution (0 = 4) and 2x + 3 = 2x + 3 has every x (0 = 0)', () => {
    expect(solve(S(2, 3, '=', 2, 7))).toEqual({ kind: 'none' });
    expect(solve(S(2, 3, '=', 2, 3))).toEqual({ kind: 'all' });
  });
  it('5x − 1 ≥ 2x + 8: 3x ≥ 9, so x ≥ 3 (closed)', () => {
    expect(solve(S(5, -1, '≥', 2, 8))).toEqual({ kind: 'ray', side: 'above', bound: q(3), closed: true });
  });
  it('4 − 2x < x + 10: −3x < 6, divide by −3 and REVERSE: x > −2 (open)', () => {
    expect(solve(S(-2, 4, '<', 1, 10))).toEqual({ kind: 'ray', side: 'above', bound: q(-2), closed: false });
  });
  it('x/2 + 1 ≤ 3 − x/4: 3x/4 ≤ 2, so x ≤ 8/3 (closed)', () => {
    const set = solve(statement(linear(q(1, 2), q(1)), '≤', linear(q(-1, 4), q(3))));
    expect(set.kind === 'ray' && set.side === 'below' && set.closed && txt(set.bound)).toBe('8/3');
  });
  it('inequalities with equal x-terms are all-or-nothing: 2x + 1 < 2x + 3 is always true; 2x + 3 ≤ 2x + 1 never', () => {
    expect(solve(S(2, 1, '<', 2, 3))).toEqual({ kind: 'all' });
    expect(solve(S(2, 3, '≤', 2, 1))).toEqual({ kind: 'none' });
    expect(solve(S(2, 1, '≥', 2, 1))).toEqual({ kind: 'all' }); // 0 ≥ 0
    expect(solve(S(2, 1, '>', 2, 1))).toEqual({ kind: 'none' }); // 0 > 0
  });
  it('membership in the solution set agrees with direct evaluation at every test point, for random statements', () => {
    const r = lcg(11);
    for (let i = 0; i < 300; i++) {
      const s = S(r(-6, 6), r(-9, 9), RELS[r(0, 4)]!, r(-6, 6), r(-9, 9));
      const set = solve(s);
      for (const x of POINTS) expect(inSolutionSet(set, x), `${i}: ${JSON.stringify(s, (_, v) => (typeof v === 'bigint' ? String(v) : v))} at ${txt(x)}`).toBe(holdsAt(s, x));
    }
  });
});

describe('reversal of a relation', () => {
  it('is an involution and fixes =', () => {
    for (const rel of RELS) expect(reverse(reverse(rel))).toBe(rel);
    expect(reverse('=')).toBe('=');
    expect(reverse('<')).toBe('>');
    expect(reverse('≤')).toBe('≥');
  });
});

describe('balanced operations', () => {
  const s = S(3, 2, '=', 1, 10);
  it('adds a term to both sides: subtract x gives 2x + 2 = 10; subtract 2 gives 2x = 8; divide by 2 gives x = 4', () => {
    const a = applyOperation(s, { kind: 'add', term: L(-1, 0) });
    expect(a.kind === 'ok' && a.next).toEqual(S(2, 2, '=', 0, 10));
    const b = applyOperation((a as { next: Statement }).next, { kind: 'add', term: L(0, -2) });
    expect(b.kind === 'ok' && b.next).toEqual(S(2, 0, '=', 0, 8));
    const c = applyOperation((b as { next: Statement }).next, { kind: 'divide', k: q(2) });
    expect(c.kind === 'ok' && c.next).toEqual(S(1, 0, '=', 0, 4));
  });
  it('rejects ×0 with the reason that the solution set would change, and ÷0 as undefined', () => {
    const times0 = applyOperation(s, { kind: 'scale', k: int(0) });
    expect(times0.kind).toBe('rejected');
    expect(times0.kind === 'rejected' && times0.reason).toMatch(/0 = 0/);
    expect(times0.kind === 'rejected' && times0.reason).toMatch(/reversed/);
    const over0 = applyOperation(s, { kind: 'divide', k: int(0) });
    expect(over0.kind === 'rejected' && over0.reason).toMatch(/undefined/);
    const ineq = applyOperation(S(1, 0, '<', 0, 5), { kind: 'scale', k: int(0) });
    expect(ineq.kind === 'rejected' && ineq.reason).toMatch(/0 < 0/);
  });
  it('why ×0 is rejected: done anyway, it would change the solution set (x = 4 becomes "every x")', () => {
    const naive = statement(scaleLinear(s.l, int(0)), s.rel, scaleLinear(s.r, int(0)));
    expect(solve(s)).toEqual({ kind: 'point', x: q(4) });
    expect(solve(naive)).toEqual({ kind: 'all' });
    expect(sameSolutionSet(solve(s), solve(naive))).toBe(false);
  });
  it('a negative factor reverses an inequality and a positive one keeps it; an equation is never changed in kind', () => {
    const ineq = S(-2, 4, '<', 1, 10);
    const neg = applyOperation(ineq, { kind: 'divide', k: q(-3) });
    expect(neg.kind === 'ok' && neg.reversed && neg.next.rel).toBe('>');
    const pos = applyOperation(ineq, { kind: 'scale', k: q(3) });
    expect(pos.kind === 'ok' && !pos.reversed && pos.next.rel).toBe('<');
    const eqn = applyOperation(s, { kind: 'scale', k: q(-1) });
    expect(eqn.kind === 'ok' && !eqn.reversed && eqn.next.rel).toBe('=');
  });
  it('the history is a list of frames; a rejected operation cannot enter it', () => {
    const frames = deriveHistory(s, [{ kind: 'add', term: L(-1, 0) }, { kind: 'add', term: L(0, -2) }, { kind: 'divide', k: q(2) }]);
    expect(frames).toHaveLength(4);
    expect(frames[0]!.op).toBeUndefined();
    expect(frames[3]!.statement).toEqual(S(1, 0, '=', 0, 4));
    expect(frames[2]!.before).toEqual(frames[1]!.statement);
    expect(() => deriveHistory(s, [{ kind: 'scale', k: int(0) }])).toThrow(RangeError);
  });
});

describe('every accepted operation preserves the solution set (seeded properties)', () => {
  function randomOperation(r: ReturnType<typeof lcg>): Operation {
    const kind = r(0, 3);
    const k = () => { const n = r(-9, 9); return q(n === 0 ? 1 : n, r(1, 4)); };
    if (kind === 0) return { kind: 'add', term: linear(q(r(-6, 6), r(1, 3)), q(r(-9, 9), r(1, 3))) };
    if (kind === 1) return { kind: 'add', term: linear(int(0), q(r(-9, 9), r(1, 4))) };
    return kind === 2 ? { kind: 'scale', k: k() } : { kind: 'divide', k: k() };
  }
  it('before and after have the same solution set, and agree at every one of 121 exact test points', () => {
    const r = lcg(2024);
    let checked = 0;
    for (let i = 0; i < 400; i++) {
      const s = S(r(-6, 6), r(-9, 9), RELS[r(0, 4)]!, r(-6, 6), r(-9, 9));
      const op = randomOperation(r);
      const res = applyOperation(s, op);
      expect(res.kind).toBe('ok');
      if (res.kind !== 'ok') continue;
      expect(sameSolutionSet(solve(s), solve(res.next))).toBe(true);
      for (const x of POINTS) { expect(holdsAt(res.next, x)).toBe(holdsAt(s, x)); checked++; }
    }
    expect(checked).toBe(400 * 121);
  });
  it('chains of operations compose: the last statement has the first one\'s solution set', () => {
    const r = lcg(77);
    for (let i = 0; i < 100; i++) {
      const s = S(r(-6, 6), r(-9, 9), RELS[r(0, 4)]!, r(-6, 6), r(-9, 9));
      const ops = Array.from({ length: r(1, 5) }, () => randomOperation(r));
      const frames = deriveHistory(s, ops);
      expect(sameSolutionSet(solve(frames[0]!.statement), solve(frames[frames.length - 1]!.statement))).toBe(true);
    }
  });
  it('and every operation is reversible: undoing it returns the original statement exactly', () => {
    const r = lcg(5);
    for (let i = 0; i < 200; i++) {
      const s = S(r(-6, 6), r(-9, 9), RELS[r(0, 4)]!, r(-6, 6), r(-9, 9));
      const op = randomOperation(r);
      const forward = applyOperation(s, op);
      if (forward.kind !== 'ok') throw new Error('unexpected rejection');
      const inverse: Operation =
        op.kind === 'add' ? { kind: 'add', term: linear(q(-Number(op.term.a.num), Number(op.term.a.den)), q(-Number(op.term.b.num), Number(op.term.b.den))) }
        : op.kind === 'scale' ? { kind: 'divide', k: op.k }
        : { kind: 'scale', k: op.k };
      const back = applyOperation(forward.next, inverse);
      expect(back.kind === 'ok' && back.next).toEqual(s);
    }
  });
});

describe('the balance: history, beam and the derived solution path', () => {
  const initial: StatementSpec = { a1: 3, b1: 2, rel: '=', a2: 1, b2: 10 };
  const base: BalanceState = { initial, steps: [], trial: 0 };

  it('the beam at x = 4 is level (14 = 14); at x = 5 the left pan is lower (17 > 15); at x = 3 the right (11 < 13)', () => {
    const st = statementOf(initial);
    expect(beamAt(st, q(4))).toMatchObject({ lower: 'level', holds: true, diff: q(0) });
    expect(beamAt(st, q(5))).toMatchObject({ lower: 'left', holds: false, diff: q(2) });
    expect(beamAt(st, q(3))).toMatchObject({ lower: 'right', holds: false, diff: q(-2) });
  });
  it('the beam is level at every frame\'s solution: x = 4 balances every statement in the history', () => {
    const steps: StepSpec[] = [{ op: 'add-x', value: -1 }, { op: 'add', value: -2 }, { op: 'divide', value: 2 }];
    const d = deriveBalance({ ...base, steps, trial: 4 });
    expect(d.frames).toHaveLength(4);
    for (const beam of d.beams) expect(beam).toMatchObject({ lower: 'level', holds: true });
    expect(d.preserved).toBe(true);
    expect(d.trialInSolution).toBe(true);
  });
  it('the solution path of a point solution ends at x = c, and records three steps for 3x + 2 = x + 10', () => {
    const path = solutionPath(initial);
    expect(path).toEqual([{ op: 'add-x', value: -1 }, { op: 'add', value: -2 }, { op: 'divide', value: 2 }]);
    const d = deriveBalance({ ...base, steps: path });
    expect(d.final).toEqual(S(1, 0, '=', 0, 4));
  });
  it('the solution path for a negative coefficient reverses the inequality: 4 − 2x < x + 10 ends at x > −2', () => {
    const spec: StatementSpec = { a1: -2, b1: 4, rel: '<', a2: 1, b2: 10 };
    const d = deriveBalance({ initial: spec, steps: solutionPath(spec), trial: 0 });
    expect(d.final).toEqual(S(1, 0, '>', 0, -2));
    expect(d.frames[d.frames.length - 1]!.reversed).toBe(true);
    expect(d.frames.map(f => f.reversed)).toEqual([false, false, false, true]);
    expect(d.preserved).toBe(true);
  });
  it('an equation with no x left ends at "0 = c": a contradiction or an identity, and the set is preserved', () => {
    const none = deriveBalance({ initial: { a1: 2, b1: 3, rel: '=', a2: 2, b2: 7 }, steps: solutionPath({ a1: 2, b1: 3, rel: '=', a2: 2, b2: 7 }), trial: 0 });
    expect(none.final).toEqual(S(0, 0, '=', 0, 4));
    expect(none.finalSolution).toEqual({ kind: 'none' });
    const all = deriveBalance({ initial: { a1: 2, b1: 3, rel: '=', a2: 2, b2: 3 }, steps: solutionPath({ a1: 2, b1: 3, rel: '=', a2: 2, b2: 3 }), trial: 0 });
    expect(all.final).toEqual(S(0, 0, '=', 0, 0));
    expect(all.finalSolution).toEqual({ kind: 'all' });
    expect(none.preserved && all.preserved).toBe(true);
  });
  it('the solution path preserves the set for random statements, and for point solutions ends in x = c', () => {
    const r = lcg(31);
    for (let i = 0; i < 300; i++) {
      const spec: StatementSpec = { a1: r(-6, 6), b1: r(-9, 9) / 2, rel: RELS[r(0, 4)]!, a2: r(-6, 6) / 2, b2: r(-9, 9) };
      const d = deriveBalance({ initial: spec, steps: solutionPath(spec), trial: 0 });
      expect(d.preserved).toBe(true);
      if (d.initialSolution.kind === 'point') {
        const fin = d.final;
        expect(txt(fin.l.a)).toBe('1/1');
        expect(txt(fin.l.b)).toBe('0/1');
        expect(txt(fin.r.a)).toBe('0/1');
        expect(txt(fin.r.b)).toBe(txt(d.initialSolution.x));
      }
    }
  });
  it('tryStep returns the model\'s own reason for ×0 and accepts ×(−1) on an inequality, flagging the reversal', () => {
    const zero = tryStep(base, { op: 'scale', value: 0 });
    expect(zero.ok).toBe(false);
    const dz = tryStep(base, { op: 'divide', value: 0 });
    expect(dz.ok).toBe(false);
    const ineq: BalanceState = { initial: { a1: -2, b1: 4, rel: '<', a2: 1, b2: 10 }, steps: [], trial: 0 };
    const flip = tryStep(ineq, { op: 'scale', value: -1 });
    expect(flip.ok && flip.reversed && flip.next.rel).toBe('>');
  });
  it('rejects a value finer than two decimals instead of rounding it', () => {
    expect(() => exact(0.001)).toThrow(RangeError);
    expect(() => exact(NaN)).toThrow(RangeError);
    expect(txt(exact(0.25))).toBe('1/4');
  });
});

describe('multiplying an inequality by k', () => {
  it('p = −2 < q = 3: ×2 gives −4 < 6 (kept); ×(−2) gives 4 > −6 (reversed, and "4 < −6" is false); ×0 is rejected', () => {
    const keep = deriveReversal({ p: -2, q: 3, k: 2 });
    expect([txt(keep.kp), txt(keep.kq)]).toEqual(['-4/1', '6/1']);
    expect(keep).toMatchObject({ before: 'less', after: 'less', rule: 'keeps', sameRelationHolds: true });
    const rev = deriveReversal({ p: -2, q: 3, k: -2 });
    expect([txt(rev.kp), txt(rev.kq)]).toEqual(['4/1', '-6/1']);
    expect(rev).toMatchObject({ before: 'less', after: 'greater', rule: 'reverses', sameRelationHolds: false, reversedRelationHolds: true });
    const zero = deriveReversal({ p: -2, q: 3, k: 0 });
    expect(zero).toMatchObject({ rule: 'rejected', after: 'equal', sameRelationHolds: false, reversedRelationHolds: false });
  });
  it('equal numbers have no order to reverse', () => {
    const d = deriveReversal({ p: 2, q: 2, k: -3 });
    expect(d).toMatchObject({ degenerate: true, before: 'equal', after: 'equal' });
  });
  it('seeded: the true order after is the same for k > 0 and the opposite for k < 0 (checked by comparing kp with kq directly)', () => {
    const r = lcg(9);
    for (let i = 0; i < 500; i++) {
      const p = r(-40, 40) / 4;
      const qq = r(-40, 40) / 4;
      const k = r(-30, 30) / 4;
      const d = deriveReversal({ p, q: qq, k });
      const direct = Math.sign(k * p - k * qq) + 0; // exact: quarters are binary fractions
      const before = Math.sign(p - qq) + 0;
      const expectedAfter = (k === 0 ? 0 : Math.sign(k) * before) + 0;
      expect(direct).toBe(expectedAfter);
      expect(d.after).toBe(expectedAfter < 0 ? 'less' : expectedAfter > 0 ? 'greater' : 'equal');
    }
  });
});

describe('extraneous roots of √(x + p) = x + q', () => {
  it('p = 2, q = 0: x² − x − 2 = 0, roots −1 and 2; −1 is extraneous because √1 = 1 ≠ −1', () => {
    const d = deriveExtraneous({ p: 2, q: 0 });
    expect(d.discriminant).toBe(9n);
    expect([txt(d.squared.linear), txt(d.squared.constant)]).toEqual(['-1/1', '-2/1']);
    expect(d.roots.map(r => txt(r.x.u))).toEqual(['-1/1', '2/1']);
    expect(d.roots.map(r => r.status)).toEqual(['extraneous', 'valid']);
    expect(d.roots.map(r => r.solves)).toEqual(['minus', 'plus']);
    const bad = d.roots[0]!;
    expect(txt(bad.lhs.u)).toBe('1/1'); // √(−1 + 2) = 1
    expect(txt(bad.t.u)).toBe('-1/1'); // x + q = −1
    expect(txt(bad.lhsFromRoot!)).toBe('1/1');
  });
  it('p = q = 0: √x = x has the roots 0 and 1, both valid (t = 0 satisfies both signs)', () => {
    const d = deriveExtraneous({ p: 0, q: 0 });
    expect(d.discriminant).toBe(1n);
    expect(d.roots.map(r => r.status)).toEqual(['valid', 'valid']);
    expect(d.roots.map(r => r.solves)).toEqual(['both', 'plus']);
    expect(d.validCount).toBe(2);
  });
  it('p = 1, q = 0: √(x + 1) = x has the irrational roots (1 ± √5)/2; the golden ratio is valid and (1 − √5)/2 ≈ −0.618 is extraneous', () => {
    const d = deriveExtraneous({ p: 1, q: 0 });
    expect(d.discriminant).toBe(5n);
    const [lo, hi] = d.roots;
    expect(lo!.x).toEqual({ u: q(1, 2), v: q(-1, 2), b: 5n });
    expect(hi!.x).toEqual({ u: q(1, 2), v: q(1, 2), b: 5n });
    expect([lo!.status, hi!.status]).toEqual(['extraneous', 'valid']);
    expect(hi!.approx).toBeCloseTo(1.618033988749895, 12);
    expect(lo!.approx).toBeCloseTo(-0.6180339887498949, 12);
    expect(lo!.radicandIsTSquared && hi!.radicandIsTSquared).toBe(true);
  });
  it('D < 0 means no real root: √x = x + 1 (p = 0, q = 1, D = −3) has no solution at all', () => {
    const d = deriveExtraneous({ p: 0, q: 1 });
    expect(d.discriminant).toBe(-3n);
    expect(d.roots).toEqual([]);
    expect(d.validCount).toBe(0);
  });
  it('the corners of the range: p = 6, q = −6 (D = 49) and p = −6, q = 6 (D = −47)', () => {
    const a = deriveExtraneous({ p: 6, q: -6 });
    expect(a.discriminant).toBe(49n);
    // t = (1 ± 7)/2 = 4 or −3, and x = t − q = t + 6: the roots are 10 (√16 = 4 = x + q) and 3 (√9 = 3, but x + q = −3)
    expect(a.roots.map(r => txt(r.x.u))).toEqual(['3/1', '10/1']);
    expect(a.roots.map(r => r.status)).toEqual(['extraneous', 'valid']);
    const b = deriveExtraneous({ p: -6, q: 6 });
    expect(b.discriminant).toBe(-47n);
    expect(b.roots).toEqual([]);
  });
  it('input contract: whole numbers from −6 to 6 only', () => {
    expect(() => deriveExtraneous({ p: 7, q: 0 })).toThrow(RangeError);
    expect(() => deriveExtraneous({ p: 0, q: 0.5 })).toThrow(RangeError);
  });
  it('exact sign of a radical sum: 3 − 2√2 > 0 (9 > 8), 2 − 2√2 < 0 (4 < 8), −3 + 2√2 < 0', () => {
    expect(sumSign(radicalSum(q(3), q(-2), 2n))).toBe(1);
    expect(sumSign(radicalSum(q(2), q(-2), 2n))).toBe(-1);
    expect(sumSign(radicalSum(q(-3), q(2), 2n))).toBe(-1);
    expect(sumSign(radicalSum(q(0), q(-1), 7n))).toBe(-1);
    expect(sumSign(radicalSum(q(5), q(0), 7n))).toBe(1);
  });
  it('seeded: the exact sign agrees with a 53-bit evaluation whenever that is unambiguous', () => {
    const r = lcg(3);
    const squareFree = [2n, 3n, 5n, 6n, 7n, 10n, 11n, 13n];
    let n = 0;
    for (let i = 0; i < 2000; i++) {
      const s = radicalSum(q(r(-20, 20), r(1, 6)), q(r(-20, 20), r(1, 6)), squareFree[r(0, squareFree.length - 1)]!);
      const approx = sumValue(s);
      if (Math.abs(approx) < 1e-9) continue;
      expect(sumSign(s)).toBe(approx > 0 ? 1 : -1);
      n++;
    }
    expect(n).toBeGreaterThan(1500);
  });
  it('squaring a radical sum: (1 + √5)²/4 = (3 + √5)/2', () => {
    const t = radicalSum(q(1, 2), q(1, 2), 5n);
    expect(sumEq(sumSquare(t), radicalSum(q(3, 2), q(1, 2), 5n))).toBe(true);
  });
});

describe('extraneous roots: the whole range p, q ∈ [−6, 6]', () => {
  const all: { p: number; q: number }[] = [];
  for (let p = -6; p <= 6; p++) for (let qq = -6; qq <= 6; qq++) all.push({ p, q: qq });

  it('D = 4p − 4q + 1 is odd; two roots when D ≥ 1, none when D < 0; D is never 0', () => {
    for (const { p, q: qq } of all) {
      const d = deriveExtraneous({ p, q: qq });
      expect(d.discriminant).toBe(BigInt(4 * p - 4 * qq + 1));
      expect(d.discriminant % 2n).not.toBe(0n);
      expect(d.roots.length).toBe(d.discriminant > 0n ? 2 : 0);
    }
  });
  it('both t values add up to 1, so at least one root is valid whenever there are roots', () => {
    for (const { p, q: qq } of all) {
      const d = deriveExtraneous({ p, q: qq });
      if (d.roots.length === 0) continue;
      const [a, b] = d.roots;
      expect(txt(add(a!.t.u, b!.t.u))).toBe('1/1');
      expect(a!.t.v.num + b!.t.v.num).toBe(0n);
      expect(d.validCount).toBeGreaterThanOrEqual(1);
      expect(d.extraneousCount).toBe(d.discriminant === 1n ? 0 : 1); // t₂ = (1 − √D)/2 ≥ 0 only for D = 1
    }
  });
  it('every root satisfies the squared equation x + p = (x + q)², which is x² + (2q − 1)x + (q² − p) = 0', () => {
    for (const { p, q: qq } of all) {
      const d = deriveExtraneous({ p, q: qq });
      for (const r of d.roots) {
        expect(r.radicandIsTSquared).toBe(true);
        if (r.x.b === 1n) {
          expect(solvesSquared(p, qq, r.x.u)).toBe(true);
          // x² + (2q − 1)x + (q² − p) = 0 directly (the roots are whole numbers here: D is an odd perfect square)
          expect(r.x.u.den).toBe(1n);
          const x = Number(r.x.u.num);
          expect(x * x + (2 * qq - 1) * x + (qq * qq - p)).toBe(0);
        }
      }
    }
  });
  it('rational roots: valid ⇔ √(x + p) = x + q holds; extraneous ⇔ −√(x + p) = x + q holds (direct substitution, not the sign of t)', () => {
    for (const { p, q: qq } of all) {
      const d = deriveExtraneous({ p, q: qq });
      for (const r of d.roots) {
        if (r.x.b !== 1n) continue;
        expect(solvesOriginal(p, qq, r.x.u)).toBe(r.status === 'valid');
        expect(solvesNegated(p, qq, r.x.u)).toBe(r.status === 'extraneous' || r.solves === 'both');
        expect(r.lhsFromRoot !== null && txt(r.lhsFromRoot)).toBe(txt(r.lhs.u));
      }
    }
  });
  it('brute force: the rational solutions of the ORIGINAL equation on a grid of halves are exactly the valid rational roots', () => {
    for (const { p, q: qq } of all) {
      const d = deriveExtraneous({ p, q: qq });
      const found: string[] = [];
      for (let k = -80; k <= 80; k++) { const x = q(k, 2); if (solvesOriginal(p, qq, x)) found.push(txt(x)); }
      const expected = d.roots.filter(r => r.status === 'valid' && r.x.b === 1n).map(r => txt(r.x.u)).sort();
      expect(found.sort()).toEqual(expected);
    }
  });
  it('irrational roots: the decimal root satisfies x + p = (x + q)² to 1e-12, and the exact sign matches the decimal sign of x + q', () => {
    let irrational = 0;
    for (const { p, q: qq } of all) {
      for (const r of deriveExtraneous({ p, q: qq }).roots) {
        if (r.x.b === 1n) continue;
        irrational++;
        const x = r.approx;
        expect(Math.abs(x + p - (x + qq) ** 2)).toBeLessThan(1e-12);
        expect(r.tSign).toBe(x + qq > 0 ? 1 : -1);
        expect(r.status).toBe(x + qq > 0 ? 'valid' : 'extraneous');
      }
    }
    expect(irrational).toBeGreaterThan(60);
  });
});

describe('the division fallacy x(x − c) = m(x − c)', () => {
  it('c = 2, m = 3: the roots are 2 and 3; dividing by (x − 2) concludes only x = 3 and loses x = 2', () => {
    const d = deriveFallacy({ c: 2, m: 3 });
    expect(d.solutions.map(txt)).toEqual(['2/1', '3/1']);
    expect(txt(d.afterDividing)).toBe('3/1');
    expect(d.lost && txt(d.lost)).toBe('2/1');
    expect([txt(d.atC.left), txt(d.atC.right)]).toEqual(['0/1', '0/1']); // at x = 2 both sides are 0
  });
  it('c = m: (x − c)² = 0 has the one root c, and nothing is lost', () => {
    const d = deriveFallacy({ c: 2, m: 2 });
    expect(d.solutions.map(txt)).toEqual(['2/1']);
    expect(d.lost).toBeNull();
  });
  it('the brief\'s example x(x − 2) = 2(x − 2) is the double-root case, not a lost-root case', () => {
    expect(deriveFallacy({ c: 2, m: 2 }).lost).toBeNull();
  });
  it('brute force over every integer and half-integer x: the solutions are exactly {c, m}', () => {
    for (let c = -FALLACY_LIMIT; c <= FALLACY_LIMIT; c++) {
      for (let m = -FALLACY_LIMIT; m <= FALLACY_LIMIT; m++) {
        const d = deriveFallacy({ c, m });
        const found = POINTS.filter(x => isFallacySolution({ c, m }, x)).map(txt);
        expect(found.sort()).toEqual(d.solutions.map(txt).sort());
        expect(d.solutions.map(toNumber)).toEqual([...d.solutions.map(toNumber)].sort((a, b) => a - b));
      }
    }
  });
  it('input contract: integers from −6 to 6', () => {
    expect(() => deriveFallacy({ c: 7, m: 0 })).toThrow(RangeError);
    expect(() => deriveFallacy({ c: 0.5, m: 0 })).toThrow(RangeError);
  });
});

describe('expressions, identities and the distributive law', () => {
  it('classify names the kind from the solution set', () => {
    expect(classify(S(2, 2, '=', 2, 2))).toBe('identity'); // 2(x + 1) = 2x + 2 once expanded
    expect(classify(S(2, 2, '=', 2, 1))).toBe('contradiction');
    expect(classify(S(2, 2, '=', 1, 5))).toBe('conditional-equation'); // x = 3
    expect(classify(S(2, 2, '>', 2, 1))).toBe('always-true');
    expect(classify(S(2, 2, '<', 2, 1))).toBe('never-true');
    expect(classify(S(2, 2, '>', 1, 5))).toBe('conditional-inequality');
  });
  it('a = 2, b = 3, c = 4, x = 5: 2(3·5 + 4) = 38 and 2·3·5 + 2·4 = 30 + 8 = 38, an identity', () => {
    const d = deriveDistribute({ a: 2, b: 3, c: 4, x: 5, form: 'correct' });
    expect([txt(d.inner), txt(d.product), txt(d.firstTerm), txt(d.secondTerm), txt(d.expanded), txt(d.gap)]).toEqual(['19/1', '38/1', '30/1', '8/1', '38/1', '0/1']);
    expect(d.agreesHere).toBe(true);
    expect(d.kind).toBe('identity');
    expect(d.solution).toEqual({ kind: 'all' });
  });
  it('the slip (only the first term multiplied): 38 against 30 + 4 = 34, off by c(a − 1) = 4, and no x makes it true', () => {
    const d = deriveDistribute({ a: 2, b: 3, c: 4, x: 5, form: 'slip' });
    expect([txt(d.secondTerm), txt(d.expanded), txt(d.gap)]).toEqual(['4/1', '34/1', '4/1']);
    expect(d.agreesHere).toBe(false);
    expect(d.kind).toBe('contradiction');
  });
  it('the slip can hide: when a = 1 or c = 0 it coincides with the true expansion', () => {
    expect(deriveDistribute({ a: 1, b: 3, c: 4, x: 5, form: 'slip' }).kind).toBe('identity');
    expect(deriveDistribute({ a: 2, b: 3, c: 0, x: 5, form: 'slip' }).kind).toBe('identity');
  });
  it('seeded: the correct expansion has gap 0 for exact decimals (fractions included), and the slip gap is c(a − 1) at every x', () => {
    const r = lcg(14);
    for (let i = 0; i < 500; i++) {
      const state = { a: r(-400, 400) / 100, b: r(-400, 400) / 100, c: r(-400, 400) / 100, x: r(-1000, 1000) / 100 };
      const good = deriveDistribute({ ...state, form: 'correct' });
      expect(txt(good.gap)).toBe('0/1');
      expect(good.kind).toBe('identity');
      const bad = deriveDistribute({ ...state, form: 'slip' });
      const hand = Math.round(state.c * 100 * (state.a * 100 - 100)); // c(a − 1) in units of 1/10000
      expect(Number(bad.gap.num) * 10000 / Number(bad.gap.den)).toBeCloseTo(hand, 6);
    }
  });
});
