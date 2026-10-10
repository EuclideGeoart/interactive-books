/**
 * TypeScript ⇄ Python oracle parity for I.4 (linear statements and their solution sets, balanced operations and the reversal rule, the beam,
 * inequality multiplication, extraneous roots of √(x + p) = x + q, the division fallacy, the distributive law). Inputs AND expected values come
 * from `fixtures/algebra.fixtures.json`, written by `oracle/algebra_oracle.py` (see its docstring for how it differs: sets by probing the
 * difference of the two sides with a secant root, the reversal rule DISCOVERED from truth tables, 60-digit decimals for the roots).
 * Exact values, sets, relations, signs, classifications and counts must match exactly; the decimal of an irrational root within the stated tolerance.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { beamAt, deriveBalance, exact, solutionPath, statementOf, tryStep, type StatementSpec } from '../../src/math/algebra/balance';
import { classify, deriveDistribute, type DistributeForm } from '../../src/math/algebra/expression';
import { deriveExtraneous } from '../../src/math/algebra/extraneous';
import { deriveFallacy } from '../../src/math/algebra/fallacy';
import { sameSolutionSet, scaleLinear, solve, statement, type Relation, type SolutionSet, type Statement } from '../../src/math/algebra/linear';
import { deriveReversal } from '../../src/math/algebra/reversal';
import { int, parseDecimal, rational, type Rational } from '../../src/math/quantity/rational';

interface SpecJson { a1: string; b1: string; rel: string; a2: string; b2: string }
type SetJson = { kind: 'none' | 'all' } | { kind: 'point'; x: string } | { kind: 'ray'; side: 'below' | 'above'; bound: string; closed: boolean };
interface Fixture {
  schema: string;
  tolerance: { approx: number };
  statements: { id: string; tags: string[]; input: SpecJson; expected: { set: SetJson; kind: string; pathSteps: number; pathFinal: SpecJson } }[];
  operations: { id: string; tags: string[]; input: { statement: SpecJson; op: 'add' | 'add-x' | 'scale' | 'divide'; value: string };
    expected: { accepted: boolean; reason?: string; changesSolutionSet?: boolean; next?: SpecJson; reversed?: boolean; forced?: boolean; setBefore?: SetJson; setAfter?: SetJson } }[];
  beams: { id: string; input: { statement: SpecJson; trial: string }; expected: { left: string; right: string; diff: string; lower: string; holds: boolean } }[];
  reversals: { id: string; input: { p: string; q: string; k: string }; expected: { kp: string; kq: string; before: string; after: string; rule: string; sameRelationHolds: boolean; reversedRelationHolds: boolean } }[];
  extraneous: { id: string; input: { p: number; q: number }; expected: { discriminant: number; squared: { linear: string; constant: string };
    roots: { u: string; v: string; b: number; approx: number; status: string; solves: string }[]; validCount: number; extraneousCount: number } }[];
  fallacies: { id: string; input: { c: number; m: number }; expected: { solutions: string[]; afterDividing: string; lost: string | null; atC: [string, string] } }[];
  distributions: { id: string; input: { a: string; b: string; c: string; x: string; form: DistributeForm };
    expected: { inner: string; product: string; firstTerm: string; secondTerm: string; expanded: string; gap: string; agreesHere: boolean; kind: string } }[];
}
const fixture = JSON.parse(readFileSync('fixtures/algebra.fixtures.json', 'utf8')) as Fixture;

/** "8/9" or a decimal string, exactly. */
function exactOf(text: string): Rational {
  if (text.includes('/')) { const [n, d] = text.split('/'); return rational(BigInt(n!), BigInt(d!)); }
  return parseDecimal(text)!;
}
const same = (r: Rational, text: string) => expect(`${r.num}/${r.den}`).toBe(`${exactOf(text).num}/${exactOf(text).den}`);
const specOf = (s: SpecJson): StatementSpec => ({ a1: Number(s.a1), b1: Number(s.b1), rel: s.rel as Relation, a2: Number(s.a2), b2: Number(s.b2) });
function sameStatement(st: Statement, s: SpecJson) {
  same(st.l.a, s.a1); same(st.l.b, s.b1); same(st.r.a, s.a2); same(st.r.b, s.b2);
  expect(st.rel).toBe(s.rel);
}
function setOf(json: SetJson): SolutionSet {
  if (json.kind === 'point') return { kind: 'point', x: exactOf(json.x) };
  if (json.kind === 'ray') return { kind: 'ray', side: json.side, bound: exactOf(json.bound), closed: json.closed };
  return { kind: json.kind };
}

describe('fixture sanity', () => {
  it('has the expected schema and covers every family of cases', () => {
    expect(fixture.schema).toBe('book2.algebra.fixtures/1');
    expect(fixture.statements.length).toBeGreaterThan(180);
    expect(fixture.operations.length).toBeGreaterThan(500);
    expect(fixture.beams.length).toBeGreaterThan(150);
    expect(fixture.reversals.length).toBeGreaterThan(150);
    expect(fixture.extraneous.length).toBe(169);
    expect(fixture.fallacies.length).toBe(169);
    expect(fixture.distributions.length).toBeGreaterThan(150);
  });
  it('covers every kind of solution set and every relation', () => {
    const kinds = new Set(fixture.statements.map(c => c.expected.set.kind));
    expect([...kinds].sort()).toEqual(['all', 'none', 'point', 'ray']);
    expect(new Set(fixture.statements.map(c => c.input.rel)).size).toBe(5);
    expect(new Set(fixture.statements.map(c => c.expected.kind))).toEqual(new Set(['identity', 'contradiction', 'conditional-equation', 'always-true', 'never-true', 'conditional-inequality']));
    expect(fixture.operations.some(c => !c.expected.accepted)).toBe(true);
    expect(fixture.operations.some(c => c.expected.reversed)).toBe(true);
    expect(fixture.operations.some(c => c.expected.accepted && c.expected.forced === false)).toBe(true);
  });
});

describe('parity: solution sets, kinds and the derived solution path', () => {
  for (const c of fixture.statements) {
    it(c.id, () => {
      const st = statementOf(specOf(c.input));
      const got = solve(st);
      expect(sameSolutionSet(got, setOf(c.expected.set)), `${JSON.stringify(c.expected.set)} vs ${got.kind}`).toBe(true);
      expect(classify(st)).toBe(c.expected.kind);
      const path = solutionPath(specOf(c.input));
      expect(path.length).toBe(c.expected.pathSteps);
      const d = deriveBalance({ initial: specOf(c.input), steps: path, trial: 0 });
      sameStatement(d.final, c.expected.pathFinal);
      expect(d.preserved).toBe(true);
    });
  }
});

describe('parity: balanced operations', () => {
  for (const c of fixture.operations) {
    it(c.id, () => {
      const initial = specOf(c.input.statement);
      const result = tryStep({ initial, steps: [], trial: 0 }, { op: c.input.op, value: Number(c.input.value) });
      expect(result.ok).toBe(c.expected.accepted);
      if (!c.expected.accepted) {
        if (result.ok) return;
        expect(result.reason).toMatch(c.expected.reason === 'zero-divide' ? /undefined/ : /into 0 [=<≤>≥] 0/);
        // what the naive step would do to the solution set (the reason it is rejected)
        const st = statementOf(initial);
        const naive = statement(scaleLinear(st.l, int(0)), st.rel, scaleLinear(st.r, int(0)));
        if (c.input.op === 'scale') expect(!sameSolutionSet(solve(st), solve(naive))).toBe(c.expected.changesSolutionSet);
        return;
      }
      if (!result.ok) throw new Error('unexpected rejection');
      const next = c.expected.next!;
      if (c.expected.forced) {
        sameStatement(result.next, next);
        expect(result.reversed).toBe(c.expected.reversed);
      } else {
        // a degenerate statement: the truth table cannot tell "kept" from "reversed"; the coefficients must still match and the model's convention is the rule
        same(result.next.l.a, next.a1); same(result.next.l.b, next.b1); same(result.next.r.a, next.a2); same(result.next.r.b, next.b2);
        expect(result.reversed).toBe(initial.rel !== '=' && (c.input.op === 'scale' || c.input.op === 'divide') && Number(c.input.value) < 0);
      }
      expect(sameSolutionSet(solve(statementOf(initial)), solve(result.next))).toBe(true);
      expect(sameSolutionSet(solve(result.next), setOf(c.expected.setAfter!))).toBe(true);
      expect(sameSolutionSet(solve(statementOf(initial)), setOf(c.expected.setBefore!))).toBe(true);
    });
  }
});

describe('parity: the beam', () => {
  for (const c of fixture.beams) {
    it(c.id, () => {
      const b = beamAt(statementOf(specOf(c.input.statement)), exact(Number(c.input.trial)));
      same(b.left, c.expected.left); same(b.right, c.expected.right); same(b.diff, c.expected.diff);
      expect(b.lower).toBe(c.expected.lower);
      expect(b.holds).toBe(c.expected.holds);
    });
  }
});

describe('parity: multiplying an inequality by k', () => {
  for (const c of fixture.reversals) {
    it(c.id, () => {
      const r = deriveReversal({ p: Number(c.input.p), q: Number(c.input.q), k: Number(c.input.k) });
      same(r.kp, c.expected.kp); same(r.kq, c.expected.kq);
      expect(r.before).toBe(c.expected.before);
      expect(r.after).toBe(c.expected.after);
      expect(r.rule).toBe(c.expected.rule);
      expect(r.sameRelationHolds).toBe(c.expected.sameRelationHolds);
      expect(r.reversedRelationHolds).toBe(c.expected.reversedRelationHolds);
    });
  }
});

describe('parity: extraneous roots', () => {
  let worst = 0;
  for (const c of fixture.extraneous) {
    it(c.id, () => {
      const d = deriveExtraneous(c.input);
      expect(Number(d.discriminant)).toBe(c.expected.discriminant);
      same(d.squared.linear, c.expected.squared.linear);
      same(d.squared.constant, c.expected.squared.constant);
      expect(d.roots.length).toBe(c.expected.roots.length);
      expect(d.validCount).toBe(c.expected.validCount);
      expect(d.extraneousCount).toBe(c.expected.extraneousCount);
      d.roots.forEach((r, i) => {
        const e = c.expected.roots[i]!;
        same(r.x.u, e.u); same(r.x.v, e.v);
        expect(Number(r.x.b)).toBe(e.b);
        expect(r.status).toBe(e.status);
        expect(r.solves).toBe(e.solves);
        const err = Math.abs(r.approx - e.approx);
        worst = Math.max(worst, err);
        expect(err).toBeLessThanOrEqual(fixture.tolerance.approx);
      });
    });
  }
  it('reports the worst absolute error of a decimal root', () => {
    console.log(`algebra parity: worst |approx − oracle| over the extraneous roots = ${worst.toExponential(3)}`);
    expect(worst).toBeLessThanOrEqual(fixture.tolerance.approx);
  });
});

describe('parity: the division fallacy', () => {
  for (const c of fixture.fallacies) {
    it(c.id, () => {
      const d = deriveFallacy(c.input);
      expect(d.solutions.length).toBe(c.expected.solutions.length);
      d.solutions.forEach((s, i) => same(s, c.expected.solutions[i]!));
      same(d.afterDividing, c.expected.afterDividing);
      if (c.expected.lost === null) expect(d.lost).toBeNull(); else same(d.lost!, c.expected.lost);
      same(d.atC.left, c.expected.atC[0]); same(d.atC.right, c.expected.atC[1]);
    });
  }
});

describe('parity: the distributive law', () => {
  for (const c of fixture.distributions) {
    it(c.id, () => {
      const d = deriveDistribute({ a: Number(c.input.a), b: Number(c.input.b), c: Number(c.input.c), x: Number(c.input.x), form: c.input.form });
      same(d.inner, c.expected.inner); same(d.product, c.expected.product);
      same(d.firstTerm, c.expected.firstTerm); same(d.secondTerm, c.expected.secondTerm);
      same(d.expanded, c.expected.expanded); same(d.gap, c.expected.gap);
      expect(d.agreesHere).toBe(c.expected.agreesHere);
      expect(d.kind).toBe(c.expected.kind);
    });
  }
});
