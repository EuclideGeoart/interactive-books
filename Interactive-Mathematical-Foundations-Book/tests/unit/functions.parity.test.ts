/**
 * TypeScript ⇄ Python oracle parity for I.5 (values through a pipeline, domains, preimages, injective / onto, composition, inverses).
 * Inputs AND expected values come from `fixtures/functions.fixtures.json`, written by `oracle/functions_oracle.py` (see its docstring for how it
 * differs: rules as Python lambdas that raise where undefined, a separate Surd class cross-checked in 60-digit decimals, domains read off a grid
 * of eighths with the edge found by bisection, preimages found by scanning and bracketing sign changes). Exact values, defined / undefined,
 * domains, counts, injective and onto must match exactly; decimals and bisection roots within the stated tolerance.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { composeOps, deriveComposition, deriveInverse, type FnId } from '../../src/math/functions/compose';
import { domainOf } from '../../src/math/functions/domain';
import { sumValue } from '../../src/math/algebra/extraneous';
import { isAll, type IntervalSet } from '../../src/math/functions/interval';
import { deriveFunction, domainOfRule, isInjective, isOntoReals, preimages, type RuleId } from '../../src/math/functions/rule';
import type { Num } from '../../src/math/functions/value';
import { fromDecimal, parseDecimal, rational, type Rational } from '../../src/math/quantity/rational';

type Encoded = { status: 'exact'; u: string; v: string; b: number; approx: number } | { status: 'approx'; approx: number } | { status: 'undefined' };
type DomainJson = { kind: 'all' } | { kind: 'except'; point: string } | { kind: 'ray'; side: 'above'; bound: { at: string; closed: boolean } };
interface Fixture {
  schema: string;
  tolerance: { approx: number };
  evaluations: { id: string; input: { rule: RuleId; a: number; x: string }; expected: Encoded }[];
  compositions: { id: string; input: { f: FnId; g: FnId; x: string }; expected: { fg: Encoded; gf: Encoded; same: boolean } }[];
  domains: { id: string; input: { rule?: RuleId; a?: number; f?: FnId; g?: FnId }; expected: DomainJson }[];
  preimages: { id: string; input: { rule: RuleId; a: number; h: string }; expected: { count: number | 'all'; points: number[] } }[];
  properties: { id: string; input: { rule: RuleId; a: number }; expected: { injective: boolean; onto: boolean } }[];
  inverses: { id: string; input: { fn: FnId; restrict: boolean; x: string }; expected: { inDomain: boolean; hasInverse: boolean; roundTrip: boolean; twin: string | null } }[];
}
const fixture = JSON.parse(readFileSync('fixtures/functions.fixtures.json', 'utf8')) as Fixture;
const TOL = fixture.tolerance.approx;

function exactOf(text: string): Rational {
  if (text.includes('/')) { const [n, d] = text.split('/'); return rational(BigInt(n!), BigInt(d!)); }
  return parseDecimal(text)!;
}
const showR = (r: Rational): string => (r.den === 1n ? `${r.num}` : `${r.num}/${r.den}`);
const asNumber = (x: string): number => Number(exactOf(x).num) / Number(exactOf(x).den);

function same(actual: Num, expected: Encoded, label: string) {
  expect(actual.kind === 'exact' ? 'exact' : actual.kind, label).toBe(expected.status);
  if (actual.kind === 'exact' && expected.status === 'exact') {
    expect(showR(actual.s.u), `${label} u`).toBe(expected.u);
    expect(showR(actual.s.v), `${label} v`).toBe(expected.v);
    expect(Number(actual.s.b), `${label} b`).toBe(expected.b);
    expect(Math.abs(actual.approx - expected.approx), `${label} approx`).toBeLessThanOrEqual(TOL * Math.max(1, Math.abs(expected.approx)));
    expect(Math.abs(sumValue(actual.s) - expected.approx)).toBeLessThanOrEqual(TOL * Math.max(1, Math.abs(expected.approx)));
  }
  if (actual.kind === 'approx' && expected.status === 'approx') expect(Math.abs(actual.value - expected.approx), `${label} approx`).toBeLessThanOrEqual(TOL * Math.max(1, Math.abs(expected.approx)));
}

/** The same description the oracle uses, read off an interval set. */
function describe_(set: IntervalSet): DomainJson {
  if (isAll(set)) return { kind: 'all' };
  if (set.length === 2 && set[0]!.lo === null && set[1]!.hi === null && !set[0]!.hiClosed && !set[1]!.loClosed && set[0]!.hi!.num * set[1]!.lo!.den === set[1]!.lo!.num * set[0]!.hi!.den) {
    return { kind: 'except', point: showR(set[0]!.hi!) };
  }
  if (set.length === 1 && set[0]!.hi === null && set[0]!.lo !== null) return { kind: 'ray', side: 'above', bound: { at: showR(set[0]!.lo), closed: set[0]!.loClosed } };
  throw new Error('domain outside the oracle vocabulary');
}

describe('oracle parity: I.5', () => {
  it('uses the expected schema and covers all families', () => {
    expect(fixture.schema).toBe('book2.functions.fixtures/1');
    expect(fixture.evaluations.length).toBe(1584);
    expect(fixture.compositions.length).toBe(336);
    expect(fixture.domains.length).toBe(82);
    expect(fixture.preimages.length).toBe(1254);
    expect(fixture.properties.length).toBe(66);
    expect(fixture.inverses.length).toBe(264);
  });

  it('values through a rule: exact u + v√b, undefined where the machine refuses', () => {
    for (const c of fixture.evaluations) {
      const x = asNumber(c.input.x);
      const d = deriveFunction({ rule: c.input.rule, a: c.input.a, x });
      same(d.output, c.expected, c.id);
      expect(d.inDomain, `${c.id} inDomain`).toBe(c.expected.status !== 'undefined');
    }
  });

  it('domains of the rules and of the 16 composites: computed backwards by the model, read off a grid by the oracle', () => {
    for (const c of fixture.domains) {
      const set = c.input.rule ? domainOfRule(c.input.rule, c.input.a!) : domainOf(composeOps(c.input.f!, c.input.g!));
      expect(describe_(set), c.id).toEqual(c.expected);
    }
  });

  it('composition: both orders, exact values, and whether they agree at this x', () => {
    for (const c of fixture.compositions) {
      const d = deriveComposition({ f: c.input.f, g: c.input.g, x: asNumber(c.input.x) });
      same(d.fg.output, c.expected.fg, `${c.id} f∘g`);
      same(d.gf.output, c.expected.gf, `${c.id} g∘f`);
      expect(d.sameValue, `${c.id} same`).toBe(c.expected.same);
    }
  });

  it('preimages: the same number of inputs for every height, and the same inputs', () => {
    for (const c of fixture.preimages) {
      const p = preimages(c.input.rule, c.input.a, exactOf(c.input.h));
      const count = p.kind === 'none' ? 0 : p.kind === 'all' ? 'all' : p.xs.length;
      expect(count, c.id).toBe(c.expected.count);
      if (p.kind === 'points') {
        const mine = p.xs.map(x => sumValue(x)).sort((a, b) => a - b);
        mine.forEach((v, i) => expect(Math.abs(v - c.expected.points[i]!), `${c.id} point ${i}`).toBeLessThan(1e-8));
      }
    }
  });

  it('injective and onto agree with the oracle (never more than one preimage / always at least one on the table of heights)', () => {
    for (const c of fixture.properties) {
      expect(isInjective(c.input.rule, c.input.a), `${c.id} injective`).toBe(c.expected.injective);
      expect(isOntoReals(c.input.rule, c.input.a), `${c.id} onto`).toBe(c.expected.onto);
    }
  });

  it('inverses: round trip exact, no inverse for the unrestricted square, and its twin', () => {
    for (const c of fixture.inverses) {
      const d = deriveInverse({ fn: c.input.fn, x: asNumber(c.input.x), restrict: c.input.restrict });
      expect(d.inDomain, `${c.id} inDomain`).toBe(c.expected.inDomain);
      expect(d.hasInverse, `${c.id} hasInverse`).toBe(c.expected.hasInverse);
      expect(d.roundTrip, `${c.id} roundTrip`).toBe(c.expected.roundTrip);
      expect(d.twin === null ? null : showR(d.twin), `${c.id} twin`).toBe(c.expected.twin);
    }
  });

  it('every input of the fixture is read exactly (at most two decimals)', () => {
    for (const c of fixture.evaluations) expect(fromDecimal(asNumber(c.input.x), 2), c.id).not.toBeNull();
  });
});
