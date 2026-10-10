/**
 * TypeScript ⇄ Python oracle parity for I.1 (roots in radical form, integer powers and their rules, units, the hero's square ⇄ root).
 * Inputs AND expected values come from `fixtures/quantity.fixtures.json`, written by `oracle/quantity_oracle.py` (see its docstring for how it differs).
 * Exact forms, undefined/numeric policies, power values, rule outcomes and unit strings must match EXACTLY; doubles within the stated ulps.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyOp, unitText, type Dim } from '../../src/math/quantity/dimension';
import { derivePowers } from '../../src/math/quantity/powers';
import { parseDecimal, power, rational, type Rational } from '../../src/math/quantity/rational';
import { rootOf } from '../../src/math/quantity/root';
import { deriveSquare } from '../../src/math/quantity/square';

interface Fixture {
  schema: string;
  tolerance: { approxRootN2: number; approxRootN3Plus: number };
  roots: { id: string; tags: string[]; input: { A: string; n: number }; expected: { kind: string; a?: string; b?: string; c?: string; rational?: boolean; approx?: number } }[];
  powers: { id: string; input: { base: string; k: number }; expected: { kind: string; num?: string; den?: string } }[];
  rules: { id: string; input: { base: string; m: number; n: number }; expected: { id: string; applies: boolean; equal: boolean }[] }[];
  units: { id: string; input: { op: 'add' | 'subtract' | 'multiply' | 'divide' | 'square' | 'root'; a: { value: string; dim: Dim }; b: { value: string; dim: Dim } }; expected: { ok: boolean; kind?: string; num?: string; den?: string; a?: string; b?: string; c?: string; approx?: number; dim?: Dim; unit?: string } }[];
  squares: { id: string; input: { mode: 'side' | 'area'; value: string }; expected: Record<string, unknown> }[];
}
const fixture = JSON.parse(readFileSync('fixtures/quantity.fixtures.json', 'utf8')) as Fixture;

const view = new DataView(new ArrayBuffer(8));
function ordered(x: number): bigint {
  view.setFloat64(0, x);
  const bits = view.getBigInt64(0);
  return bits < 0n ? -(bits & 0x7fffffffffffffffn) : bits;
}
const ulps = (a: number, b: number): number => (a === b ? 0 : Number(ordered(a) > ordered(b) ? ordered(a) - ordered(b) : ordered(b) - ordered(a)));
const worst = { n2: 0, n3plus: 0 };

/** "8/9" or a decimal string, exactly. */
function exactOf(text: string): Rational {
  if (text.includes('/')) { const [n, d] = text.split('/'); return rational(BigInt(n!), BigInt(d!)); }
  return parseDecimal(text)!;
}

describe('fixture sanity', () => {
  it('has the expected schema and covers every family of cases', () => {
    expect(fixture.schema).toBe('book2.quantity.fixtures/1');
    expect(fixture.roots.length).toBeGreaterThan(700);
    expect(fixture.powers.length).toBeGreaterThan(300);
    expect(fixture.rules.length).toBeGreaterThan(400);
    expect(fixture.units.length).toBeGreaterThan(300);
    expect(fixture.squares.length).toBeGreaterThan(300);
    const tags = new Set(fixture.roots.flatMap(c => c.tags));
    for (const t of ['named', 'integer', 'decimal', 'square-of-decimal', 'random', 'six-decimals', 'beyond-guard', 'n2', 'n3', 'n4', 'n5']) expect(tags.has(t), t).toBe(true);
    const kinds = new Set(fixture.roots.map(c => c.expected.kind));
    expect([...kinds].sort()).toEqual(['exact', 'numeric', 'undefined']);
    expect(fixture.roots.some(c => c.expected.kind === 'exact' && c.expected.b !== '1')).toBe(true);
    expect(fixture.rules.some(c => c.expected.some(r => !r.applies))).toBe(true);
  });
});

describe('n-th roots in radical form ⇄ Python oracle (prime factorisation of numerator and denominator)', () => {
  for (const c of fixture.roots) {
    it(c.id, () => {
      const res = rootOf(exactOf(c.input.A), c.input.n);
      const e = c.expected;
      expect(res.kind).toBe(e.kind);
      if (res.kind === 'exact') {
        expect(`${res.root.a}`).toBe(e.a);
        expect(`${res.root.b}`).toBe(e.b);
        expect(`${res.root.c}`).toBe(e.c);
        expect(res.root.b === 1n).toBe(e.rational);
      }
      if (res.kind !== 'undefined') {
        const u = ulps(res.approx, e.approx!);
        const key = c.input.n === 2 ? 'n2' : 'n3plus';
        worst[key] = Math.max(worst[key], u);
        expect(u, `${c.id}: ${res.approx} vs ${e.approx}`).toBeLessThanOrEqual(c.input.n === 2 ? fixture.tolerance.approxRootN2 : fixture.tolerance.approxRootN3Plus);
      }
    });
  }
  it('reports the largest ulp error observed (the tolerances are not arbitrary)', () => {
    console.info('quantity roots: max observed ulp error vs oracle:', JSON.stringify(worst), 'tolerances:', JSON.stringify(fixture.tolerance));
    expect(worst.n2).toBeLessThanOrEqual(1);
  });
});

describe('integer powers ⇄ Python oracle (Fraction ** int with the book\'s two conventions)', () => {
  for (const c of fixture.powers) {
    it(c.id, () => {
      const p = power(exactOf(c.input.base), c.input.k);
      expect(p.kind).toBe(c.expected.kind);
      if (p.kind === 'value') { expect(`${p.value.num}`).toBe(c.expected.num); expect(`${p.value.den}`).toBe(c.expected.den); }
    });
  }
});

describe('the rules of powers ⇄ Python oracle', () => {
  for (const c of fixture.rules) {
    it(c.id, () => {
      const got = derivePowers(exactOf(c.input.base), c.input.m, c.input.n).rules.map(r => ({ id: r.id, applies: r.applies, equal: r.equal }));
      expect(got).toEqual(c.expected);
    });
  }
});

describe('units as exponent vectors ⇄ Python oracle', () => {
  for (const c of fixture.units) {
    it(c.id, () => {
      const out = applyOp(c.input.op, { value: exactOf(c.input.a.value), dim: c.input.a.dim }, { value: exactOf(c.input.b.value), dim: c.input.b.dim });
      const e = c.expected;
      expect(out.ok).toBe(e.ok);
      if (!out.ok) return;
      expect([...out.result.dim]).toEqual(e.dim);
      expect(unitText(out.result.dim)).toBe(e.unit);
      expect(out.result.value.kind).toBe(e.kind);
      if (out.result.value.kind === 'rational') { expect(`${out.result.value.r.num}`).toBe(e.num); expect(`${out.result.value.r.den}`).toBe(e.den); }
      else { expect([`${out.result.value.root.a}`, `${out.result.value.root.b}`, `${out.result.value.root.c}`]).toEqual([e.a, e.b, e.c]); }
    });
  }
});

describe('the hero: square ⇄ root ⇄ Python oracle', () => {
  for (const c of fixture.squares) {
    it(c.id, () => {
      const v = Number(c.input.value);
      const d = deriveSquare({ mode: c.input.mode, side: c.input.mode === 'side' ? v : 3, area: c.input.mode === 'area' ? v : 2, unit: 'none' });
      const e = c.expected as Record<string, unknown>;
      if (d.mode === 'side') {
        expect([`${d.square.num}`, `${d.square.den}`]).toEqual(e.square);
        expect(d.rootOfSquare.kind).toBe('exact');
        if (d.rootOfSquare.kind === 'exact') expect([`${d.rootOfSquare.root.a}`, `${d.rootOfSquare.root.c}`]).toEqual(e.rootOfSquare);
        expect(d.signLost).toBe(e.signLost);
      } else {
        expect(d.root.kind).toBe(e.kind);
        expect(d.solutions).toBe(e.solutions);
        if (d.root.kind === 'exact') {
          expect([`${d.root.root.a}`, `${d.root.root.b}`, `${d.root.root.c}`]).toEqual([e.a, e.b, e.c]);
          expect(d.roundTrip).toBe(e.roundTrip);
        }
      }
    });
  }
});
