import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById } from '../../src/lessons/quantities/exercises';
import { combine, LENGTH, TIME } from '../../src/math/quantity/dimension';
import { int, parseDecimal, power, mul, toNumber } from '../../src/math/quantity/rational';
import { rootOf } from '../../src/math/quantity/root';
import type { Answer } from '../../src/platform/exercise';

const grade = (id: string, answer: Answer) => exerciseById(id)!.grade(answer);
const choice = (id: string, c: string) => grade(id, { choice: c });

describe('I.1 exercise set', () => {
  it('has unique ids, at least five exercises, and a worked solution and prompt for each', () => {
    const ids = EXERCISES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(EXERCISES.length).toBeGreaterThanOrEqual(8);
    for (const e of EXERCISES) {
      expect(e.solution.length).toBeGreaterThan(40);
      expect(e.prompt.length).toBeGreaterThan(20);
      expect(Boolean(e.choices) !== Boolean(e.fields), `${e.id}: choices xor fields`).toBe(true);
    }
  });
  it('every multiple-choice exercise has exactly one correct choice and a distinct, specific message for every wrong one', () => {
    for (const e of EXERCISES.filter(x => x.choices)) {
      const results = e.choices!.map(c => ({ id: c.id, r: e.grade({ choice: c.id }) }));
      expect(results.filter(x => x.r.correct), e.id).toHaveLength(1);
      const messages = results.map(x => x.r.message);
      expect(new Set(messages).size, `${e.id}: distinct feedback`).toBe(messages.length);
      for (const m of messages) expect(m, e.id).not.toBe('Not quite.');
      expect(e.grade({}).correct).toBe(false);
    }
  });
  it('every field exercise refuses empty and junk input without crashing', () => {
    for (const e of EXERCISES.filter(x => x.fields)) {
      for (const junk of ['', 'abc', '1/0', '--2', '   ']) {
        const answer: Record<string, string> = {};
        for (const f of e.fields!) answer[f.id] = junk;
        expect(e.grade(answer).correct, `${e.id} ${junk}`).toBe(false);
      }
      expect(e.grade({}).correct).toBe(false);
    }
  });
});

describe('I.1 grading against the model', () => {
  it('sqrt of a square: the right choice, and the named sign slip', () => {
    expect(choice('sqrt-of-square', 'plus5').correct).toBe(true);
    const slip = choice('sqrt-of-square', 'minus5');
    expect(slip.correct).toBe(false);
    expect(slip.message).toMatch(/erased the sign/);
  });
  it('simplify √72: expected values come from rootOf; partial simplifications are named', () => {
    const r = rootOf(int(72), 2);
    if (r.kind !== 'exact') throw new Error('exact');
    expect(grade('simplify-72', { a: String(r.root.a), b: String(r.root.b) }).correct).toBe(true);
    expect(grade('simplify-72', { a: '6', b: '2' }).correct).toBe(true);
    for (const [a, b, factor] of [['2', '18', '9'], ['3', '8', '4']] as const) {
      const g = grade('simplify-72', { a, b });
      expect(g.correct).toBe(false);
      expect(g.message).toMatch(/not fully simplified/);
      expect(g.message).toContain(`square factor ${factor}`);
    }
    expect(grade('simplify-72', { a: '36', b: '2' }).message).toMatch(/36 is the square factor/);
    expect(grade('simplify-72', { a: '5', b: '3' }).message).toMatch(/not 72/);
    expect(grade('simplify-72', { a: '-6', b: '2' }).correct).toBe(false);
    expect(grade('simplify-72', { a: '6.5', b: '2' }).correct).toBe(false);
  });
  it('construct a side: accepts only numbers whose exact square is 0.0049', () => {
    expect(grade('construct-side', { side: '0.07' }).correct).toBe(true);
    expect(grade('construct-side', { side: '7/100' }).correct).toBe(true);
    const negative = grade('construct-side', { side: '-0.07' });
    expect(negative.correct).toBe(false);
    expect(negative.message).toMatch(/cannot be negative/);
    expect(grade('construct-side', { side: '0.7' }).message).toMatch(/decimal places/);
    expect(grade('construct-side', { side: '0.007' }).message).toMatch(/6 decimal places/);
    expect(grade('construct-side', { side: '0.0700000001' }).correct).toBe(false);
    // every accepted answer really satisfies the model's own check
    const target = parseDecimal('0.0049')!;
    for (const s of ['0.07', '7/100', '0.070']) {
      const side = parseDecimal(s) ?? { num: BigInt(s.split('/')[0]!), den: BigInt(s.split('/')[1] ?? '1') };
      expect(mul(side, side)).toEqual(target);
    }
  });
  it('units: the unique meaningful expression is the product, and the model agrees', () => {
    expect(choice('units-meaning', 'multiply').correct).toBe(true);
    expect(combine('multiply', { value: int(3), dim: LENGTH }, { value: int(2), dim: TIME }).ok).toBe(true);
    expect(combine('add', { value: int(3), dim: LENGTH }, { value: int(2), dim: TIME }).ok).toBe(false);
    expect(combine('add', { value: int(3), dim: LENGTH }, { value: int(2), dim: [2, 0, 0] }).ok).toBe(false);
    for (const wrong of ['add-clash', 'add-area', 'root-length', 'divide-zero']) expect(choice('units-meaning', wrong).correct).toBe(false);
  });
  it('speed: number and exponent, with the reversed-exponent slip named', () => {
    expect(grade('speed-units', { speed: '12', exp: '-1' }).correct).toBe(true);
    expect(grade('speed-units', { speed: '12', exp: '−1' }).correct).toBe(true);
    expect(grade('speed-units', { speed: '12', exp: '1' }).message).toMatch(/denominator/);
    expect(grade('speed-units', { speed: '1875', exp: '-1' }).message).toMatch(/divide/);
    expect(grade('speed-units', { speed: '0.08333', exp: '-1' }).correct).toBe(false);
    expect(grade('speed-units', { speed: '12', exp: '-1.5' }).correct).toBe(false);
  });
  it('2^-3: 1/8 in any exact spelling; the sign and multiplier slips are named', () => {
    const p = power(int(2), -3);
    if (p.kind !== 'value') throw new Error('defined');
    expect(toNumber(p.value)).toBe(0.125);
    for (const s of ['1/8', '0.125', '2/16']) expect(grade('negative-power', { value: s }).correct, s).toBe(true);
    expect(grade('negative-power', { value: '-8' }).message).toMatch(/does not change the sign/);
    expect(grade('negative-power', { value: '-1/8' }).message).toMatch(/sign is not/);
    expect(grade('negative-power', { value: '-6' }).message).toMatch(/multiplier/);
    expect(grade('negative-power', { value: '8' }).correct).toBe(false);
    expect(grade('negative-power', { value: '0.12' }).correct).toBe(false);
  });
  it('power of a power: exponent 6 and value 64; the addition slip is named', () => {
    expect(grade('power-of-power', { k: '6', value: '64' }).correct).toBe(true);
    expect(grade('power-of-power', { k: '5', value: '32' }).message).toMatch(/added the exponents/);
    expect(grade('power-of-power', { k: '9', value: '512' }).message).toMatch(/2\^\(3²\)|2⁹/);
    expect(grade('power-of-power', { k: '6', value: '32' }).correct).toBe(false);
  });
  it('the zero base: silent, not false', () => {
    expect(choice('zero-base', 'silent').correct).toBe(true);
    expect(choice('zero-base', 'false-rule').message).toMatch(/silent, not wrong/);
    expect(power(int(0), -1).kind).toBe('undefined');
  });
  it('odd root of a negative number: -3; "undefined" gets the odd/even hint', () => {
    const r = rootOf(int(-27), 3);
    expect(r.kind).toBe('exact');
    expect(grade('odd-root', { value: '-3' }).correct).toBe(true);
    expect(grade('odd-root', { value: '3' }).message).toMatch(/\+27/);
    expect(grade('odd-root', { value: '-9' }).message).toMatch(/THREE times/);
    const u = grade('odd-root', { value: 'undefined' });
    expect(u.correct).toBe(false);
    expect(u.message).toMatch(/EVEN/);
    expect(rootOf(int(-16), 4).kind).toBe('undefined');
  });
  it('x^4 = -16 has no real solution', () => {
    expect(choice('even-root-count', 'zero').correct).toBe(true);
    expect(choice('even-root-count', 'two').message).toMatch(/x⁴ = \+16|\+16/);
    expect(rootOf(int(-16), 4).kind).toBe('undefined');
  });
  it('Python cube root: the complex principal value', () => {
    expect(choice('python-cube-root', 'complex').correct).toBe(true);
    // the principal value of (-8)^(1/3) is 8^(1/3) · e^(iπ/3) = 2(cos 60° + i sin 60°) = 1 + 1.732i
    expect(2 * Math.cos(Math.PI / 3)).toBeCloseTo(1, 12);
    expect(2 * Math.sin(Math.PI / 3)).toBeCloseTo(Math.sqrt(3), 12);
  });
});
