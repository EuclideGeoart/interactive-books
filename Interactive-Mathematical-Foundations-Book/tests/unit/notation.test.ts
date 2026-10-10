/**
 * The I.9 domain models: shapes and indices, the shape algebra, norms of a rational vector, arg min versus min, the expectation of a finite
 * distribution, and the gradient shape. Expected values below are worked by hand; the properties are checked over every small case.
 */
import { describe, expect, it } from 'vitest';
import { ALGEBRA_OPS, DIM_MAX, OBJECT_KINDS, deriveAlgebra, deriveShape, flatten0, stridesOf, tupleText, unflatten, type ShapeState } from '../../src/math/notation/shapes';
import { NORM_IDS, ballCorners, norms, onBoundary, radicalForm, radicalToNumber, squareFreeSplit, sqrtQ } from '../../src/math/notation/norms';
import { B_MAX, B_MIN, C_MAX, C_MIN, GRID, LOSS_KINDS, deriveArgmin, loss } from '../../src/math/notation/argmin';
import { COUNT_MAX, OUTCOMES, OUTCOME_SETS, deriveExpect, type ExpectState } from '../../src/math/notation/expectation';
import { STEP_EXPONENTS, deriveGradient } from '../../src/math/notation/gradient';
import { q, type Q } from '../../src/math/notation/rational';

const S = (over: Partial<ShapeState>): ShapeState => ({ kind: 'matrix', n: 4, d: 3, B: 2, T: 3, i: 1, j: 1, k: 1, ...over });

// ------------------------------------------------------------------------------------------------ shapes
describe('shapes and indices', () => {
  it('a scalar has shape (), one element and no index', () => {
    const d = deriveShape(S({ kind: 'scalar' }));
    expect(d.shape).toEqual([]);
    expect(d.shapeTuple).toBe('()');
    expect(d.count).toBe(1);
    expect(d.selection).toBeNull();
    expect(d.setTex).toBe('\\mathbb{R}');
    expect(d.numpy).toBeNull();
  });
  it('a vector in R^5 has shape (5,), which is NOT a column (5, 1); its element x_j is x[j - 1]', () => {
    const d = deriveShape(S({ kind: 'vector', d: 5, j: 5 }));
    expect(d.shape).toEqual([5]);
    expect(d.shapeTuple).toBe('(5,)');
    expect(d.elementTex).toBe('\\mathbf{x}_{5}');
    expect(d.numpy).toBe('x[4]');
    expect(d.selection!.offset).toBe(4);
    expect(d.setNumbersTex).toBe('\\mathbb{R}^{5}');
  });
  it('a 4 x 3 matrix: X_{2,3} is X[1, 2], the flat position is 1·3 + 2 = 5, a row has shape (3,) and a column (4,)', () => {
    const d = deriveShape(S({ i: 2, j: 3 }));
    expect(d.shape).toEqual([4, 3]);
    expect(d.count).toBe(12);
    expect(d.elementTex).toBe('X_{2,3}');
    expect(d.elementSymbolTex).toBe('X_{ij}');
    expect(d.numpy).toBe('X[1, 2]');
    expect(d.selection!.strides).toEqual([3, 1]);
    expect(d.selection!.offset).toBe(5);
    expect(d.offsetWork).toBe('1 * 3 + 2 = 5');
    expect(d.slices.map(s => [s.id, s.numpy, s.shapeTuple])).toEqual([['row', 'X[1, :]', '(3,)'], ['column', 'X[:, 2]', '(4,)']]);
    expect(d.setTex).toBe('\\mathbb{R}^{n\\times d}');
    expect(d.setNumbersTex).toBe('\\mathbb{R}^{4\\times 3}');
  });
  it('a tensor 2 x 3 x 4: the last element (2, 3, 4) has flat position 23 = 1·12 + 2·4 + 3', () => {
    const d = deriveShape(S({ kind: 'tensor', B: 2, T: 3, d: 4, i: 2, j: 3, k: 4 }));
    expect(d.shape).toEqual([2, 3, 4]);
    expect(d.count).toBe(24);
    expect(d.selection!.strides).toEqual([12, 4, 1]);
    expect(d.selection!.offset).toBe(23);
    expect(d.numpy).toBe('X[1, 2, 3]');
    expect(d.slices.map(s => s.shapeTuple)).toEqual(['(3, 4)', '(4,)']);
    expect(d.selection!.values0).toEqual([1, 2, 3]);
  });
  it('an index outside its axis is reported with the reason and never clamped', () => {
    const d = deriveShape(S({ i: 5, j: 3 }));
    expect(d.selection!.valid).toBe(false);
    expect(d.selection!.problems).toEqual(['i = 5 is outside 1 … 4: this axis has 4 entries']);
    expect(d.selection!.offset).toBeNull();
    expect(d.elementTex).toBeNull();
    expect(d.numpy).toBeNull();
    expect(d.slices).toEqual([]);
    expect(deriveShape(S({ kind: 'vector', d: 1, j: 2 })).selection!.problems[0]).toBe('j = 2 is outside 1 … 1: this axis has 1 entry');
    expect(deriveShape(S({ i: 1.5 })).selection!.problems[0]).toContain('not a whole number');
  });
  it('row-major strides, and flatten0 / unflatten are inverse bijections onto 0 … count − 1 for every shape up to 4 x 3 x 4', () => {
    expect(stridesOf([2, 3, 4])).toEqual([12, 4, 1]);
    expect(stridesOf([5])).toEqual([1]);
    expect(stridesOf([])).toEqual([]);
    for (let a = 1; a <= 4; a++) for (let b = 1; b <= 3; b++) for (let c = 1; c <= 4; c++) {
      const shape = [a, b, c];
      const seen = new Set<number>();
      for (let x = 0; x < a; x++) for (let y = 0; y < b; y++) for (let z = 0; z < c; z++) {
        const o = flatten0(shape, [x, y, z]);
        expect(unflatten(shape, o)).toEqual([x, y, z]);
        seen.add(o);
      }
      expect(seen.size).toBe(a * b * c);
      expect(Math.max(...seen)).toBe(a * b * c - 1);
    }
    expect(() => flatten0([2, 2], [2, 0])).toThrow(RangeError);
    expect(() => unflatten([2, 2], 4)).toThrow(RangeError);
    expect(tupleText([3, 4])).toBe('(3, 4)');
  });
  it('the flattened position agrees with NumPy: the element after X[i, d - 1] is X[i + 1, 0] (a row ends, the next begins)', () => {
    const last = deriveShape(S({ n: 4, d: 3, i: 2, j: 3 })).selection!.offset!;
    const first = deriveShape(S({ n: 4, d: 3, i: 3, j: 1 })).selection!.offset!;
    expect(first - last).toBe(1);
  });
  it('every object kind and every size up to the cap derives without error and the element count is the product of the sizes', () => {
    for (const kind of OBJECT_KINDS) for (let n = 1; n <= DIM_MAX; n += 3) for (let d = 1; d <= DIM_MAX; d += 3) for (let T = 1; T <= DIM_MAX; T += 3) {
      const out = deriveShape(S({ kind, n, d, B: n, T, i: 1, j: 1, k: 1 }));
      expect(out.count).toBe(out.shape.reduce((a, b) => a * b, 1));
      expect(out.selection === null || out.selection.valid).toBe(true);
    }
  });
});

describe('the shape algebra', () => {
  const A = (op: (typeof ALGEBRA_OPS)[number], n: number, d: number, p: number, qq: number) => deriveAlgebra({ op, n, d, p, q: qq });
  it('matrix times vector: (n x d)(d) -> n, and the mismatch names both dimensions', () => {
    const ok = A('matvec', 4, 3, 3, 1);
    expect(ok.valid).toBe(true);
    expect(ok.result).toEqual([4]);
    expect(ok.resultTuple).toBe('(4,)');
    expect(ok.numpy).toBe('X @ w');
    const bad = A('matvec', 4, 3, 4, 1);
    expect(bad.valid).toBe(false);
    expect(bad.result).toBeNull();
    expect(bad.reason).toBe('The inner dimensions differ: X has d = 3 columns but w has p = 4 entries, and 3 ≠ 4.');
  });
  it('matrix times matrix: (n x d)(d x k) -> n x k', () => {
    const ok = A('matmul', 4, 3, 3, 2);
    expect(ok.result).toEqual([4, 2]);
    expect(ok.ruleTex).toBe('\\left(4\\times 3\\right)\\left(3\\times 2\\right)\\to \\left(4\\times 2\\right)');
    const bad = A('matmul', 4, 3, 2, 3);
    expect(bad.reason).toBe('The inner dimensions differ: X has d = 3 columns but W has p = 2 rows, and 3 ≠ 2.');
  });
  it('transpose swaps the shape, X^T X is d x d, and both are always defined', () => {
    expect(A('transpose', 4, 3, 1, 1).result).toEqual([3, 4]);
    expect(A('gram', 4, 3, 1, 1).result).toEqual([3, 3]);
    expect(A('gram', 4, 3, 1, 1).numpy).toBe('X.T @ X');
  });
  it('a product is defined EXACTLY when the inner dimensions agree: every case with sizes 1 … 5', () => {
    for (let n = 1; n <= 5; n++) for (let d = 1; d <= 5; d++) for (let p = 1; p <= 5; p++) for (let c = 1; c <= 5; c++) {
      expect(A('matvec', n, d, p, c).valid).toBe(d === p);
      expect(A('matmul', n, d, p, c).valid).toBe(d === p);
      if (d === p) expect(A('matmul', n, d, p, c).result).toEqual([n, c]);
      expect(A('transpose', n, d, p, c).result).toEqual([d, n]);
    }
  });
});

// ------------------------------------------------------------------------------------------------ norms
const v = (...xs: [number, number?][]): Q[] => xs.map(([a, b = 1]) => q(a, b));

describe('exact norms', () => {
  it('squareFreeSplit and sqrtQ on hand-worked cases', () => {
    expect(squareFreeSplit(1n)).toEqual({ s: 1n, f: 1n });
    expect(squareFreeSplit(8n)).toEqual({ s: 2n, f: 2n });
    expect(squareFreeSplit(12n)).toEqual({ s: 2n, f: 3n });
    expect(squareFreeSplit(72n)).toEqual({ s: 6n, f: 2n });
    expect(squareFreeSplit(97n)).toEqual({ s: 1n, f: 97n });
    expect(squareFreeSplit(5n * 5n * 7n * 7n * 11n)).toEqual({ s: 35n, f: 11n });
    expect(sqrtQ(q(25))).toEqual({ coef: q(5), radicand: 1n });
    expect(sqrtQ(q(1, 2))).toEqual({ coef: q(1, 2), radicand: 2n }); // sqrt(1/2) = sqrt(2)/2
    expect(sqrtQ(q(8))).toEqual({ coef: q(2), radicand: 2n });
    expect(sqrtQ(q(25, 4))).toEqual({ coef: q(5, 2), radicand: 1n });
    expect(sqrtQ(q(0))).toEqual({ coef: q(0), radicand: 1n });
    expect(() => sqrtQ(q(-1))).toThrow(RangeError);
  });
  it('(3, 4): l1 = 7, l2 = 5 (a whole number), l-infinity = 4', () => {
    const n = norms(v([3], [4]));
    expect(n.l1).toEqual(q(7));
    expect(n.linf).toEqual(q(4));
    expect(n.l2squared).toEqual(q(25));
    expect(radicalForm(n.l2)).toMatchObject({ text: '5', exactRational: true });
  });
  it('(1, 1): l2 = √2; (2, 2): 2√2; (1, 2): √5; (1/2, 1/2): √2/2; (3/2, 2): 5/2', () => {
    expect(radicalForm(norms(v([1], [1])).l2).text).toBe('√2');
    expect(radicalForm(norms(v([2], [2])).l2).text).toBe('2√2');
    expect(radicalForm(norms(v([1], [2])).l2).text).toBe('√5');
    expect(radicalForm(norms(v([1, 2], [1, 2])).l2).text).toBe('√2/2');
    expect(radicalForm(norms(v([3, 2], [2])).l2).text).toBe('5/2');
    expect(radicalForm(norms(v([1], [1])).l2).tex).toBe('\\sqrt{2}');
    expect(radicalForm(norms(v([2], [2])).l2).tex).toBe('2\\sqrt{2}');
    expect(radicalForm(norms(v([1, 2], [1, 2])).l2).tex).toBe('\\frac{\\sqrt{2}}{2}');
  });
  it('negative entries count by absolute value; the zero vector has every norm 0', () => {
    const n = norms(v([-3], [4]));
    expect([n.l1, n.linf, n.l2squared]).toEqual([q(7), q(4), q(25)]);
    const z = norms(v([0], [0]));
    expect(z.zero).toBe(true);
    expect([z.l1, z.linf, z.l2squared]).toEqual([q(0), q(0), q(0)]);
  });
  it('a vector along an axis has equal norms; (1, 1) does not', () => {
    expect(norms(v([3], [0])).equalities.slice().sort()).toEqual(['2=1', 'inf=1', 'inf=2']);
    expect(norms(v([1], [1])).equalities).toEqual([]);
    expect(norms(v([-5], [0])).equalities).toContain('inf=1');
  });
  it('the chain ||x||∞ ≤ ||x||₂ ≤ ||x||₁ ≤ d·||x||∞ holds for every vector on a grid of rationals, and the radical equals the square root', () => {
    const values: Q[] = [];
    for (let a = -10; a <= 10; a += 3) for (const den of [1, 2, 4]) values.push(q(a, den));
    let count = 0;
    for (const x1 of values) for (const x2 of values) {
      const n = norms([x1, x2]);
      expect(n.chain).toEqual({ infLeL2: true, l2LeL1: true, l1LeDInf: true });
      // exact: coef^2 * radicand = ||x||_2^2, and the radicand is square-free
      expect(n.l2.coef.num * n.l2.coef.num * n.l2.radicand * n.l2squared.den).toBe(n.l2squared.num * n.l2.coef.den * n.l2.coef.den);
      for (let p = 2n; p * p <= n.l2.radicand; p++) expect(n.l2.radicand % (p * p)).not.toBe(0n);
      expect(radicalToNumber(n.l2)).toBeCloseTo(Math.sqrt(Number(n.l2squared.num) / Number(n.l2squared.den)), 10);
      expect(NORM_IDS.every(id => onBoundary(id, x1, x2))).toBe(true);
      count++;
    }
    expect(count).toBe(values.length * values.length);
  });
  it('balls: the l1 ball is a diamond with corners on the axes, the l-infinity ball a square with corners on the diagonals', () => {
    expect(ballCorners('1', 2)).toEqual([{ x: 2, y: 0 }, { x: 0, y: 2 }, { x: -2, y: 0 }, { x: 0, y: -2 }]);
    expect(ballCorners('inf', 3)).toEqual([{ x: 3, y: 3 }, { x: -3, y: 3 }, { x: -3, y: -3 }, { x: 3, y: -3 }]);
  });
  it('the unit vector (3/5, 4/5) has l2 norm 1 exactly', () => {
    expect(norms(v([3, 5], [4, 5])).l2).toEqual({ coef: q(1), radicand: 1n });
  });
});

// ------------------------------------------------------------------------------------------------ arg min
describe('arg min versus min', () => {
  it('a bowl centred at 2 with offset 1: min is 1 (a value), argmin is {2} (a point), np.argmin gives the position 6', () => {
    const d = deriveArgmin({ kind: 'bowl', c: 2, b: 1 });
    expect(d.rows.map(r => r.loss)).toEqual([37, 26, 17, 10, 5, 2, 1, 2, 5]);
    expect(d.minValue).toBe(1);
    expect(d.argmin).toEqual([2]);
    expect(d.tie).toBe(false);
    expect(d.npIndex).toBe(6);
    expect(d.npTheta).toBe(2);
  });
  it('two wells at ±1: a tie. argmin = {−1, 1}, min = 0, and np.argmin returns only the FIRST of the two, at position 3', () => {
    const d = deriveArgmin({ kind: 'two-wells', c: 0, b: 0 });
    expect(d.rows.map(r => r.loss)).toEqual([225, 64, 9, 0, 1, 0, 9, 64, 225]);
    expect(d.argmin).toEqual([-1, 1]);
    expect(d.tie).toBe(true);
    expect(d.minValue).toBe(0);
    expect(d.npIndex).toBe(3);
    expect(d.npTheta).toBe(-1);
  });
  it('a flat bottom: three minimisers', () => {
    const d = deriveArgmin({ kind: 'flat-bottom', c: 0, b: 0 });
    expect(d.rows.map(r => r.loss)).toEqual([9, 4, 1, 0, 0, 0, 1, 4, 9]);
    expect(d.argmin).toEqual([-1, 0, 1]);
    expect(d.npIndex).toBe(3);
  });
  it('adding b moves the minimum value and never the argmin; the minimum is attained on the grid for every shift', () => {
    for (const kind of LOSS_KINDS) for (let c = C_MIN; c <= C_MAX; c++) {
      const base = deriveArgmin({ kind, c, b: 0 });
      expect(base.minValue).toBe(0);
      expect(base.argmin.length).toBeGreaterThan(0);
      for (let b = B_MIN; b <= B_MAX; b++) {
        const d = deriveArgmin({ kind, c, b });
        expect(d.argmin).toEqual(base.argmin);
        expect(d.minValue).toBe(b);
        expect(d.npIndex).toBe(base.npIndex);
      }
    }
  });
  it('every minimiser really has the smallest loss and every other grid point a larger one; np.argmin is the first minimiser', () => {
    for (const kind of LOSS_KINDS) for (let c = C_MIN; c <= C_MAX; c++) {
      const s = { kind, c, b: 2 };
      const d = deriveArgmin(s);
      for (const row of d.rows) expect(row.isMinimiser).toBe(row.loss === d.minValue);
      expect(d.argmin[0]).toBe(d.npTheta);
      expect(GRID[d.npIndex]).toBe(d.npTheta);
      expect(loss(s, d.npTheta)).toBe(d.minValue);
    }
  });
  it('out-of-range parameters are rejected', () => {
    expect(() => deriveArgmin({ kind: 'bowl', c: 4, b: 0 })).toThrow(RangeError);
    expect(() => deriveArgmin({ kind: 'bowl', c: 0, b: 7 })).toThrow(RangeError);
    expect(() => deriveArgmin({ kind: 'bowl', c: 0.5, b: 0 })).toThrow(RangeError);
  });
});

// ------------------------------------------------------------------------------------------------ expectation
const E = (set: ExpectState['set'], ...c: number[]): ExpectState => ({ set, c1: c[0] ?? 0, c2: c[1] ?? 0, c3: c[2] ?? 0, c4: c[3] ?? 0, c5: c[4] ?? 0, c6: c[5] ?? 0 });

describe('expectation of a finite distribution', () => {
  it('a fair die (one of each count): p = 1/6 each, they add to 1, E[X] = 7/2, which the die never shows', () => {
    const d = deriveExpect(E('die', 1, 1, 1, 1, 1, 1));
    expect(d.p.every(p => p.num === 1n && p.den === 6n)).toBe(true);
    expect(d.sumP).toEqual(q(1));
    expect(d.expectation).toEqual(q(7, 2));
    expect(d.isOutcome).toBe(false);
    expect(d.modes).toEqual([1, 2, 3, 4, 5, 6]);
    expect(d.consistent).toBe(true);
  });
  it('a loaded die: all six counts on the 6 give E[X] = 6, which IS an outcome, with the single mode 6', () => {
    const d = deriveExpect(E('die', 0, 0, 0, 0, 0, 6));
    expect(d.expectation).toEqual(q(6));
    expect(d.isOutcome).toBe(true);
    expect(d.modes).toEqual([6]);
    expect(d.p).toEqual([q(0), q(0), q(0), q(0), q(0), q(1)]);
  });
  it('ratings 0 … 4 with counts 1, 2, 3, 2, 1 give E[X] = 2, and a payoff table with counts 3, 1, 1 gives −1/5', () => {
    expect(deriveExpect(E('rating', 1, 2, 3, 2, 1)).expectation).toEqual(q(2));
    expect(deriveExpect(E('payoff', 3, 1, 1)).expectation).toEqual(q(-1, 5));
    expect(deriveExpect(E('payoff', 3, 1, 1)).p).toEqual([q(3, 5), q(1, 5), q(1, 5)]);
  });
  it('doubling every count changes nothing: the distribution is the counts divided by their total', () => {
    const a = deriveExpect(E('die', 1, 2, 3, 4, 5, 6));
    const b = deriveExpect(E('die', 2, 4, 6, 8, 10, 12));
    expect(b.p).toEqual(a.p);
    expect(b.expectation).toEqual(a.expectation);
    expect(a.expectation).toEqual(q(91, 21)); // (1·1 + 2·2 + … + 6·6) / 21 = 91/21 = 13/3
    expect(a.expectation).toEqual(q(13, 3));
  });
  it('all counts zero: undefined, with the division by zero as the reason, and nothing substituted', () => {
    const d = deriveExpect(E('rating', 0, 0, 0, 0, 0));
    expect(d.defined).toBe(false);
    expect(d.expectation).toBeNull();
    expect(d.p).toEqual([]);
    expect(d.reason).toContain('divide by 0');
  });
  it('counts of unused outcomes are ignored for a smaller set; invalid counts are rejected', () => {
    expect(deriveExpect(E('payoff', 1, 1, 1, 50, 50, 50)).total).toBe(3);
    expect(() => deriveExpect(E('die', -1, 1, 1, 1, 1, 1))).toThrow(RangeError);
    expect(() => deriveExpect(E('die', 1, 1, 1, 1, 1, COUNT_MAX + 1))).toThrow(RangeError);
    expect(() => deriveExpect(E('die', 1.5, 1, 1, 1, 1, 1))).toThrow(RangeError);
  });
  it('for every count vector with entries 0 … 3 on every set: the probabilities are non-negative, add to exactly 1, and E equals the weighted mean', () => {
    let checked = 0;
    for (const set of OUTCOME_SETS) {
      const k = OUTCOMES[set].length;
      const total = 4 ** k;
      for (let code = 0; code < total; code++) {
        const counts: number[] = [];
        for (let i = 0, c = code; i < k; i++, c = Math.floor(c / 4)) counts.push(c % 4);
        const d = deriveExpect(E(set, ...counts));
        if (counts.every(c => c === 0)) { expect(d.defined).toBe(false); continue; }
        expect(d.p.every(p => p.num >= 0n)).toBe(true);
        expect(d.sumP).toEqual(q(1));
        expect(d.consistent).toBe(true);
        checked++;
      }
    }
    expect(checked).toBe(4 ** 6 - 1 + 4 ** 5 - 1 + 4 ** 3 - 1);
  });
});

// ------------------------------------------------------------------------------------------------ gradient
describe('the gradient of f(θ) = θ₁² + 3θ₂²', () => {
  it('at (1, 2): f = 13 and the gradient is (2, 12), a vector of the same shape as θ', () => {
    const d = deriveGradient({ t1: 1, t2: 2, e: 6 });
    expect(d.f).toEqual(q(13));
    expect(d.grad).toEqual([q(2), q(12)]);
    expect(d.shapeTuple).toBe('(2,)');
    expect(d.stationary).toBe(false);
  });
  it('at (3/2, −1/2): f = 3 and the gradient is (3, −3)', () => {
    const d = deriveGradient({ t1: 1.5, t2: -0.5, e: 3 });
    expect(d.f).toEqual(q(3));
    expect(d.grad).toEqual([q(3), q(-3)]);
  });
  it('at the origin the gradient is the zero vector (a stationary point)', () => {
    const d = deriveGradient({ t1: 0, t2: 0, e: 6 });
    expect(d.stationary).toBe(true);
    expect(d.grad).toEqual([q(0), q(0)]);
  });
  it('the forward-difference error is about h and 3h for a moderate step (the truncation error of f = θ² and 3θ²)', () => {
    const d = deriveGradient({ t1: 1, t2: 2, e: 3 });
    expect(d.error[0]).toBeCloseTo(1e-3, 6);
    expect(d.error[1]).toBeCloseTo(3e-3, 6);
    const big = deriveGradient({ t1: 1, t2: 2, e: 1 });
    expect(big.error[0]).toBeCloseTo(0.1, 6);
    expect(big.error[1]).toBeCloseTo(0.3, 6);
  });
  it('an absurdly small step makes the estimate WORSE: the rounding error dominates', () => {
    const good = deriveGradient({ t1: 1, t2: 2, e: 6 });
    const tiny = deriveGradient({ t1: 1, t2: 2, e: 13 });
    expect(Math.abs(tiny.error[0])).toBeGreaterThan(Math.abs(good.error[0]) * 100);
    expect(Math.abs(tiny.error[1])).toBeGreaterThan(Math.abs(good.error[1]) * 100);
  });
  it('rejects a step that is not on the menu, and values off the range or with more than two decimals', () => {
    expect(() => deriveGradient({ t1: 0, t2: 0, e: 4 })).toThrow(RangeError);
    expect(() => deriveGradient({ t1: 5, t2: 0, e: 3 })).toThrow(RangeError);
    expect(() => deriveGradient({ t1: 0.123, t2: 0, e: 3 })).toThrow(RangeError);
    expect(STEP_EXPONENTS).toEqual([1, 3, 6, 9, 13]);
  });
});
