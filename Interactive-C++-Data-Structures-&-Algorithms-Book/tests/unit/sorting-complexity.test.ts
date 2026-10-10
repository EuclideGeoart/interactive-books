import { expect, it } from 'vitest';
import { balancedLastPivot, measureWork, teachingInput } from '../../src/visualizers/sorting/complexity';

it('search counters distinguish first-hit linear from binary predicate calls',()=>{
  expect(measureWork('37',8,'sorted','first').rows[0]!.counts.comparisons).toBe(1);
  const rows=measureWork('38',16,'sorted','missing').rows;
  expect(rows[0]!.counts.comparisons).toBe(16);
  expect(rows[1]!.counts.comparisons).toBeLessThan(16);
  expect(measureWork('38',0,'sorted').rows.every(r=>r.counts.comparisons===0)).toBe(true);
});
it('elementary work matches independent quadratic and adaptive counts',()=>{
  const sorted=measureWork('40',8,'sorted').rows;
  expect(sorted.map(r=>r.counts.comparisons)).toEqual([7,28,7]);
  const reversed=measureWork('40',8,'reverse').rows;
  expect(reversed[2]!.counts.shifts).toBe(28);
  expect(reversed[1]!.counts.comparisons).toBe(28);
  expect(measureWork('39',8,'reverse').rows[0]!.detail).toContain('28 inversions');
});
it('constructed Lomuto partitions compare favorably with the sorted last-pivot pathology',()=>{
  const values=teachingInput(15,'sorted');
  expect([...balancedLastPivot(values)].sort((a,b)=>a-b)).toEqual(values);
  const rows=measureWork('42',15,'sorted').rows;
  expect(rows[0]!.counts.maxDepth).toBe(4);
  expect(rows[1]!.counts.comparisons).toBe(15*14/2);
  expect(rows[1]!.counts.maxDepth).toBe(15);
});
it('counting range changes memory work and radix passes come from actual digits',()=>{
  const small=measureWork('44',8,'sorted','missing',9).rows;
  const large=measureWork('44',8,'sorted','missing',99).rows;
  expect(large[0]!.counts.bufferWrites).toBeGreaterThan(small[0]!.counts.bufferWrites);
  expect(small[1]!.counts.passes).toBe(1);
  expect(large[1]!.counts.passes).toBe(2);
  expect(measureWork('41',8,'reverse').rows[0]!.counts.bufferWrites).toBe(24);
});
