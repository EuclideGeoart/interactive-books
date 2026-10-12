import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { deriveMoments } from '../../src/math/probability/moments';
import { fractionText } from '../../src/math/probability/finite';
const f = JSON.parse(readFileSync('fixtures/probability_moments.fixtures.json', 'utf8'));
for (const [i, c] of f.cases.entries()) it(`Fraction oracle: exact moments and induced mass ${i}`, () => {
  const d = deriveMoments(c.weights, c.values, c.scale, c.shift);
  expect({ mean: fractionText(d.mean), secondMoment: fractionText(d.secondMoment), variance: fractionText(d.variance), scaledMean: fractionText(d.transformed.mean), scaledVariance: fractionText(d.transformed.variance), distribution: d.distribution.map(x => ({ value: fractionText(x.value), mass: fractionText(x.mass) })) }).toEqual(c.expected);
});
