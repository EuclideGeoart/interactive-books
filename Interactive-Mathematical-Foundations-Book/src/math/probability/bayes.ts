import { add, div, fromDecimal, int, mul, ONE, sub } from '../quantity/rational';

export function percent(value: number) {
  const exact = fromDecimal(value, 2);
  if (!exact || value < 0 || value > 100) throw new RangeError('A probability percentage must be from 0 to 100, with at most two decimal places.');
  return div(exact, int(100));
}

/** Cells always mean A∩E, A∩Eᶜ, Aᶜ∩E, Aᶜ∩Eᶜ for the selected evidence E. */
export function deriveBayes(prior: number, sensitivity: number, falsePositive: number, evidence: 'positive' | 'negative') {
  if (!['positive', 'negative'].includes(evidence)) throw new RangeError('Choose positive or negative evidence.');
  const p = percent(prior), hit = percent(sensitivity), falseAlarm = percent(falsePositive);
  const likelihoodA = evidence === 'positive' ? hit : sub(ONE, hit);
  const likelihoodNotA = evidence === 'positive' ? falseAlarm : sub(ONE, falseAlarm);
  const cells = [mul(p, likelihoodA), mul(p, sub(ONE, likelihoodA)), mul(sub(ONE, p), likelihoodNotA), mul(sub(ONE, p), sub(ONE, likelihoodNotA))];
  const normalizer = add(cells[0]!, cells[2]!);
  const posterior = normalizer.num === 0n ? null : div(cells[0]!, normalizer);
  const posteriorMass = posterior === null ? null : [posterior, sub(ONE, posterior)];
  return { prior: p, likelihoodA, likelihoodNotA, falseNegative: sub(ONE, hit), cells, evidence: normalizer, posterior, posteriorMass,
    expectedCounts: cells.map(mass => mul(int(10000), mass)), total: ONE, impossible: normalizer.num === 0n, discarded: sub(ONE, normalizer) };
}
