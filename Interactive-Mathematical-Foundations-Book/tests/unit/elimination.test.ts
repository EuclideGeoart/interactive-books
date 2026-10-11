import { describe, expect, it } from 'vitest';
import { applyRowOperation, eliminate, inverseExact, solveExact } from '../../src/math/linear-algebra/elimination';
import { exactVector, identity, matrix, multiplyMatrices, multiplyVector, sameMatrix, sameVector, type Matrix } from '../../src/math/linear-algebra/matrices';
import { rational, ZERO } from '../../src/math/quantity/rational';
const q = (a: Matrix) => a.values.map(row => row.map(x => `${x.num}/${x.den}`));

describe('exact elimination, rank and inverse', () => {
  it('solves and substitutes a literal system', () => {
    const a = matrix([[1, 1], [1, -1]]), b = exactVector([3, 1]), d = solveExact(a, b);
    expect(d.kind).toBe('unique'); expect(d.verified).toBe(true); expect(d.particular).toEqual(exactVector([2, 1]));
    expect(d.frames.some(f => f.state.phase === 'back-substitution')).toBe(true);
  });
  it('replays real operations on every augmented entry, with stable history', () => {
    const a = matrix([[0, 1], [2, 1]]), d = solveExact(a, exactVector([1, 3]));
    expect(d.frames.some(f => f.state.operation?.kind === 'swap')).toBe(true);
    for (let i = 1; i < d.frames.length; i++) {
      const previous = d.frames[i - 1]!.state.matrix, current = d.frames[i]!.state;
      if (current.operation) expect(sameMatrix(applyRowOperation(previous, current.operation), current.matrix)).toBe(true);
      else expect(sameMatrix(previous, current.matrix)).toBe(true);
      expect(Object.isFrozen(current.matrix.values[0])).toBe(true);
    }
    expect(q(d.frames[0]!.state.matrix)).toEqual([['0/1', '1/1', '1/1'], ['2/1', '1/1', '3/1']]);
  });
  it('skips empty columns and describes ALL free directions', () => {
    const a = matrix([[0, 1, 2], [0, 2, 4]]), d = solveExact(a, exactVector([1, 2]));
    expect(d.pivots).toEqual([1]); expect(d.free).toEqual([0, 2]); expect(d.kind).toBe('infinite');
    expect(d.nullspace).toEqual([exactVector([1, 0, 0]), exactVector([0, -2, 1])]);
    for (const v of d.nullspace) { const p = multiplyVector(a, v); expect(p.ok && p.value.every(x => x.num === 0n)).toBe(true); }
  });
  it('separates redundant zero rows, contradictions and fractional pivots', () => {
    expect(solveExact(matrix([[0, 0], [0, 0]]), exactVector([0, 0])).kind).toBe('infinite');
    expect(solveExact(matrix([[0, 0], [0, 0]]), exactVector([0, 1])).kind).toBe('none');
    const d = solveExact(matrix([[0.5, 1], [1, -0.5]]), exactVector([1, 0]));
    expect(d.particular).toEqual(exactVector([0.4, 0.8]));
  });
  it('rejects row destruction and incompatible shapes', () => {
    expect(() => applyRowOperation(identity(2), { kind: 'scale', row: 0, factor: ZERO })).toThrow();
    expect(() => applyRowOperation(identity(2), { kind: 'add', row: 0, source: 0, factor: rational(2n) })).toThrow();
    expect(() => applyRowOperation(identity(2), { kind: 'swap', row: 0, other: 2 })).toThrow();
    expect(() => solveExact(identity(2), exactVector([1]))).toThrow();
    expect(() => inverseExact(matrix([[1, 2, 3], [2, 3, 4]]))).toThrow();
  });
  it('exact small nonzero pivots remain pivots', () => {
    const d = eliminate(matrix([[4, 3.99], [3.99, 3.98]]));
    expect(d.rank).toBe(2); expect(d.nullity).toBe(0);
  });
  it('constructs and checks inverses in BOTH orders including 3×3', () => {
    expect(inverseExact(matrix([[2, 1], [1, 1]])).inverse).toEqual(matrix([[1, -1], [-1, 2]]));
    for (const a of [matrix([[1, 1, 0], [0, 1, 1], [1, 0, 1]]), matrix([[0, 1], [2, 1]])]) {
      const d = inverseExact(a); expect(d.leftIdentity && d.rightIdentity).toBe(true);
      expect(d.frames[0]!.state.matrix.cols).toBe(2*a.cols);
    }
    expect(inverseExact(matrix([[1, 2], [2, 4]])).inverse).toBeNull();
  });
  it('rank-nullity and solution invariance hold across deterministic small matrices', () => {
    for (let k = 0; k < 35; k++) {
      const a = matrix([[k % 5 - 2, k % 7 - 3, 1], [k % 3, 2, k % 4]]), x = exactVector([1, -1, 2]);
      const b = multiplyVector(a, x); if (!b.ok) throw Error(b.reason);
      const d = solveExact(a, b.value); expect(d.rank + d.nullity).toBe(3); expect(d.verified).toBe(true);
      for (const z of d.nullspace) { const p = multiplyVector(a, z); expect(p.ok && sameVector(p.value, exactVector([0, 0]))).toBe(true); }
      const invertible = matrix([[1, k % 4], [0, 1]]), inv = inverseExact(invertible).inverse!;
      const product = multiplyMatrices(inv, invertible); expect(product.ok && sameMatrix(product.value, identity(2))).toBe(true);
    }
  });
});
