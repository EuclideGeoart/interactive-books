import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rational, type Rational } from '../../src/math/quantity/rational';
import { LIMIT_FUNCTIONS, joinFunction, shiftedPole, type JoinValue } from '../../src/math/calculus/catalog';
import { analyse } from '../../src/math/calculus/limits';
import type { OneSided, Univariate } from '../../src/math/calculus/univariate';

const fixture = JSON.parse(readFileSync('fixtures/limits.fixtures.json', 'utf8'));
const frac = (t: string): Rational => { const [n, d = '1'] = t.split('/'); if (n!.includes('.')) { const [i, f] = n!.split('.'); return rational(BigInt(i! + f!), 10n ** BigInt(f!.length)); } return rational(BigInt(n!), BigInt(d)); };
const q = (r: Rational) => (r.den === 1n ? `${r.num}` : `${r.num}/${r.den}`);
const side = (s: OneSided) => s.kind === 'finite' ? { kind: 'finite', exact: q(s.exact!) } : s.kind === 'infinite' ? { kind: 'infinite', sign: s.sign } : { kind: 'none', cause: s.cause };
const fnOf = (c: { fn: string; c?: string; m?: string; mode?: string; v?: string }): Univariate =>
  c.fn === 'join' ? joinFunction(frac(c.c!), frac(c.m!), c.mode as JoinValue, frac(c.v!)) : c.fn === 'shifted-pole' ? shiftedPole : LIMIT_FUNCTIONS[c.fn]!.f;
describe('III.1/III.2 limits and continuity against the independent Python oracle', () => {
  for (const [i, c] of fixture.cases.entries()) it(`${i}: ${c.fn}${c.mode ? ` c=${c.c} m=${c.m} ${c.mode}` : ''} at a=${c.a}`, () => {
    const d = analyse(fnOf(c), frac(c.a));
    expect(d.value.kind === 'value' ? q(d.value.exact ?? rational(BigInt(d.value.value), 1n)) : null).toBe(c.value);
    const strip = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
    if (c.fn === 'oscillation' || c.fn === 'squeeze') { expect(d.left.kind).toBe(c.left.kind); expect(d.right.kind).toBe(c.right.kind); }
    else { expect(strip(side(d.left))).toEqual(c.left); expect(strip(side(d.right))).toEqual(c.right); }
    expect(d.kind).toBe(c.kind);
  });
});
