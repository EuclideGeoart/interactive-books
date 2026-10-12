import { rational } from '../quantity/rational';
import { integer } from './seeded';

export function factorial(n: number): bigint {
  integer(n, 0, 40, 'Factorial input');
  let result = 1n;
  for (let i = 2; i <= n; i++) result *= BigInt(i);
  return result;
}
export function choose(n: number, k: number): bigint {
  integer(n, 0, 40, 'n'); integer(k, -40, 80, 'k');
  if (k < 0 || k > n) return 0n;
  return factorial(n) / (factorial(k) * factorial(n - k));
}

export function deriveCounting(n: number, k: number, ordered: boolean, replacement: boolean) {
  integer(n, 2, 8, 'Available items'); integer(k, 0, 4, 'Selection size');
  if (typeof ordered !== 'boolean' || typeof replacement !== 'boolean') throw new RangeError('Selection switches must be boolean.');
  const selections: number[][] = [];
  const visit = (prefix: number[]) => {
    if (prefix.length === k) { selections.push(prefix); return; }
    for (let item = 0; item < n; item++) {
      if (!replacement && prefix.includes(item)) continue;
      if (!ordered && prefix.length && (replacement ? item < prefix.at(-1)! : item <= prefix.at(-1)!)) continue;
      visit([...prefix, item]);
    }
  };
  visit([]);
  const orderedCount = replacement ? BigInt(n) ** BigInt(k) : k > n ? 0n : factorial(n) / factorial(n - k);
  const count = ordered ? orderedCount : replacement ? choose(n + k - 1, k) : choose(n, k);
  const examples = selections.slice(0, 12).map(items => {
    const multiplicities = Array.from({ length: n }, (_, i) => items.filter(item => item === i).length);
    const arrangements = ordered ? 1n : factorial(k) / multiplicities.reduce((prod, m) => prod * factorial(m), 1n);
    return { items, arrangements, probability: orderedCount === 0n ? null : rational(arrangements, orderedCount) };
  });
  return { n, k, ordered, replacement, count, orderedCount, examples, enumerationCount: selections.length,
    uniformSelections: ordered || !replacement || k < 2, impossible: count === 0n };
}
