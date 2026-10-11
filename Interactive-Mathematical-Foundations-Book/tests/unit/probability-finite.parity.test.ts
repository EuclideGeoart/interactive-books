import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { finiteEvents, fractionText } from '../../src/math/probability/finite';
import { deriveBayes } from '../../src/math/probability/bayes';
import { deriveCounting } from '../../src/math/probability/counting';
import { sub, ONE, ZERO } from '../../src/math/quantity/rational';

const fixture = JSON.parse(readFileSync('fixtures/probability_finite.fixtures.json', 'utf8'));
const text = (r: ReturnType<typeof deriveBayes>['posterior']) => r === null ? null : fractionText(r);
for (const [i, c] of fixture.finite.entries()) it(`Fraction oracle: finite case ${i}`, () => {
  const d = finiteEvents(c.weights, c.a, c.b);
  expect({ massA: text(d.massA), massB: text(d.massB), intersection: text(d.joint), union: text(d.unionMass), complement: text(d.complement), conditional: text(d.conditional), independent: d.independent }).toEqual(c.expected);
});
for (const [i, c] of fixture.bayes.entries()) it(`Fraction oracle: Bayes case ${i}`, () => {
  const d = deriveBayes(c.prior, c.sensitivity, c.falsePositive, c.evidence);
  expect({ evidence: text(d.evidence), posterior: text(d.posterior), joint: d.cells.map(text), posteriorMass: d.posterior === null ? null : [d.posterior, ZERO, sub(ONE, d.posterior), ZERO].map(text) }).toEqual(c.expected);
});
for (const [i, c] of fixture.counting.entries()) it(`itertools oracle: counting case ${i}`, () => {
  const d = deriveCounting(c.n, c.k, c.ordered, c.replacement);
  expect({ count: Number(d.count), examples: d.examples.map(x => x.items) }).toEqual(c.expected);
});
