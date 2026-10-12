import { expect, it } from 'vitest';
import { deriveJoint } from '../../src/math/probability/joint';
import { fractionText, sum } from '../../src/math/probability/finite';
import { JOINT_CANONICAL, deriveJointLesson, jointPreset, jointWeights } from '../../src/lessons/probability/joint-lesson';

it('the hand-worked table has exact marginals, conditional halves and covariance 1/4', () => {
  const d = deriveJoint(jointWeights(JOINT_CANONICAL));
  expect(d.rows.map(fractionText)).toEqual(['1/4', '1/2', '1/4']); expect(d.columns).toEqual(d.rows);
  expect(d.rowConditional[0]!.map(fractionText)).toEqual(['1/2', '1/2', '0/1']);
  expect(fractionText(d.covariance)).toBe('1/4'); expect(fractionText(d.x.variance)).toBe('1/2'); expect(d.correlation).toBe(.5); expect(d.independent).toBe(false);
});
it('conditional zero denominators are undefined and normalizable rows sum exactly to one', () => {
  const d = deriveJoint(jointWeights(jointPreset('empty-row'))); expect(d.rowConditional[0]).toBeNull();
  for (const conditional of [...d.rowConditional, ...d.columnConditional]) if (conditional) expect(fractionText(sum(conditional))).toBe('1/1');
  expect(() => deriveJoint(Array(9).fill(0))).toThrow(); expect(() => deriveJoint([1])).toThrow(); expect(() => deriveJoint([-1, ...Array(8).fill(1)])).toThrow();
});
it('zero correlation can coexist with nonlinear dependence; independence remains exact', () => {
  const nonlinear = deriveJoint(jointWeights(jointPreset('nonlinear'))); expect(fractionText(nonlinear.covariance)).toBe('0/1'); expect(nonlinear.correlation).toBe(0); expect(nonlinear.independent).toBe(false);
  expect(deriveJoint(jointWeights(jointPreset('independent'))).independent).toBe(true);
});
it('affine changes scale covariance, flip correlation and collapse zero-variance images honestly', () => {
  const weights = jointWeights(JOINT_CANONICAL), d = deriveJoint(weights, -2, 3, 1, -1);
  expect(fractionText(d.covariance)).toBe('-3/2'); expect(d.correlation).toBe(-.5); expect(fractionText(d.x.variance)).toBe('2/1');
  const collapsed = deriveJoint(weights, 0); expect(collapsed.correlation).toBeNull(); expect(collapsed.independent).toBe(true); expect(collapsed.latentIndependent).toBe(false); expect(collapsed.points).toHaveLength(3);
  expect(fractionText(sum(collapsed.points.map(p => p.mass)))).toBe('1/1');
});
it('the rendered descriptions and immutable traces describe the same derived exception', () => {
  const d = deriveJointLesson('joint', jointPreset('empty-row')); expect(d.view.rows.find(r => r.id === 'conditional')!.description.status).toBe('undefined'); expect(d.view.description).toContain('zero mass');
  expect(Object.isFrozen(d.view.trace[2]!.state)).toBe(true);
  const collapsed = deriveJointLesson('covariance', jointPreset('collapsed')); expect(collapsed.scatter.dots).toHaveLength(3); expect(collapsed.view.verdict).toContain('correlation undefined');
});
