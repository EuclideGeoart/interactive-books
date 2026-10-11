/** Real 2×2 spectral geometry: exact classification, checked binary64 companions. */
import { add, div, eq, half, isZero, mul, rational, sub, toNumber, ZERO, type Rational } from '../quantity/rational';
import { rootOf } from '../quantity/root';
import { determinant2, multiplyVector, type ExactVector, type Matrix } from './matrices';
import { normalizeNumeric } from './vectors';
export const EIGEN_TOLERANCE = 256 * Number.EPSILON;
export interface EigenPair {
  readonly value: number; readonly exact: Rational | null; readonly direction: ExactVector | null;
  readonly unit: readonly [number, number]; readonly residual: number; readonly relativeResidual: number;
}
export function eigen2(a: Matrix) {
  if (a.rows !== 2 || a.cols !== 2) throw new RangeError('Real eigengeometry supports 2×2 matrices.');
  const [[p, q], [r, s]] = a.values as readonly [readonly [Rational, Rational], readonly [Rational, Rational]];
  const trace = add(p, s), determinant = determinant2(a), center = half(trace);
  const discriminant = sub(mul(trace, trace), mul(rational(4n), determinant));
  const scalar = isZero(q) && isZero(r) && eq(p, s);
  const kind = discriminant.num < 0n ? 'no-real' : isZero(discriminant) ? scalar ? 'scalar' : 'defective' : 'distinct';
  const root = rootOf(div(discriminant, rational(4n)), 2);
  const entries = a.values.map(row => row.map(toNumber));
  const scale = Math.max(1, Math.hypot(...entries.flat()));
  const pairs: EigenPair[] = [];
  const makePair = (value: number, exact: Rational | null, scalarAxis?: ExactVector) => {
    let direction: ExactVector | null = scalarAxis ?? null;
    let vx: number, vy: number;
    if (exact && !direction) {
      const first = [q, sub(exact, p)], second = [sub(exact, s), r];
      direction = first.every(isZero) ? second : first;
    }
    if (direction) [vx, vy] = direction.map(toNumber) as [number, number];
    else {
      const candidates: [number, number][] = [[toNumber(q), value - toNumber(p)], [value - toNumber(s), toNumber(r)]];
      [vx, vy] = Math.hypot(...candidates[0]!) >= Math.hypot(...candidates[1]!) ? candidates[0]! : candidates[1]!;
    }
    const normalized = normalizeNumeric({ x: vx, y: vy });
    if (!normalized) return;
    const unit: [number, number] = [normalized.x, normalized.y];
    const residual = Math.hypot(entries[0]![0]!*unit[0] + entries[0]![1]!*unit[1] - value*unit[0], entries[1]![0]!*unit[0] + entries[1]![1]!*unit[1] - value*unit[1]);
    pairs.push({ value, exact, direction, unit, residual, relativeResidual: residual / scale });
  };
  if (kind !== 'no-real') {
    if (kind === 'scalar') {
      makePair(toNumber(center), center, [rational(1n), ZERO]); makePair(toNumber(center), center, [ZERO, rational(1n)]);
    } else if (kind === 'defective') makePair(toNumber(center), center);
    else {
      const radical = root.kind === 'exact' && root.root.b === 1n ? rational(root.root.a, root.root.c) : null;
      const h = root.kind === 'undefined' ? 0 : root.approx, c = toNumber(center);
      // Recover the cancellation-prone root from the exact product λ₁λ₂ = det A.
      const outer = c + (c < 0 ? -h : h), inner = outer === 0 ? 0 : toNumber(determinant) / outer;
      const values = c < 0 ? [inner, outer] : [outer, inner];
      makePair(values[0]!, radical ? add(center, radical) : null);
      makePair(values[1]!, radical ? sub(center, radical) : null);
    }
  }
  const reliable = pairs.every(pair => Number.isFinite(pair.value) && pair.relativeResidual <= EIGEN_TOLERANCE) && (kind !== 'distinct' || (pairs.length === 2 && pairs[0]!.value !== pairs[1]!.value));
  const separation = pairs.length === 2 ? Math.abs(pairs[0]!.unit[0]*pairs[1]!.unit[1] - pairs[0]!.unit[1]*pairs[1]!.unit[0]) : null;
  return { a, trace, determinant, discriminant, center, root, scalar, kind, pairs, reliable, separation,
    warning: !reliable ? 'Numerical eigen-directions could not be resolved reliably; exact characteristic classification remains valid.'
      : kind === 'distinct' && separation !== null && separation < Math.sqrt(Number.EPSILON) ? 'Nearly coincident eigen-directions are sensitive to coefficient errors.' : null };
}

/** Exact test for a learner-entered nonzero rational vector: membership on its own image line. */
export function testEigenvector(a: Matrix, x: ExactVector) {
  if (a.rows !== 2 || a.cols !== 2 || x.length !== 2) throw new RangeError('Eigenvector testing needs a 2×2 map and length-2 input.');
  const output = multiplyVector(a, x); if (!output.ok) throw new RangeError(output.reason);
  const nonzero = x.some(v => !isZero(v));
  const onLine = nonzero && isZero(sub(mul(x[0]!, output.value[1]!), mul(x[1]!, output.value[0]!)));
  const index = !isZero(x[0]!) ? 0 : 1;
  return { output: output.value, nonzero, onLine, value: onLine ? div(output.value[index]!, x[index]!) : null };
}
export function repeatAction(a: Matrix, x: ExactVector, count = 4): readonly ExactVector[] {
  if (!Number.isInteger(count) || count < 0 || count > 6) throw new RangeError('Repeated action supports 0–6 steps.');
  const values = [x];
  for (let i = 0; i < count; i++) { const result = multiplyVector(a, values[i]!); if (!result.ok) throw new RangeError(result.reason); values.push(result.value); }
  return values;
}
