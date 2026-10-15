export type Metric = 'L1' | 'L2' | 'Lp';
export function finite(value: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(name + ' must be a finite number.');
  return value;
}
export function bounded(value: number, name: string, min: number, max: number, integer = false): number {
  finite(value, name);
  if (value < min || value > max || (integer && !Number.isInteger(value)))
    throw new RangeError(name + ' must be ' + (integer ? 'an integer ' : '') + 'between ' + min + ' and ' + max + '.');
  return value;
}
export function metricPower(metric: Metric, p: number): number {
  bounded(p, 'Minkowski power p', 1, 8);
  if (!['L1', 'L2', 'Lp'].includes(metric)) throw new RangeError('Choose metric L1, L2 or Lp.');
  return metric === 'L1' ? 1 : metric === 'L2' ? 2 : p;
}
/** Scales have each feature's units. Division makes the resulting distance dimensionless. */
export function distance(a: readonly number[], b: readonly number[], metric: Metric = 'L2', p = 2, scales?: readonly number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length < 1 || a.length > 32 || b.length !== a.length ||
      (scales !== undefined && (!Array.isArray(scales) || scales.length !== a.length)))
    throw new RangeError('Distance requires matching vectors with 1 to 32 components and matching scales.');
  const power = metricPower(metric, p);
  const left: readonly number[] = a;
  const differences = left.map((value, j) => {
    finite(value, 'First vector component'); finite(b[j]!, 'Second vector component');
    const scale = scales === undefined ? 1 : scales[j]!;
    finite(scale, 'Feature scale');
    if (scale <= 0) throw new RangeError('Feature scales must be positive.');
    return finite(Math.abs(finite(value - b[j]!, 'Coordinate difference')) / scale, 'Scaled difference');
  });
  const largest = Math.max(...differences);
  if (largest === 0) return 0;
  // Scaling before powers avoids squaring a large coordinate merely to take its square root.
  const total = differences.reduce((sum, value) => sum + (value / largest) ** power, 0);
  return finite(largest * total ** (1 / power), 'Distance arithmetic');
}
export const compareIds = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
export const pointVector = (point: {readonly x: number; readonly y: number}): readonly number[] => [finite(point.x,'Point x'), finite(point.y,'Point y')];
