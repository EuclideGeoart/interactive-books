import { expect, it } from 'vitest';
import { choose, deriveCounting, factorial } from '../../src/math/probability/counting';
import { fractionText } from '../../src/math/probability/finite';

it('four choose two distinguishes twelve ordered outcomes and six unordered outcomes', () => {
  expect(deriveCounting(4, 2, true, false).count).toBe(12n); expect(deriveCounting(4, 2, false, false).count).toBe(6n);
  expect(choose(4, 2)).toBe(6n); expect(factorial(0)).toBe(1n); expect(choose(4, 5)).toBe(0n); expect(choose(4, -1)).toBe(0n);
});
it('replacement multisets are not equiprobable and zero draws are one outcome', () => {
  const d = deriveCounting(2, 2, false, true);
  expect(d.examples.map(x => fractionText(x.probability!))).toEqual(['1/4', '1/2', '1/4']); expect(d.uniformSelections).toBe(false);
  for (const ordered of [false, true]) for (const replacement of [false, true]) expect(deriveCounting(4, 0, ordered, replacement).count).toBe(1n);
  expect(deriveCounting(2, 4, false, false).count).toBe(0n);
});
it('bounded enumeration independently agrees with counting identities', () => {
  for (let n = 2; n <= 8; n++) for (let k = 0; k <= 4; k++) for (const ordered of [false, true]) for (const replacement of [false, true]) {
    const d = deriveCounting(n, k, ordered, replacement); expect(BigInt(d.enumerationCount)).toBe(d.count); expect(d.examples.length).toBeLessThanOrEqual(12);
  }
  for (const args of [[1, 2], [9, 2], [4, 5], [4, .5]]) expect(() => deriveCounting(args[0]!, args[1]!, true, false)).toThrow();
});
