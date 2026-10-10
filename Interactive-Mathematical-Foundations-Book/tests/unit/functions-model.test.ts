/**
 * Domain-model tests for I.5: values and operations, interval sets, domains found by working backwards through a pipeline, images,
 * preimages, composition and inverses. Hand-worked values first (each comment carries the arithmetic), then properties that compare the
 * model's CLAIMS (domain, image, preimage count) with brute-force evaluation on a fine exact grid.
 */
import { describe, expect, it } from 'vitest';
import { composeOps, deriveComposition, deriveInverse, fnDomain, fnImage, fnOps, FN_IDS, type FnId } from '../../src/math/functions/compose';
import { domainOf, pull } from '../../src/math/functions/domain';
import {
  ALL, EMPTY, contains, exceptPoint, intersect, normalise, rayDown, rayUp, setEquals, single, type IntervalSet,
} from '../../src/math/functions/interval';
import {
  A_LIMIT, RULE_IDS, deriveFunction, domainOfRule, imageOfRule, isInjective, isOntoReals, mapsTo, opsOf, preimageCount, preimages, rationalFromNumber, type RuleId,
} from '../../src/math/functions/rule';
import { applyOp, evaluate, evaluateDouble, numEqual, numRational, rationalNum, type Num, type Op } from '../../src/math/functions/value';
import { rational, toNumber, ZERO, type Rational } from '../../src/math/quantity/rational';
import { radicalSum, sumValue } from '../../src/math/algebra/extraneous';

const R = (n: number, d = 1): Rational => rational(BigInt(n), BigInt(d));
const run = (ops: readonly Op[], x: Rational): Num => evaluate(ops, x).output;
const rat = (n: Num): string => { const r = numRational(n); return r ? `${r.num}/${r.den}` : n.kind; };

describe('operations on exact values', () => {
  it('computes (x − 2)² at x = 4 as 4, and at x = 1 as 1', () => {
    const ops = opsOf('shift', 2); // subtract 2, square
    expect(rat(run(ops, R(4)))).toBe('4/1');
    expect(rat(run(ops, R(1)))).toBe('1/1'); // (1 − 2)² = (−1)² = 1
  });
  it('computes √(x + 3) at x = 6 as exactly 3 and at x = 2 as √5', () => {
    const ops = opsOf('root', 3); // add 3, root
    expect(rat(run(ops, R(6)))).toBe('3/1'); // √9
    const five = run(ops, R(2)); // √5: u = 0, v = 1, b = 5
    expect(five.kind).toBe('exact');
    if (five.kind === 'exact') { expect(five.s.b).toBe(5n); expect(five.s.v).toEqual(R(1)); }
  });
  it('reports the refusal of √(x + 3) at x = −4: the radicand is −1', () => {
    const n = run(opsOf('root', 3), R(-4));
    expect(n.kind).toBe('undefined');
  });
  it('refuses the reciprocal at the pole 1/(x − 2) at x = 2: the divisor is 0', () => {
    expect(run(opsOf('pole', 2), R(2)).kind).toBe('undefined');
    expect(rat(run(opsOf('pole', 2), R(4)))).toBe('1/2');
    expect(rat(run(opsOf('pole', 2), R(1)))).toBe('-1/1'); // 1/(1 − 2) = −1
  });
  it('rationalises the reciprocal of a number with a radical: 1/(1 + √2) = −1 + √2 (exactly)', () => {
    const x = applyOp({ op: 'add', c: R(1) }, applyOp({ op: 'sqrt' }, rationalNum(R(2)))); // 1 + √2
    const r = applyOp({ op: 'recip' }, x);
    expect(r.kind).toBe('exact');
    if (r.kind === 'exact') { expect(r.s.u).toEqual(R(-1)); expect(r.s.v).toEqual(R(1)); expect(r.s.b).toBe(2n); expect(r.approx).toBeCloseTo(Math.SQRT2 - 1, 14); }
  });
  it('squares a radical sum exactly: (1 − √3)² = 4 − 2√3', () => {
    const s = applyOp({ op: 'square' }, exactOf(radicalSum(R(1), R(-1), 3n)));
    expect(s.kind === 'exact' && s.s.u).toEqual(R(4));
    expect(s.kind === 'exact' && s.s.v).toEqual(R(-2));
  });
  it('takes the absolute value of an exact negative irrational by its exact sign: |1 − √3| = −1 + √3', () => {
    const s = applyOp({ op: 'abs' }, exactOf(radicalSum(R(1), R(-1), 3n)));
    expect(s.kind === 'exact' && s.s.u).toEqual(R(-1));
    expect(s.kind === 'exact' && s.s.v).toEqual(R(1));
  });
  it('shows the root of a number that contains a radical as a decimal only, and says so', () => {
    const n = applyOp({ op: 'sqrt' }, exactOf(radicalSum(R(1), R(1), 2n))); // √(1 + √2)
    expect(n.kind).toBe('approx');
    if (n.kind === 'approx') { expect(n.value).toBeCloseTo(Math.sqrt(1 + Math.SQRT2), 14); expect(n.reason).toMatch(/not attempted/); }
  });
  it('keeps undefined undefined downstream', () => {
    const e = evaluate(composeOps('lin', 'rec'), ZERO); // 2(1/x) − 1 at 0
    expect(e.output.kind).toBe('undefined');
    expect(e.rows[1]!.after.kind).toBe('undefined');
  });
});
const exactOf = (s: ReturnType<typeof radicalSum>): Num => ({ kind: 'exact', s, approx: sumValue(s) });

describe('interval sets', () => {
  it('normalises: sorts, merges overlaps and touching closed ends, and keeps the gap at an open point', () => {
    const a = normalise([{ lo: R(3), loClosed: true, hi: R(5), hiClosed: true }, { lo: R(0), loClosed: true, hi: R(3), hiClosed: false }]);
    expect(a.length).toBe(1); // [0,3) ∪ [3,5] = [0,5]
    expect(a[0]!.hiClosed).toBe(true);
    const b = normalise([{ lo: R(0), loClosed: true, hi: R(3), hiClosed: false }, { lo: R(3), loClosed: false, hi: R(5), hiClosed: true }]);
    expect(b.length).toBe(2); // [0,3) ∪ (3,5]: 3 is missing
    expect(contains(b, R(3))).toBe(false);
  });
  it('intersects: [−3, ∞) ∩ (−∞, 0) = [−3, 0); ℝ∖{2} ∩ [0, ∞) = [0,2) ∪ (2,∞)', () => {
    expect(setEquals(intersect(rayUp(R(-3), true), rayDown(ZERO, false)), [{ lo: R(-3), loClosed: true, hi: ZERO, hiClosed: false }])).toBe(true);
    expect(intersect(exceptPoint(R(2)), rayUp(ZERO, true)).length).toBe(2);
    expect(isEmptySet(intersect(rayUp(R(1), false), rayDown(R(1), true)))).toBe(true);
  });
});
const isEmptySet = (s: IntervalSet): boolean => s.length === 0;

describe('domains found by working backwards', () => {
  it('matches the hand-worked domains of the six rules', () => {
    for (const a of [-5, -2, 0, 3, 5]) {
      expect(setEquals(domainOfRule('line', a), ALL)).toBe(true);
      expect(setEquals(domainOfRule('stretch', a), ALL)).toBe(true);
      expect(setEquals(domainOfRule('shift', a), ALL)).toBe(true);
      expect(setEquals(domainOfRule('abs', a), ALL)).toBe(true);
      expect(setEquals(domainOfRule('root', a), rayUp(R(-a), true))).toBe(true); // x + a ≥ 0 ⇔ x ≥ −a
      expect(setEquals(domainOfRule('pole', a), exceptPoint(R(a)))).toBe(true); // x − a ≠ 0
    }
  });
  it('composite domains: rt∘lin = [1/2, ∞), rec∘lin = ℝ∖{1/2}, rt∘rec = (0, ∞), rec∘rt = (0, ∞), rec∘sq = ℝ∖{0}, rt∘sq = ℝ', () => {
    const d = (f: FnId, g: FnId) => domainOf(composeOps(f, g));
    expect(setEquals(d('rt', 'lin'), rayUp(R(1, 2), true))).toBe(true);
    expect(setEquals(d('rec', 'lin'), exceptPoint(R(1, 2)))).toBe(true);
    expect(setEquals(d('rt', 'rec'), rayUp(ZERO, false))).toBe(true);
    expect(setEquals(d('rec', 'rt'), rayUp(ZERO, false))).toBe(true);
    expect(setEquals(d('rec', 'sq'), exceptPoint(ZERO))).toBe(true);
    expect(setEquals(d('rt', 'sq'), ALL)).toBe(true);
    expect(setEquals(d('sq', 'lin'), ALL)).toBe(true);
    expect(setEquals(d('rt', 'rt'), rayUp(ZERO, true))).toBe(true);
    expect(setEquals(d('rec', 'rec'), exceptPoint(ZERO))).toBe(true);
  });
  it('refuses to guess the pull-back of a square for an awkward set', () => {
    expect(() => pull({ op: 'square' }, rayUp(R(2), true))).toThrow(RangeError);
  });
  it('agrees with the machine: x is in the computed domain exactly when the pipeline gives a value (exact grid, all rules and all pairs)', () => {
    const grid: Rational[] = [];
    for (let k = -64; k <= 64; k++) grid.push(R(k, 8)); // −8 … 8 in eighths: contains every a, every −a, and 1/2
    for (const rule of RULE_IDS) for (let a = -A_LIMIT; a <= A_LIMIT; a++) {
      const dom = domainOfRule(rule, a);
      const ops = opsOf(rule, a);
      for (const x of grid) expect(contains(dom, x), `${rule} a=${a} x=${toNumber(x)}`).toBe(evaluate(ops, x).output.kind !== 'undefined');
    }
    for (const f of FN_IDS) for (const g of FN_IDS) {
      const ops = composeOps(f, g);
      const dom = domainOf(ops);
      for (const x of grid) expect(contains(dom, x), `${f}∘${g} x=${toNumber(x)}`).toBe(evaluate(ops, x).output.kind !== 'undefined');
    }
  });
});

describe('images', () => {
  const grid: Rational[] = [];
  for (let k = -96; k <= 96; k++) grid.push(R(k, 8));
  it('every value the machine produces lies in the stated image, for every rule and every a', () => {
    for (const rule of RULE_IDS) for (let a = -A_LIMIT; a <= A_LIMIT; a++) {
      const img = imageOfRule(rule, a);
      for (const x of grid) {
        const out = evaluate(opsOf(rule, a), x).output;
        const r = numRational(out);
        if (r) expect(contains(img, r), `${rule} a=${a} x=${toNumber(x)}`).toBe(true);
      }
    }
  });
  it('every rational h in the stated image has a preimage and every h outside it has none', () => {
    for (const rule of RULE_IDS) for (let a = -A_LIMIT; a <= A_LIMIT; a++) {
      const img = imageOfRule(rule, a);
      for (let k = -40; k <= 40; k++) {
        const h = R(k, 4);
        const p = preimages(rule, a, h);
        expect(p.kind !== 'none', `${rule} a=${a} h=${k}/4`).toBe(contains(img, h));
      }
    }
  });
  it('the preimage points really map to h, EXACTLY, and are all of them (count against brute force)', () => {
    for (const rule of RULE_IDS) for (let a = -A_LIMIT; a <= A_LIMIT; a++) for (let k = -12; k <= 12; k++) {
      const h = R(k, 2);
      const p = preimages(rule, a, h);
      if (p.kind === 'points') for (const x of p.xs) expect(mapsTo(rule, a, x, h), `${rule} a=${a} h=${k}/2`).toBe(true);
      if (p.kind === 'points') {
        // distinct points
        const values = p.xs.map(x => sumValue(x));
        expect(new Set(values.map(v => v.toFixed(9))).size).toBe(values.length);
        // brute force: no OTHER rational grid point maps to h
        const found = grid.filter(x => numEqual(evaluate(opsOf(rule, a), x).output, rationalNum(h)));
        const rationalPoints = p.xs.filter(x => x.b === 1n);
        for (const g of found) expect(rationalPoints.some(x => toNumber(x.u) === toNumber(g)), `${rule} a=${a} h=${k}/2 x=${toNumber(g)}`).toBe(true);
      }
    }
  });
  it('hand-worked: (x − 2)² = 9 at x = −1 and 5; a·x² for a = −2, h = −8 at ±2; 1/(x − 2) = 1/4 at 6; √(x + 3) = 2 at 1; |x − 2| = 3 at −1 and 5', () => {
    const at = (rule: RuleId, a: number, h: Rational) => { const p = preimages(rule, a, h); return p.kind === 'points' ? p.xs.map(x => Math.round(sumValue(x) * 1e9) / 1e9) : p.kind; };
    expect(at('shift', 2, R(9))).toEqual([-1, 5]);
    expect(at('stretch', -2, R(-8))).toEqual([-2, 2]);
    expect(at('pole', 2, R(1, 4))).toEqual([6]);
    expect(at('root', 3, R(2))).toEqual([1]);
    expect(at('abs', 2, R(3))).toEqual([-1, 5]);
    expect(at('shift', 2, R(-1))).toBe('none');
    expect(at('line', 0, ZERO)).toBe('all');
    expect(preimageCount(preimages('shift', 2, R(2)))).toBe(2); // 2 ± √2
    expect(preimageCount(preimages('shift', 2, ZERO))).toBe(1);
  });
  it('injective and onto agree with the preimage counts', () => {
    for (const rule of RULE_IDS) for (let a = -A_LIMIT; a <= A_LIMIT; a++) {
      let most = 0;
      let everything = true;
      for (let k = -40; k <= 40; k++) {
        const c = preimageCount(preimages(rule, a, R(k, 4)));
        most = Math.max(most, c === 'all' ? 99 : c);
        if (c === 0) everything = false;
      }
      expect(isInjective(rule, a), `${rule} a=${a}`).toBe(most <= 1);
      expect(isOntoReals(rule, a), `${rule} a=${a}`).toBe(everything && contains(imageOfRule(rule, a), ZERO) && setEquals(imageOfRule(rule, a), ALL));
    }
  });
  it('line and stretch with a = 0 are constants with image {0}', () => {
    expect(setEquals(imageOfRule('line', 0), single(ZERO))).toBe(true);
    expect(setEquals(imageOfRule('stretch', 0), single(ZERO))).toBe(true);
    expect(setEquals(imageOfRule('stretch', -3), rayDown(ZERO, true))).toBe(true);
  });
});

describe('derived state for one input', () => {
  it('canonical (x − 2)² at x = 4: y = 4, in the domain, image [0,∞), not injective, not onto', () => {
    const d = deriveFunction({ rule: 'shift', a: 2, x: 4 });
    expect(rat(d.output)).toBe('4/1');
    expect(d.inDomain).toBe(true);
    expect(d.injective).toBe(false);
    expect(d.onto).toBe(false);
    expect(d.evaluation.rows.map(r => rat(r.after))).toEqual(['2/1', '4/1']);
  });
  it('flags an input outside the domain', () => {
    const d = deriveFunction({ rule: 'root', a: 3, x: -4 });
    expect(d.inDomain).toBe(false);
    expect(d.output.kind).toBe('undefined');
  });
  it('rationalFromNumber reads two decimals exactly and rejects three', () => {
    expect(rationalFromNumber(-1.25)).toEqual(R(-5, 4));
    expect(() => rationalFromNumber(0.001)).toThrow(RangeError);
  });
  it('the double machine equals the exact machine on the grid', () => {
    for (const rule of RULE_IDS) for (const a of [-3, 0, 2]) for (let k = -40; k <= 40; k++) {
      const x = R(k, 8);
      const exact = evaluate(opsOf(rule, a), x).output;
      const dbl = evaluateDouble(opsOf(rule, a), toNumber(x));
      if (exact.kind === 'undefined') expect(dbl).toBeNull();
      else expect(Math.abs((dbl as number) - (exact.kind === 'exact' ? exact.approx : exact.value))).toBeLessThan(1e-12);
    }
  });
});

describe('composition', () => {
  it('f ∘ g and g ∘ f differ: sq ∘ lin at 3 is (2·3 − 1)² = 25, lin ∘ sq at 3 is 2·9 − 1 = 17', () => {
    const d = deriveComposition({ f: 'sq', g: 'lin', x: 3 });
    expect(rat(d.fg.output)).toBe('25/1');
    expect(rat(d.gf.output)).toBe('17/1');
    expect(d.sameValue).toBe(false);
    expect(d.fg.rows.map(r => rat(r.after))).toEqual(['6/1', '5/1', '25/1']);
  });
  it('they can agree at one x: sq ∘ lin and lin ∘ sq at x = 1 are both 1', () => {
    const d = deriveComposition({ f: 'sq', g: 'lin', x: 1 });
    expect(rat(d.fg.output)).toBe('1/1');
    expect(rat(d.gf.output)).toBe('1/1');
    expect(d.sameValue).toBe(true);
  });
  it('rec ∘ rec is the identity where defined; rt ∘ sq is |x|; sq ∘ rt is x on [0, ∞)', () => {
    for (let k = -20; k <= 20; k++) {
      const x = R(k, 4);
      const rr = evaluate(composeOps('rec', 'rec'), x).output;
      if (k === 0) expect(rr.kind).toBe('undefined'); else expect(numEqual(rr, rationalNum(x))).toBe(true);
      const abs = evaluate(composeOps('rt', 'sq'), x).output;
      expect(numEqual(abs, rationalNum(R(Math.abs(k), 4)))).toBe(true);
      const sr = evaluate(composeOps('sq', 'rt'), x).output;
      if (k < 0) expect(sr.kind).toBe('undefined'); else expect(numEqual(sr, rationalNum(x))).toBe(true);
    }
  });
  it('a composite of two rationals can leave the rationals: rt ∘ lin at x = 2 is √3, and lin ∘ rt at x = 3 is 2√3 − 1 exactly', () => {
    const a = deriveComposition({ f: 'rt', g: 'lin', x: 2 });
    expect(a.fg.output.kind === 'exact' && a.fg.output.s.b).toBe(3n);
    const b = deriveComposition({ f: 'lin', g: 'rt', x: 3 });
    expect(b.fg.output.kind === 'exact' && b.fg.output.s.u).toEqual(R(-1));
    expect(b.fg.output.kind === 'exact' && b.fg.output.s.v).toEqual(R(2));
  });
  it('catalogue domains and images', () => {
    expect(setEquals(fnDomain('rt'), rayUp(ZERO, true))).toBe(true);
    expect(setEquals(fnDomain('rec'), exceptPoint(ZERO))).toBe(true);
    expect(setEquals(fnImage('sq'), rayUp(ZERO, true))).toBe(true);
    expect(fnOps('lin').length).toBe(2);
    expect(setEquals(EMPTY, [])).toBe(true);
  });
});

describe('inverses', () => {
  it('f⁻¹(f(x)) = x exactly for lin, rt, rec and restricted sq on a grid', () => {
    for (const fn of FN_IDS) for (let k = -40; k <= 40; k++) {
      const x = k / 4;
      const d = deriveInverse({ fn, x, restrict: true });
      if (d.inDomain && d.forward.output.kind !== 'undefined') expect(d.roundTrip, `${fn} x=${x}`).toBe(true);
    }
  });
  it('sq without the restriction has no inverse: 3 and −3 give the same output', () => {
    const d = deriveInverse({ fn: 'sq', x: 3, restrict: false });
    expect(d.hasInverse).toBe(false);
    expect(d.backward).toBeNull();
    expect(d.twin).toEqual(R(-3));
    expect(deriveInverse({ fn: 'sq', x: 0, restrict: false }).twin).toBeNull();
  });
  it('restricted sq: x = −3 is outside the restricted domain', () => {
    const d = deriveInverse({ fn: 'sq', x: -3, restrict: true });
    expect(d.inDomain).toBe(false);
    expect(d.backward).toBeNull();
  });
  it('lin inverse: x = 3 gives y = 5, and (5 + 1)/2 = 3', () => {
    const d = deriveInverse({ fn: 'lin', x: 3, restrict: true });
    expect(rat(d.forward.output)).toBe('5/1');
    expect(rat(d.backward!.output)).toBe('3/1');
  });
});
