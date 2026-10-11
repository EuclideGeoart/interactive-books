import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { deriveJoint } from '../../src/math/probability/joint';
import { fractionText } from '../../src/math/probability/finite';
const f = JSON.parse(readFileSync('fixtures/probability_joint.fixtures.json', 'utf8'));
for (const [i, c] of f.cases.entries()) it(`independent Fraction joint, marginal, conditional and covariance oracle ${i}`, () => {
  const d = deriveJoint(c.weights, c.xScale, c.yScale, c.xShift, c.yShift), e = c.expected;
  const conditional = (rows: typeof d.rowConditional) => rows.map(row => row?.map(fractionText) ?? null);
  expect({ joint: d.mass.map(fractionText), rowMass: d.rows.map(fractionText), colMass: d.columns.map(fractionText), conditionalRows: conditional(d.rowConditional), conditionalCols: conditional(d.columnConditional), xValues: d.xValues.map(fractionText), yValues: d.yValues.map(fractionText), meanX: fractionText(d.x.mean), meanY: fractionText(d.y.mean), secondX: fractionText(d.x.secondMoment), secondY: fractionText(d.y.secondMoment), varX: fractionText(d.x.variance), varY: fractionText(d.y.variance), crossMoment: fractionText(d.xy), covariance: fractionText(d.covariance), independent: d.independent }).toEqual(Object.fromEntries(Object.entries(e).filter(([key]) => key !== 'correlation')));
  if (e.correlation === null) expect(d.correlation).toBeNull(); else { expect(d.correlation).toBeCloseTo(e.correlation, 13); expect(Math.abs(d.correlation!)).toBeLessThanOrEqual(1); }
});
