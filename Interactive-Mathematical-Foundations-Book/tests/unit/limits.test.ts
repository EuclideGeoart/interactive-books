import { describe, expect, it } from 'vitest';
import { int, rational } from '../../src/math/quantity/rational';
import { analyse, approach, gapTo } from '../../src/math/calculus/limits';
import { hole, moved, recip, joinFunction } from '../../src/math/calculus/catalog';
import { sqrtFn, sinRecipFn } from '../../src/math/calculus/univariate';
describe('limits and continuity model', () => {
  it('classifies hand-worked points', () => {
    expect(analyse(hole, int(1))).toMatchObject({ kind: 'removable', value: { kind: 'undefined' }, limit: { value: 2 } });
    expect(analyse(moved, int(1))).toMatchObject({ kind: 'removable', value: { value: 3 } });
    expect(analyse(recip, int(0)).kind).toBe('infinite');
    expect(analyse(sinRecipFn, int(0)).kind).toBe('oscillation');
    expect(analyse(sqrtFn, int(0))).toMatchObject({ kind: 'one-sided', continuousRight: true, continuousLeft: false });
    expect(analyse(hole, int(3)).kind).toBe('continuous');
  });
  it('approach evaluates only away from a, exactly', () => {
    const rows = approach(hole, int(1), int(1), 4);
    expect(rows.map(r => [r.left, r.right].map(v => v.kind === 'value' ? v.value : null))).toEqual([[1, 3], [1.5, 2.5], [1.75, 2.25], [1.875, 2.125]]);
    expect(gapTo(rows[3]!.right, { value: 2, exact: int(2) })).toEqual({ value: 0.125, exact: rational(1n, 8n) });
  });
  it('join continuity holds exactly when 1 + c = m = f(1)', () => {
    expect(analyse(joinFunction(int(1), int(2), 'right', int(0)), int(1)).kind).toBe('continuous');
    expect(analyse(joinFunction(int(1), int(2), 'left', int(0)), int(1)).kind).toBe('continuous');
    expect(analyse(joinFunction(int(1), int(3), 'right', int(0)), int(1)).kind).toBe('jump');
  });
});
