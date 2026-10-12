import { div, fromDecimal, int } from '../quantity/rational';

export function percent(value: number) {
  const exact = fromDecimal(value, 2);
  if (!exact || value < 0 || value > 100) throw new RangeError('A probability percentage must be from 0 to 100, with at most two decimal places.');
  return div(exact, int(100));
}
