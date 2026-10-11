import { add, div, eq, int, mul, ONE, sub, toNumber, type Rational } from '../quantity/rational';
import { sum, weightedSpace } from './finite';
import { decimal, finiteMoments } from './moments';

/** Rows/columns refer to the latent U,V values; affine images may merge when a scale is zero. */
export function deriveJoint(weights: readonly number[], xScale = 1, yScale = 1, xShift = 0, yShift = 0) {
  if (weights.length !== 9) throw new RangeError('A three-by-three table needs nine weights.');
  const mass = weightedSpace(weights), coordinates = [-1, 0, 1].map(int);
  const a = decimal(xScale, 'X scale'), c = decimal(yScale, 'Y scale'), b = decimal(xShift, 'X shift'), d = decimal(yShift, 'Y shift');
  const xValues = coordinates.map(u => add(mul(a, u), b)), yValues = coordinates.map(v => add(mul(c, v), d));
  const rows = coordinates.map((_, i) => sum(mass.slice(i * 3, i * 3 + 3)));
  const columns = coordinates.map((_, j) => sum(mass.filter((_, i) => i % 3 === j)));
  const rowConditional = rows.map((p, i) => p.num === 0n ? null : mass.slice(i * 3, i * 3 + 3).map(q => div(q, p)));
  const columnConditional = columns.map((p, j) => p.num === 0n ? null : mass.filter((_, i) => i % 3 === j).map(q => div(q, p)));
  const x = finiteMoments(xValues, rows), y = finiteMoments(yValues, columns);
  const xy = sum(mass.map((p, i) => mul(p, mul(xValues[Math.floor(i / 3)]!, yValues[i % 3]!))));
  const covariance = sub(xy, mul(x.mean, y.mean)), varianceProduct = mul(x.variance, y.variance);
  const correlationSquared = varianceProduct.num === 0n ? null : div(mul(covariance, covariance), varianceProduct);
  if (correlationSquared && correlationSquared.num > correlationSquared.den) throw new Error('Exact covariance violates Cauchy–Schwarz.');
  const correlation = correlationSquared === null ? null : Math.sign(toNumber(covariance)) * Math.sqrt(toNumber(correlationSquared));
  const latentIndependent = mass.every((p, i) => eq(p, mul(rows[Math.floor(i / 3)]!, columns[i % 3]!)));
  const independent = a.num === 0n || c.num === 0n || latentIndependent;
  const points: { x: Rational; y: Rational; mass: Rational }[] = [];
  mass.forEach((p, i) => {
    if (p.num === 0n) return;
    const px = xValues[Math.floor(i / 3)]!, py = yValues[i % 3]!;
    const existing = points.find(q => eq(q.x, px) && eq(q.y, py));
    if (existing) existing.mass = add(existing.mass, p); else points.push({ x: px, y: py, mass: p });
  });
  if (!eq(sum(rows), ONE) || !eq(sum(columns), ONE) || !eq(sum(points.map(p => p.mass)), ONE)) throw new Error('Joint marginal normalization failed.');
  return { mass, rows, columns, rowConditional, columnConditional, xValues, yValues, x, y, xy, covariance, correlationSquared, correlation, independent, latentIndependent, points };
}
