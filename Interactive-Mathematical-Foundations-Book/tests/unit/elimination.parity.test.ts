import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { inverseExact, solveExact } from '../../src/math/linear-algebra/elimination';
import { exactVector, matrix, type ExactVector } from '../../src/math/linear-algebra/matrices';
const value = (v: ExactVector) => v.map(x => x.den === 1n ? String(x.num) : `${x.num}/${x.den}`);
const fixture = JSON.parse(readFileSync('fixtures/elimination.fixtures.json', 'utf8'));
for (const [i, c] of fixture.cases.entries()) it(`independent Fraction/minor oracle ${i}`, () => {
  const a = matrix(c.a), d = solveExact(a, exactVector(c.b)), e = c.expected;
  expect(d.rank).toBe(e.rank); expect(d.nullity).toBe(e.nullity); expect(d.pivots).toEqual(e.pivots);
  expect(d.kind).toBe(e.kind); expect(d.rref.values.map(value)).toEqual(e.rref);
  expect(d.nullspace.map(value)).toEqual(e.nullspace); expect(d.particular ? value(d.particular) : null).toEqual(e.particular);
  if (d.particular) expect(d.verified).toBe(true);
  if (a.rows === a.cols && a.rows <= 3) expect(inverseExact(a).inverse?.values.map(value) ?? null).toEqual(e.inverse);
});
