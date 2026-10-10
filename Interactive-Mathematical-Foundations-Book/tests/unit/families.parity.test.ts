/**
 * TypeScript ⇄ Python oracle parity for the function families (chapter I.6; master plan §9.4, §12.3).
 * Inputs AND expected values come from `fixtures/families.fixtures.json`, written by `oracle/families_oracle.py`, which uses 90-digit
 * decimals, Fractions, a hand-written Taylor series for sine and cosine, and brute-force searches — not the algorithms of the model.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CANONICAL_COMPARE, FAMILY_IDS, deriveCompare, powerValue, type FamilyId, type FamilyValue } from '../../src/math/families/families';
import { deriveCircle, exactAngle, exactTrig, freeAngle, piMultiple, arcsinRepresentative, atan2Representative } from '../../src/math/families/circle';
import { deriveGrowth, NO_LOG_BASE_1, NO_LOG_X, type BasePreset } from '../../src/math/families/growth';
import { deriveIdentities } from '../../src/math/families/identities';
import { EXP_OVERFLOW_ABOVE, EXP_UNDERFLOW_BELOW, roundTrip, type RoundTripFamily, type RoundTripOrder, type StepValue } from '../../src/math/families/roundtrip';
import { rat, type Rat } from '../../src/math/families/rational';

type Exact = { kind: 'exact'; value: string };
type Numeric = { kind: 'numeric'; value: number; atDouble?: number; bound?: number; boundRelative?: number };
type Expected = Exact | Numeric | { kind: 'undefined'; why?: string } | { kind: 'overflow' };
interface Fixture {
  schema: string;
  limits: { overflowAbove: number; underflowBelow: number };
  compare: { id: string; tags: string[]; input: { a: number; h: number; x: number }; expected: { u: string; values: Record<FamilyId, Expected> } }[];
  powers: { id: string; input: { x: number }; expected: Record<'square' | 'cube' | 'sqrt', Expected> }[];
  circleExact: {
    k: number; sin: { text: string; numeric: number }; cos: { text: string; numeric: number }; sin2: { text: string; numeric: number }; cos2: { text: string; numeric: number };
    location: string; referenceIndex: number; arcsinRepresentative: number; atan2Representative: number; piMultiple: string; degrees: number; returnsThetaArcsin: boolean; returnsThetaAtan2: boolean;
  }[];
  circleFree: {
    radians: number; cos: { value: number; atDouble: number; bound: number }; sin: { value: number; atDouble: number; bound: number }; location: string; reduced: number; degrees: number;
    arcsinOfSin: number; arcsinBound: number; atan2OfComponents: number; returnsThetaArcsin: boolean; returnsThetaAtan2: boolean; pythagorean: number;
  }[];
  roundtrip: { id: string; input: { family: RoundTripFamily; order: RoundTripOrder; x: number }; expected: { regime: string; mathReturns: boolean; cause: string; steps: (string | number)[] | null; returned: boolean | null; exactError?: number } }[];
  growth: { id: string; input: { preset: BasePreset; custom: number; x: number }; expected: Record<string, unknown> }[];
  identities: { id: string; input: { a: number; b: number; k: number }; expected: Record<string, { status: 'checked' | 'undefined'; value?: number; logs?: number[]; logA?: number }> }[];
}
const fixture = JSON.parse(readFileSync('fixtures/families.fixtures.json', 'utf8')) as Fixture;

// ---------------------------------------------------------------------------------------------- helpers
const view = new DataView(new ArrayBuffer(8));
function ordered(x: number): bigint {
  view.setFloat64(0, x);
  const bits = view.getBigInt64(0);
  return bits < 0n ? -(bits & 0x7fffffffffffffffn) : bits;
}
const ulps = (a: number, b: number): number => Number(ordered(a) > ordered(b) ? ordered(a) - ordered(b) : ordered(b) - ordered(a));
/** The spacing of doubles at |x| (the smallest subnormal at 0). */
const ulpSize = (x: number): number => {
  const a = Math.abs(x);
  if (a === 0) return Number.MIN_VALUE;
  const e = Math.max(Math.floor(Math.log2(a)), -1022);
  return 2 ** (e - 52);
};
const ratText = (r: Rat): string => (r.den === 1n ? r.num.toString() : `${r.num}/${r.den}`);
const worst: Record<string, number> = {};
const note = (key: string, u: number) => { worst[key] = Math.max(worst[key] ?? 0, u); };

/** An expected FamilyValue (kind, exact text, or numbers within the stated ulps/bounds) against the model's. */
function expectValue(got: FamilyValue, e: Expected, ulpLimit: number, key: string): void {
  expect(got.kind, `${key}: kind`).toBe(e.kind);
  if (e.kind === 'exact') expect(ratText((got as { value: Rat }).value)).toBe(e.value);
  if (e.kind === 'numeric') {
    const v = (got as { value: number }).value;
    if (e.atDouble !== undefined) { const u = ulps(v, e.atDouble); note(key, u); expect(u, `${key}: ${v} vs correctly rounded ${e.atDouble}`).toBeLessThanOrEqual(ulpLimit); }
    else { const u = ulps(v, e.value); note(key, u); expect(u, `${key}: ${v} vs ${e.value}`).toBeLessThanOrEqual(ulpLimit); }
    const slack = (e.bound ?? 0) + (e.boundRelative ?? 0) * Math.abs(e.value) + ulpLimit * ulpSize(e.value);
    expect(Math.abs(v - e.value), `${key}: ${v} vs true value ${e.value} (bound ${slack})`).toBeLessThanOrEqual(slack);
  }
}

// ---------------------------------------------------------------------------------------------- tests
describe('fixture sanity', () => {
  it('has the expected schema and covers every family of cases', () => {
    expect(fixture.schema).toBe('book2.families.fixtures/1');
    expect(fixture.compare.length).toBeGreaterThan(300);
    expect(fixture.circleExact).toHaveLength(97);
    expect(fixture.circleFree.length).toBeGreaterThan(150);
    expect(fixture.roundtrip.length).toBeGreaterThan(100);
    expect(fixture.growth.length).toBeGreaterThan(100);
    expect(fixture.identities.length).toBeGreaterThan(100);
    const tags = new Set(fixture.compare.flatMap(c => c.tags));
    for (const t of ['grid', 'exact-shift', 'ln-domain', 'exp-overflow-edge', 'exp-underflow', 'exp-subnormal', 'large-trig', 'a-zero', 'random']) expect(tags.has(t), t).toBe(true);
    const kinds = new Set(fixture.compare.flatMap(c => Object.values(c.expected.values).map(v => v.kind)));
    for (const k of ['exact', 'numeric', 'undefined', 'overflow']) expect(kinds.has(k as never), k).toBe(true);
  });
  it('the float limits used in the model are the ones the oracle derives in 90 digits (ln of the largest double; ln of half the smallest subnormal)', () => {
    expect(EXP_OVERFLOW_ABOVE).toBe(fixture.limits.overflowAbove);
    expect(EXP_UNDERFLOW_BELOW).toBe(fixture.limits.underflowBelow);
  });
});

describe('comparison model ⇄ oracle', () => {
  for (const c of fixture.compare) {
    it(c.id, () => {
      const d = deriveCompare({ ...CANONICAL_COMPARE, ...c.input });
      expect(ratText(d.u)).toBe(c.expected.u);
      for (const id of FAMILY_IDS) expectValue(d.values[id], c.expected.values[id], 4, `compare.${id}`);
    });
  }
  it('reports the largest ulp error observed', () => {
    console.info('families compare: max observed ulp error vs oracle (at the double the library receives):', JSON.stringify(worst));
  });
});

describe('powers and roots ⇄ oracle', () => {
  for (const c of fixture.powers) {
    it(c.id, () => {
      const x = rat(BigInt(Math.round(c.input.x * 100)), 100n);
      expectValue(powerValue(2, x), c.expected.square, 0, 'square');
      expectValue(powerValue(3, x), c.expected.cube, 0, 'cube');
      expectValue(powerValue('sqrt', x), c.expected.sqrt, 1, 'sqrt');
    });
  }
});

describe('exact special angles ⇄ oracle (labels found by matching 90-digit values; representatives by brute force)', () => {
  for (const c of fixture.circleExact) {
    it(`k = ${c.k}`, () => {
      const t = exactTrig(c.k);
      expect(t.sin.text).toBe(c.sin.text);
      expect(t.cos.text).toBe(c.cos.text);
      expect(t.sin2.text).toBe(c.sin2.text);
      expect(t.cos2.text).toBe(c.cos2.text);
      for (const [got, want] of [[t.sin.numeric, c.sin.numeric], [t.cos.numeric, c.cos.numeric], [t.sin2.numeric, c.sin2.numeric], [t.cos2.numeric, c.cos2.numeric]] as const) {
        const u = ulps(got, want);
        note('circleExact', u);
        expect(u, `${got} vs ${want}`).toBeLessThanOrEqual(2);
      }
      const loc = t.reduction.location;
      expect(loc.kind === 'axis' ? loc.axis : loc.quadrant).toBe(c.location);
      expect(t.reduction.referenceIndex).toBe(c.referenceIndex);
      expect(arcsinRepresentative(c.k)).toBe(c.arcsinRepresentative);
      expect(atan2Representative(c.k)).toBe(c.atan2Representative);
      expect(piMultiple(c.k).text).toBe(c.piMultiple);
      if (Math.abs(c.k) <= 24) {
        const d = deriveCircle(exactAngle(c.k));
        expect(d.degrees.value).toBe(c.degrees);
        expect(d.arcsinOfSin.returnsTheta).toBe(c.returnsThetaArcsin);
        expect(d.atan2OfComponents.returnsTheta).toBe(c.returnsThetaAtan2);
      }
    });
  }
});

describe('free angles ⇄ oracle', () => {
  for (const c of fixture.circleFree) {
    it(`θ = ${c.radians}`, () => {
      const d = deriveCircle(freeAngle(c.radians));
      const value = (v: typeof d.cos): number => (v.kind === 'exact' ? v.form.numeric : v.value);
      for (const [name, got, want] of [['cos', value(d.cos), c.cos], ['sin', value(d.sin), c.sin]] as const) {
        const u = ulps(got, want.atDouble);
        note('circleFree', u);
        expect(u, `${name} ${got} vs ${want.atDouble}`).toBeLessThanOrEqual(2);
        expect(Math.abs(got - want.value), `${name} vs true value`).toBeLessThanOrEqual(want.bound + 2 * ulpSize(want.value));
      }
      const loc = d.location;
      expect(loc.kind === 'axis' ? loc.axis : loc.quadrant).toBe(c.location);
      const reduced = d.reduced as { radians: number };
      expect(Math.abs(reduced.radians - c.reduced)).toBeLessThanOrEqual(1e-14);
      expect(ulps(d.degrees.value, c.degrees)).toBeLessThanOrEqual(6);
      expect(Math.abs((d.arcsinOfSin as { radians: number }).radians - c.arcsinOfSin), 'arcsin(sin θ)').toBeLessThanOrEqual(c.arcsinBound);
      expect(Math.abs((d.atan2OfComponents as { radians: number }).radians - c.atan2OfComponents), 'atan2').toBeLessThanOrEqual(4 * ulpSize(c.atan2OfComponents) + 2e-15);
      expect(d.arcsinOfSin.returnsTheta).toBe(c.returnsThetaArcsin);
      expect(d.atan2OfComponents.returnsTheta).toBe(c.returnsThetaAtan2);
      expect(Math.abs(d.pythagorean.value - c.pythagorean)).toBeLessThanOrEqual(4 * 2 ** -53);
    });
  }
});

describe('inverse round trips ⇄ oracle (judged by the TRUE error of the stored double)', () => {
  for (const c of fixture.roundtrip) {
    it(c.id, () => {
      const r = roundTrip(c.input);
      const e = c.expected;
      expect(r.mathReturns).toBe(e.mathReturns);
      const allowed: Record<string, string[]> = {
        ok: ['ok'], domain: ['domain'], 'sign-lost': ['sign-lost'], overflow: ['overflow'], underflow: ['underflow'],
        'rounding-or-ok': ['ok', 'rounding'], 'subnormal-or-rounding': ['subnormal', 'rounding', 'ok'],
      };
      expect(allowed[e.cause], e.cause).toContain(r.cause);
      if (e.regime === 'subnormal') expect(['subnormal', 'rounding', 'ok']).toContain(r.cause);
      if (e.returned !== null) expect(r.returned, `returned (true error ${e.exactError})`).toBe(e.returned);
      if (e.cause === 'domain') expect(r.returned).toBeNull();
      if (e.steps) {
        const model = (s: StepValue): string | number => (s.kind === 'exact' ? ratText(s.value) : s.kind === 'numeric' ? s.value : s.kind);
        e.steps.forEach((want, i) => {
          const got = model(r.steps[i]!.output);
          if (typeof want === 'string') expect(got, `step ${i}`).toBe(want);
          else {
            expect(typeof got).toBe('number');
            const x = Math.abs(c.input.x);
            const tol = i === 0 ? 8 * ulpSize(want) : c.input.order === 'inverse-first' && c.input.family === 'exp' ? 8 * 2 ** -52 * (1 + Math.abs(e.steps![0] as number)) * Math.abs(want) : 16 * 2 ** -52 * Math.max(1, x);
            expect(Math.abs((got as number) - want), `step ${i}: ${got} vs ${want}`).toBeLessThanOrEqual(tol);
          }
        });
      } else {
        // overflow, underflow or a domain failure: the second step carries no number
        expect(r.steps[1].output.kind === 'lost' || r.steps[1].output.kind === 'undefined').toBe(true);
      }
    });
  }
  it('the oracle labels both ends of the double range the way the model does', () => {
    const regimes = new Set(fixture.roundtrip.map(c => c.expected.regime));
    for (const r of ['overflow', 'underflow', 'subnormal', 'normal', 'domain', 'exact']) expect(regimes.has(r), r).toBe(true);
  });
});

describe('bases, doubling time and logarithms ⇄ oracle', () => {
  const same = (got: FamilyValue, want: Expected, key: string) => {
    if (want.kind === 'undefined') { expect(got.kind, key).toBe('undefined'); return; }
    expectValue(got, want, 8, key);
  };
  for (const c of fixture.growth) {
    it(c.id, () => {
      const d = deriveGrowth(c.input);
      const e = c.expected as { kind: string; power: Expected; lnBase: Expected; logAtX: Expected & { why?: string }; period: { kind: string; value?: Expected }; bits: Expected; nats: Expected };
      expect(d.kind).toBe(e.kind);
      same(d.power, e.power, 'growth.power');
      same(d.lnBase, e.lnBase, 'growth.lnBase');
      same(d.logAtX, e.logAtX, 'growth.log');
      if (e.logAtX.kind === 'undefined') expect((d.logAtX as { reason: string }).reason).toBe(e.logAtX.why === 'base1' ? NO_LOG_BASE_1 : NO_LOG_X);
      expect(d.period.kind).toBe(e.period.kind);
      if (e.period.value) same((d.period as { value: FamilyValue }).value, e.period.value, 'growth.period');
      same(d.bits, e.bits, 'growth.bits');
      same(d.nats, e.nats, 'growth.nats');
    });
  }
});

describe('logarithm identities ⇄ oracle (the mathematics is exact; the doubles only have to agree within their stated tolerance)', () => {
  for (const c of fixture.identities) {
    it(c.id, () => {
      const d = deriveIdentities(c.input);
      for (const check of d.checks) {
        const e = c.expected[check.id]!;
        expect(check.status, check.id).toBe(e.status);
        if (e.status === 'undefined') { expect(check.reason, check.id).toBeTruthy(); continue; }
        expect(check.within, `${check.id}: difference ${check.difference}, tolerance ${check.tolerance}`).toBe(true);
        const tol = check.tolerance!;
        const value = e.value!;
        if (check.id === 'change-of-base') {
          expect(Math.abs(check.lhs! - value)).toBeLessThanOrEqual(8 * ulpSize(value));
          expect(Math.abs(check.rhs! - value), 'b^(ln a / ln b) vs a').toBeLessThanOrEqual(tol);
        } else {
          expect(Math.abs(check.lhs! - value), `${check.id} lhs vs true ${value}`).toBeLessThanOrEqual(tol);
          expect(Math.abs(check.rhs! - value), `${check.id} rhs vs true ${value}`).toBeLessThanOrEqual(tol);
        }
        note('identities', Math.abs(check.difference!) / tol);
      }
    });
  }
  it('reports the largest fraction of the tolerance the difference ever used (identities)', () => {
    console.info('identities: largest |difference| / tolerance:', worst['identities']);
    expect(worst['identities'] ?? 0).toBeLessThanOrEqual(1);
  });
});
