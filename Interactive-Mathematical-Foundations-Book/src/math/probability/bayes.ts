import { add, div, int, mul, ONE, sub } from '../quantity/rational';
import { percent } from './percent';

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
