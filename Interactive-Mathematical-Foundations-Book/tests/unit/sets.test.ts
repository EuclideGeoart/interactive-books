/**
 * Sets, intervals, products and relations (I.7). Every claim is checked against a second, deliberately naive computation:
 * membership of each point is decided from the raw specification (never from the normalised pieces), and finite-set identities are checked
 * on EVERY pair of subsets of the universe or of {1, …, 6}.
 */
import { describe, expect, it } from 'vitest';
import { rat, fromDecimal, compare, equals, type Rat } from '../../src/math/families/rational';
import {
  CANONICAL_SETS, FULL_MASK, SET_OPS, UNIVERSE, UNIVERSE_SIZE, checkSets, deriveSets, hasItem, itemsOf, maskOf, toggleItem, type SetOp,
} from '../../src/math/sets/finite';
import {
  EMPTY, WHOLE_LINE, complement, contains, difference, junction, emptyReason, equalSets, fromSpec, intersect, isInterval, isSinglePoint, membership, normalise,
  pieceSpoken, setSpoken, setTex, setText, specTex, union, type IntervalSet, type IntervalSpec, type Endpoint,
} from '../../src/math/sets/intervals';
import { CANONICAL_PRODUCT, PRODUCT_FULL, deriveProduct, productItems, productMask, toggleProduct } from '../../src/math/sets/product';
import {
  CANONICAL_RELATION, PRESET_TESTS, checkRelation, deriveRelation, presetCells, presetState, resize, toggleCell, type PresetId, type RelationState,
} from '../../src/math/sets/relations';

const r = (n: number, d = 1) => rat(n, d);
const spec = (lo: Endpoint | number, hi: Endpoint | number, loClosed: boolean, hiClosed: boolean): IntervalSpec => ({
  lo: typeof lo === 'number' ? r(lo) : lo, hi: typeof hi === 'number' ? r(hi) : hi, loClosed, hiClosed,
});
const set = (lo: Endpoint | number, hi: Endpoint | number, lc: boolean, hc: boolean) => fromSpec(spec(lo, hi, lc, hc));
const show = (s: IntervalSet) => setText(s);

describe('finite sets over U = {1, …, 12}', () => {
  const masks = Array.from({ length: FULL_MASK + 1 }, (_, m) => m);
  it('every operation agrees with the elementwise definition on EVERY pair of subsets of a 6-element universe', () => {
    // 64 × 64 pairs inside {1..6}; the remaining six elements are exercised by the random sweep below.
    for (let a = 0; a < 64; a++) for (let b = 0; b < 64; b++) {
      const d = deriveSets({ a, b, op: 'union' });
      const A = new Set(itemsOf(a));
      const B = new Set(itemsOf(b));
      expect(d.union).toEqual(UNIVERSE.filter(i => A.has(i) || B.has(i)));
      expect(d.intersection).toEqual(UNIVERSE.filter(i => A.has(i) && B.has(i)));
      expect(d.aMinusB).toEqual(UNIVERSE.filter(i => A.has(i) && !B.has(i)));
      expect(d.symmetric).toEqual(UNIVERSE.filter(i => A.has(i) !== B.has(i)));
    }
  });
  it('inclusion–exclusion, both De Morgan laws and the four-region partition hold on 20000 random pairs from the whole universe', () => {
    let seed = 12345;
    const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % (FULL_MASK + 1); };
    for (let t = 0; t < 20000; t++) {
      const a = next();
      const b = next();
      const d = deriveSets({ a, b, op: 'intersection' });
      expect(d.inclusionExclusion.holds).toBe(true);
      expect(d.deMorgan.firstHolds).toBe(true);
      expect(d.deMorgan.secondHolds).toBe(true);
      const { onlyA, both, onlyB, neither } = d.regions;
      expect([...onlyA, ...both, ...onlyB, ...neither].sort((x, y) => x - y)).toEqual([...UNIVERSE]);
      expect(onlyA.length + both.length).toBe(d.A.length);
      expect(onlyB.length + both.length).toBe(d.B.length);
      expect(d.disjoint).toBe(both.length === 0);
    }
  });
  it('the canonical state A = {1,…,5}, B = {4,…,7}', () => {
    const d = deriveSets(CANONICAL_SETS);
    expect(d.union).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(d.intersection).toEqual([4, 5]);
    expect(d.aMinusB).toEqual([1, 2, 3]);
    expect(d.bMinusA).toEqual([6, 7]);
    expect(d.symmetric).toEqual([1, 2, 3, 6, 7]);
    expect(d.complementA).toEqual([6, 7, 8, 9, 10, 11, 12]);
    expect(d.inclusionExclusion).toEqual({ direct: 7, formula: 7, holds: true });
    expect(d.subsetAB).toEqual({ holds: false, witness: 1 });
    expect(d.subsetBA).toEqual({ holds: false, witness: 6 });
  });
  it('subset facts: witness is the smallest element missing; proper subset only when not equal', () => {
    const sub = deriveSets({ a: maskOf([2, 3]), b: maskOf([1, 2, 3, 4]), op: 'union' });
    expect(sub.subsetAB).toEqual({ holds: true, witness: null });
    expect(sub.properSubsetAB).toBe(true);
    expect(sub.properSubsetBA).toBe(false);
    expect(sub.subsetBA).toEqual({ holds: false, witness: 1 });
    const eq = deriveSets({ a: maskOf([2, 3]), b: maskOf([3, 2]), op: 'union' });
    expect(eq.equal).toBe(true);
    expect(eq.properSubsetAB).toBe(false);
    const empty = deriveSets({ a: 0, b: 0, op: 'union' });
    expect(empty.equal).toBe(true);
    expect(empty.disjoint).toBe(true);
    expect(deriveSets({ a: 0, b: maskOf([1]), op: 'union' }).properSubsetAB).toBe(true); // ∅ ⊂ {1}
  });
  it('the empty set and the whole universe', () => {
    const d = deriveSets({ a: 0, b: FULL_MASK, op: 'complement-b' });
    expect(d.union).toEqual([...UNIVERSE]);
    expect(d.intersection).toEqual([]);
    expect(d.selected).toEqual([]);
    expect(deriveSets({ a: 0, b: 0, op: 'complement-a' }).selected).toEqual([...UNIVERSE]);
  });
  it('every op selects the matching set', () => {
    const state = { a: maskOf([1, 2, 3]), b: maskOf([3, 4]) };
    const expected: Record<SetOp, number[]> = {
      union: [1, 2, 3, 4], intersection: [3], 'a-minus-b': [1, 2], 'b-minus-a': [4], symmetric: [1, 2, 4],
      'complement-a': [4, 5, 6, 7, 8, 9, 10, 11, 12], 'complement-b': [1, 2, 5, 6, 7, 8, 9, 10, 11, 12],
    };
    for (const op of SET_OPS) expect(deriveSets({ ...state, op }).selected).toEqual(expected[op]);
  });
  it('mask helpers: toggle is an involution, maskOf rejects values outside U, check rejects bad states', () => {
    for (const i of UNIVERSE) { const m = toggleItem(maskOf([3]), i); expect(toggleItem(m, i)).toBe(maskOf([3])); expect(hasItem(m, i)).toBe(i !== 3); }
    expect(() => maskOf([0])).toThrow(RangeError);
    expect(() => maskOf([13])).toThrow(RangeError);
    expect(() => maskOf([1.5])).toThrow(RangeError);
    expect(() => checkSets({ a: -1, b: 0, op: 'union' })).toThrow(RangeError);
    expect(() => checkSets({ a: 0, b: FULL_MASK + 1, op: 'union' })).toThrow(RangeError);
    expect(() => checkSets({ a: 0, b: 0, op: 'nope' as SetOp })).toThrow(RangeError);
    expect(UNIVERSE_SIZE).toBe(12);
    expect(masks.length).toBe(4096);
  });
});

describe('intervals: the adjacency table', () => {
  const cases: [string, IntervalSet, string][] = [
    ['(0,1) ∪ (1,2)', union(set(0, 1, false, false), set(1, 2, false, false)), '(0, 1) ∪ (1, 2)'],
    ['[0,1) ∪ (1,2]', union(set(0, 1, true, false), set(1, 2, false, true)), '[0, 1) ∪ (1, 2]'],
    ['[0,1] ∪ (1,2)', union(set(0, 1, true, true), set(1, 2, false, false)), '[0, 2)'],
    ['[0,1) ∪ [1,2]', union(set(0, 1, true, false), set(1, 2, true, true)), '[0, 2]'],
    ['[0,1] ∪ [1,2]', union(set(0, 1, true, true), set(1, 2, true, true)), '[0, 2]'],
    ['[0,1] ∩ [1,2]', intersect(set(0, 1, true, true), set(1, 2, true, true)), '{1}'],
    ['[0,1) ∩ [1,2]', intersect(set(0, 1, true, false), set(1, 2, true, true)), '∅'],
    ['(0,1] ∩ [1,2)', intersect(set(0, 1, false, true), set(1, 2, true, false)), '{1}'],
    ['(0,1) ∩ (1,2)', intersect(set(0, 1, false, false), set(1, 2, false, false)), '∅'],
    ['complement of {1}', complement(set(1, 1, true, true)), '(−∞, 1) ∪ (1, ∞)'],
    ['complement of ℝ', complement(WHOLE_LINE), '∅'],
    ['complement of ∅', complement(EMPTY), 'ℝ'],
    ['complement of [0,1)', complement(set(0, 1, true, false)), '(−∞, 0) ∪ [1, ∞)'],
    ['complement of (−∞,2]', complement(set(null, 2, false, true)), '(2, ∞)'],
    ['complement of (0,1) ∪ (1,2)', complement(union(set(0, 1, false, false), set(1, 2, false, false))), '(−∞, 0] ∪ {1} ∪ [2, ∞)'],
  ];
  for (const [name, got, text] of cases) it(name, () => expect(show(got)).toBe(text));

  it('piece counts: touching pieces merge only when one side includes the shared point', () => {
    expect(union(set(0, 1, false, false), set(1, 2, false, false))).toHaveLength(2);
    expect(union(set(0, 1, true, true), set(1, 2, false, false))).toHaveLength(1);
    expect(union(set(0, 1, false, true), set(1, 2, true, false))).toHaveLength(1);
    expect(isInterval(union(set(0, 1, false, false), set(1, 2, false, false)))).toBe(false);
  });
  it('a reversed specification is the empty set with a reason, never rejected or swapped', () => {
    expect(fromSpec(spec(3, 1, true, true))).toEqual(EMPTY);
    expect(emptyReason(spec(3, 1, true, true))).toMatch(/greater than the right end/);
    expect(fromSpec(spec(1, 1, true, false))).toEqual(EMPTY);
    expect(emptyReason(spec(1, 1, true, false))).toMatch(/excluded/);
    expect(emptyReason(spec(1, 1, true, true))).toBeNull();
    expect(emptyReason(spec(0, 1, false, false))).toBeNull();
    expect(emptyReason(spec(null, null, false, false))).toBeNull();
    expect(emptyReason(spec(null, -5, false, false))).toBeNull();
  });
  it('infinite ends are always open: a "closed" infinity is treated as open', () => {
    const s = fromSpec(spec(null, 1, true, true));
    expect(show(s)).toBe('(−∞, 1]');
    expect(isSinglePoint(set(2, 2, true, true))).toBe(true);
    expect(isSinglePoint(set(2, 3, true, true))).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------- exhaustive brute force
describe('interval operations agree with membership decided from the raw specifications', () => {
  const ENDS: Endpoint[] = [null, r(-1), r(0), r(1), r(2)];
  const specs: IntervalSpec[] = [];
  for (const lo of ENDS) for (const hi of ENDS) for (const lc of [false, true]) for (const hc of [false, true]) specs.push({ lo, hi, loClosed: lc, hiClosed: hc });
  /** Membership straight from the inequalities, ignoring normalisation entirely. */
  const raw = (s: IntervalSpec, x: Rat): boolean => (s.lo === null || (s.loClosed ? compare(x, s.lo) >= 0 : compare(x, s.lo) > 0)) && (s.hi === null || (s.hiClosed ? compare(x, s.hi) <= 0 : compare(x, s.hi) < 0));
  /** Points at every end, every midpoint between consecutive ends, and one beyond each side. */
  const POINTS: Rat[] = Array.from({ length: 13 }, (_, i) => r(i - 6, 2)); // −3 … 3 in halves
  const normalForm = (s: IntervalSet) => {
    for (let i = 0; i < s.length; i++) {
      const p = s[i]!;
      if (p.lo !== null && p.hi !== null) { expect(compare(p.lo, p.hi)).toBeLessThanOrEqual(0); if (compare(p.lo, p.hi) === 0) expect(p.loClosed && p.hiClosed).toBe(true); }
      if (p.lo === null) expect(p.loClosed).toBe(false);
      if (p.hi === null) expect(p.hiClosed).toBe(false);
      if (i > 0) {
        const prev = s[i - 1]!;
        expect(prev.hi).not.toBeNull();
        expect(p.lo).not.toBeNull();
        const c = compare(prev.hi!, p.lo!);
        expect(c).toBeLessThanOrEqual(0); // sorted, disjoint
        if (c === 0) expect(prev.hiClosed || p.loClosed).toBe(false); // otherwise they would have merged
      }
    }
  };

  it(`union, intersection and complement of all ${specs.length ** 2} ordered pairs of specifications`, () => {
    for (const sa of specs) for (const sb of specs) {
      const a = fromSpec(sa);
      const b = fromSpec(sb);
      const u = union(a, b);
      const n = intersect(a, b);
      normalForm(u);
      normalForm(n);
      for (const x of POINTS) {
        const inA = raw(sa, x);
        const inB = raw(sb, x);
        if (contains(a, x) !== inA || contains(b, x) !== inB) throw new Error(`fromSpec disagrees at ${x.num}/${x.den}`);
        if (contains(u, x) !== (inA || inB)) throw new Error(`union ${show(a)} ∪ ${show(b)} wrong at ${x.num}/${x.den}`);
        if (contains(n, x) !== (inA && inB)) throw new Error(`intersection ${show(a)} ∩ ${show(b)} wrong at ${x.num}/${x.den}`);
      }
    }
  });
  it('complement is exact, an involution, and splits ℝ: every point is in exactly one of S and its complement', () => {
    for (const sa of specs) {
      const a = fromSpec(sa);
      const c = complement(a);
      normalForm(c);
      expect(equalSets(complement(c), a)).toBe(true);
      for (const x of POINTS) expect(contains(c, x)).toBe(!raw(sa, x));
      expect(intersect(a, c)).toEqual(EMPTY);
      expect(equalSets(union(a, c), WHOLE_LINE)).toBe(true);
    }
  });
  it('normalisation is idempotent and order-independent', () => {
    const pieces = specs.slice(0, 40).map(fromSpec).flat();
    const once = normalise(pieces);
    expect(equalSets(normalise(once), once)).toBe(true);
    expect(equalSets(normalise([...pieces].reverse()), once)).toBe(true);
  });
  it('De Morgan holds for intervals: (A ∪ B)ᶜ = Aᶜ ∩ Bᶜ and (A ∩ B)ᶜ = Aᶜ ∪ Bᶜ for all pairs', () => {
    for (const sa of specs) for (const sb of specs) {
      const a = fromSpec(sa);
      const b = fromSpec(sb);
      expect(equalSets(complement(union(a, b)), intersect(complement(a), complement(b)))).toBe(true);
      expect(equalSets(complement(intersect(a, b)), union(complement(a), complement(b)))).toBe(true);
    }
  });
  it('exact arithmetic: 0.1 + 0.2 is exactly 0.3 here, so the closed interval [0.3, 0.3] contains it', () => {
    const tenth = fromDecimal(0.1, 2)!;
    const fifth = fromDecimal(0.2, 2)!;
    const x = rat(tenth.num * fifth.den + fifth.num * tenth.den, tenth.den * fifth.den);
    expect(equals(x, fromDecimal(0.3, 2)!)).toBe(true);
    expect(contains(set(fromDecimal(0.3, 2)!, fromDecimal(0.3, 2)!, true, true), x)).toBe(true);
    expect(0.1 + 0.2 === 0.3).toBe(false); // the double-precision pitfall the chapter warns about
  });
});

describe('how two intervals meet (decides whether the union is one interval)', () => {
  const kind = (a: IntervalSet, b: IntervalSet) => junction(a, b).kind;
  it('classifies every adjacency case, in either order, and agrees with the piece count of the union', () => {
    const cases: [IntervalSet, IntervalSet, string][] = [
      [set(0, 1, false, false), set(1, 2, false, false), 'touch-gap'],
      [set(0, 1, true, false), set(1, 2, false, true), 'touch-gap'],
      [set(0, 1, true, true), set(1, 2, false, false), 'touch-joined'],
      [set(0, 1, true, false), set(1, 2, true, true), 'touch-joined'],
      [set(0, 1, true, true), set(1, 2, true, true), 'overlap'],
      [set(0, 2, true, true), set(1, 3, false, false), 'overlap'],
      [set(0, 1, false, false), set(2, 3, false, false), 'apart'],
      [set(0, 1, true, true), EMPTY, 'empty'],
      [set(null, 1, false, false), set(1, null, false, false), 'touch-gap'],
      [set(null, 1, false, true), set(1, null, false, false), 'touch-joined'],
    ];
    for (const [a, b, want] of cases) {
      expect(kind(a, b)).toBe(want);
      expect(kind(b, a)).toBe(want);
      const pieces = union(a, b).length;
      if (want === 'touch-gap' || want === 'apart') expect(pieces).toBe(2);
      if (want === 'touch-joined' || want === 'overlap') expect(pieces).toBe(1);
    }
    expect(() => junction(union(set(0, 1, true, true), set(3, 4, true, true)), set(0, 1, true, true))).toThrow(RangeError);
    const at = junction(set(0, 1, false, false), set(1, 2, false, false));
    expect(at.kind === 'touch-gap' && at.at.num === 1n && at.at.den === 1n).toBe(true);
  });
  it('difference is a ∩ bᶜ', () => {
    expect(show(difference(set(0, 10, true, true), set(2, 3, false, false)))).toBe('[0, 2] ∪ [3, 10]');
    expect(difference(set(0, 1, true, true), set(0, 1, true, true))).toEqual(EMPTY);
    expect(show(difference(WHOLE_LINE, set(0, 1, true, false)))).toBe('(−∞, 0) ∪ [1, ∞)');
  });
});

describe('membership reasons', () => {
  const s = union(set(0, 1, false, false), set(1, 2, false, false));
  it('names the reason and the pieces involved', () => {
    expect(membership(s, r(1, 2))).toMatchObject({ member: true, kind: 'inside' });
    const one = membership(s, r(1));
    expect(one).toMatchObject({ member: false, kind: 'open-end', end: 'right' });
    expect(one.after).not.toBeNull();
    expect(membership(s, r(0))).toMatchObject({ member: false, kind: 'open-end', end: 'left' });
    expect(membership(s, r(-1))).toMatchObject({ member: false, kind: 'left-of-all' });
    expect(membership(s, r(3))).toMatchObject({ member: false, kind: 'right-of-all' });
    expect(membership(EMPTY, r(0))).toMatchObject({ member: false, kind: 'empty-set' });
    expect(membership(set(0, 1, true, true), r(1))).toMatchObject({ member: true, kind: 'closed-end', end: 'right' });
    expect(membership(set(0, 1, true, true), r(0))).toMatchObject({ member: true, kind: 'closed-end', end: 'left' });
    const gap = union(set(0, 1, false, false), set(2, 3, false, false));
    const g = membership(gap, r(3, 2));
    expect(g).toMatchObject({ member: false, kind: 'gap' });
    expect(g.before).not.toBeNull();
    expect(g.after).not.toBeNull();
    expect(membership(WHOLE_LINE, r(-100))).toMatchObject({ member: true, kind: 'inside' });
  });
});

describe('interval text: strict-KaTeX edge states', () => {
  it('∅, ℝ, a point, both rays, rational ends, negative ends, a>b', () => {
    const states: IntervalSet[] = [
      EMPTY, WHOLE_LINE, set(2, 2, true, true), set(null, 1, false, false), set(1, null, true, false), complement(set(1, 1, true, true)),
      set(rat(-1, 3), rat(2, 7), true, false), set(fromDecimal(-2.75, 2)!, fromDecimal(0.05, 2)!, false, true), fromSpec(spec(3, 1, true, true)),
      union(set(0, 1, false, false), set(1, 2, false, false)),
    ];
    for (const s of states) {
      expect(setTex(s)).not.toMatch(/[^\x20-\x7e]/); // pure ASCII TeX: no Unicode that strict KaTeX would reject
      expect(setSpoken(s)).not.toMatch(/[−∞∅∪]/);
    }
    expect(setTex(set(rat(-1, 3), rat(2, 7), true, false))).toBe('[-\\frac{1}{3},\\,\\frac{2}{7})');
    expect(setTex(EMPTY)).toBe('\\varnothing');
    expect(setTex(WHOLE_LINE)).toBe('\\mathbb{R}');
    expect(specTex(spec(null, 5, true, true))).toBe('(-\\infty,\\,5]');
    expect(pieceSpoken(set(0, 1, true, false)[0]!)).toContain('included');
  });
});

describe('products', () => {
  const full = PRODUCT_FULL;
  it('|A × B| = |A|·|B| and A × B = B × A ⇔ A = B or an empty factor, for ALL 64 × 64 pairs', () => {
    for (let a = 0; a <= full; a++) for (let b = 0; b <= full; b++) {
      const d = deriveProduct({ a, b });
      expect(d.count.holds).toBe(true);
      expect(d.pairs).toHaveLength(d.A.length * d.B.length);
      expect(d.commutes).toBe(d.commutesByTheorem);
      expect(d.commutes).toBe(a === b || a === 0 || b === 0);
      if (!d.commutes) {
        expect(d.witness).not.toBeNull();
        const [x, y] = d.witness!;
        expect(d.A).toContain(x);
        expect(d.B).toContain(y);
        // the witness really is missing from B × A: (x, y) ∈ B × A would need x ∈ B and y ∈ A
        expect(d.B.includes(x) && d.A.includes(y)).toBe(false);
      } else expect(d.witness).toBeNull();
      expect(d.onlyInProduct.length === 0 && d.onlyInReversed.length === 0).toBe(d.commutes);
      // the two differences are mirror images of each other: (x, y) only in A × B  ⇔  (y, x) only in B × A… so they have equal size
      expect(d.onlyInProduct).toHaveLength(d.pairs.length - d.pairs.filter(([x, y]) => d.B.includes(x) && d.A.includes(y)).length);
    }
  });
  it('reason strings and the canonical state', () => {
    const d = deriveProduct(CANONICAL_PRODUCT);
    expect(d.A).toEqual([1, 2, 3]);
    expect(d.B).toEqual([3, 4]);
    expect(d.pairs).toEqual([[1, 3], [2, 3], [3, 3], [1, 4], [2, 4], [3, 4]]);
    expect(d.count).toEqual({ pairs: 6, product: 6, holds: true });
    expect(d.reason).toBe('different-sets');
    expect(d.witness).toEqual([1, 3]);
    expect(deriveProduct({ a: 5, b: 5 }).reason).toBe('equal-sets');
    expect(deriveProduct({ a: 0, b: 5 }).reason).toBe('empty-factor');
    expect(deriveProduct({ a: 0, b: 0 }).reason).toBe('equal-sets');
  });
  it('an order matters example: {1}×{2} = {(1,2)} but {2}×{1} = {(2,1)}', () => {
    const d = deriveProduct({ a: productMask([1]), b: productMask([2]) });
    expect(d.pairs).toEqual([[1, 2]]);
    expect(d.reversed).toEqual([[2, 1]]);
    expect(d.commutes).toBe(false);
  });
  it('helpers and validation', () => {
    expect(productItems(productMask([2, 4, 6]))).toEqual([2, 4, 6]);
    expect(toggleProduct(toggleProduct(5, 2), 2)).toBe(5);
    expect(() => deriveProduct({ a: 64, b: 0 })).toThrow(RangeError);
    expect(() => deriveProduct({ a: 0, b: -1 })).toThrow(RangeError);
    expect(() => deriveProduct({ a: 1.5, b: 0 })).toThrow(RangeError);
  });
});

describe('relations', () => {
  const on = (id: PresetId, n = 4) => deriveRelation(presetState(id, n, n));
  it('presets have the textbook properties on {1, …, 4}', () => {
    const lt = on('less');
    expect([lt.reflexive!.holds, lt.symmetric!.holds, lt.antisymmetric!.holds, lt.transitive!.holds, lt.equivalence]).toEqual([false, false, true, true, false]);
    const le = on('at-most');
    expect([le.reflexive!.holds, le.symmetric!.holds, le.antisymmetric!.holds, le.transitive!.holds, le.equivalence]).toEqual([true, false, true, true, false]);
    const eq = on('equal');
    expect([eq.reflexive!.holds, eq.symmetric!.holds, eq.antisymmetric!.holds, eq.transitive!.holds, eq.equivalence]).toEqual([true, true, true, true, true]);
    expect(eq.classes).toEqual([[1], [2], [3], [4]]);
    const div = on('divides', 6);
    expect([div.reflexive!.holds, div.symmetric!.holds, div.antisymmetric!.holds, div.transitive!.holds, div.equivalence]).toEqual([true, false, true, true, false]);
    const par = on('same-parity', 5);
    expect([par.reflexive!.holds, par.symmetric!.holds, par.antisymmetric!.holds, par.transitive!.holds, par.equivalence]).toEqual([true, true, false, true, true]);
    expect(par.classes).toEqual([[1, 3, 5], [2, 4]]);
    const none = on('empty');
    expect([none.reflexive!.holds, none.symmetric!.holds, none.antisymmetric!.holds, none.transitive!.holds, none.equivalence]).toEqual([false, true, true, true, false]);
    const all = on('all');
    expect(all.equivalence).toBe(true);
    expect(all.classes).toEqual([[1, 2, 3, 4]]);
  });
  it('witnesses name the failing element, pair or triple', () => {
    const lt = on('less');
    expect(lt.reflexive!.witness).toBe(1);
    expect(lt.symmetric!.witness).toEqual([1, 2]); // 1 < 2 but not 2 < 1
    expect(on('same-parity', 5).antisymmetric!.witness).toEqual([3, 1]); // pairs are listed b outer, a inner: (3,1) related to (1,3) with 3 ≠ 1
    const broken = deriveRelation({ n: 3, k: 3, cells: '110' + '011' + '000' }); // a→b: row b=1: (1,1),(2,1); b=2: (2,2),(3,2)
    expect(broken.transitive).toMatchObject({ holds: false });
    const [a, b, c] = broken.transitive!.witness as readonly [number, number, number];
    const has = (x: number, y: number) => broken.pairs.some(p => p[0] === x && p[1] === y);
    expect(has(a, b) && has(b, c) && !has(a, c)).toBe(true);
  });
  it('the property definitions are re-derived from the pair list on EVERY relation on a 3-element set (512 relations)', () => {
    for (let m = 0; m < 512; m++) {
      const cells = m.toString(2).padStart(9, '0');
      const d = deriveRelation({ n: 3, k: 3, cells });
      const has = (x: number, y: number) => d.pairs.some(p => p[0] === x && p[1] === y);
      const E = [1, 2, 3];
      const refl = E.every(x => has(x, x));
      const sym = E.every(x => E.every(y => !has(x, y) || has(y, x)));
      const anti = E.every(x => E.every(y => !(has(x, y) && has(y, x)) || x === y));
      const trans = E.every(x => E.every(y => E.every(z => !(has(x, y) && has(y, z)) || has(x, z))));
      expect(d.reflexive!.holds).toBe(refl);
      expect(d.symmetric!.holds).toBe(sym);
      expect(d.antisymmetric!.holds).toBe(anti);
      expect(d.transitive!.holds).toBe(trans);
      expect(d.equivalence).toBe(refl && sym && trans);
      if (d.equivalence) {
        expect(d.classes!.flat().sort()).toEqual([1, 2, 3]); // classes partition the set
        for (const cls of d.classes!) for (const x of cls) for (const y of cls) expect(has(x, y)).toBe(true);
      } else expect(d.classes).toBeNull();
    }
  });
  it('properties are not applicable when A ≠ B in size; functions are tested for any sizes', () => {
    const d = deriveRelation({ n: 3, k: 2, cells: '100' + '010' });
    expect(d.onOneSet).toBe(false);
    expect(d.reflexive).toBeNull();
    expect(d.transitive).toBeNull();
    expect(d.equivalence).toBeNull();
    expect(d.function.isFunction).toBe(false); // 3 has no image
    expect(d.function.failure).toMatchObject({ a: 3, kind: 'none' });
    const f = deriveRelation({ n: 3, k: 2, cells: '101' + '010' });
    expect(f.function.isFunction).toBe(true);
    expect(f.function.images).toEqual([[1], [2], [1]]);
    const manyToOne = deriveRelation({ n: 2, k: 2, cells: '11' + '00' });
    expect(manyToOne.function.isFunction).toBe(true); // both 1 and 2 map to 1: many-to-one is allowed
    const two = deriveRelation({ n: 2, k: 2, cells: '11' + '10' });
    expect(two.function.failure).toMatchObject({ a: 1, kind: 'many', images: [1, 2] });
  });
  it('presets: the active preset is derived from the cells; sizes can change without losing surviving pairs', () => {
    expect(deriveRelation(CANONICAL_RELATION).preset).toBe('less');
    expect(deriveRelation(toggleCell(CANONICAL_RELATION, 1, 1)).preset).toBeNull();
    const grown = resize(CANONICAL_RELATION, 5, 5);
    expect(grown.cells).toHaveLength(25);
    expect(deriveRelation(grown).pairs).toEqual(deriveRelation(CANONICAL_RELATION).pairs);
    const shrunk = resize(CANONICAL_RELATION, 2, 2);
    expect(deriveRelation(shrunk).pairs).toEqual([[1, 2]]);
    for (const id of Object.keys(PRESET_TESTS) as PresetId[]) for (let n = 1; n <= 6; n++) {
      const cells = presetCells(id, n, n);
      expect(cells).toHaveLength(n * n);
      expect(deriveRelation({ n, k: n, cells }).pairs.every(([x, y]) => PRESET_TESTS[id](x, y))).toBe(true);
    }
  });
  it('toggle is an involution; validation rejects bad sizes and cell strings', () => {
    expect(toggleCell(toggleCell(CANONICAL_RELATION, 2, 3), 2, 3)).toEqual(CANONICAL_RELATION);
    const bad = (s: RelationState) => () => checkRelation(s);
    expect(bad({ n: 0, k: 1, cells: '' })).toThrow(RangeError);
    expect(bad({ n: 7, k: 1, cells: '0000000' })).toThrow(RangeError);
    expect(bad({ n: 2, k: 2, cells: '011' })).toThrow(RangeError);
    expect(bad({ n: 1, k: 1, cells: '2' })).toThrow(RangeError);
    expect(bad({ n: 1.5, k: 1, cells: '0' })).toThrow(RangeError);
  });
  it('divides is reflexive and antisymmetric on positive integers but not symmetric', () => {
    for (let n = 1; n <= 6; n++) {
      const d = on('divides', n);
      expect(d.reflexive!.holds).toBe(true);
      expect(d.antisymmetric!.holds).toBe(true);
      expect(d.symmetric!.holds).toBe(n === 1);
    }
  });
});
