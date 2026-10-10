/** The I.6 exercises: the correct answer is accepted, the named misconceptions get their own hint, junk input is safe, and the text is plain. */
import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../../src/lessons/families/exercises';
import { NEED_NUMBERS, byId } from '../../src/platform/exercise';

const grade = (id: string, answer: Record<string, string>) => byId(EXERCISES, id)!.grade(answer);
const wrong = (id: string, answer: Record<string, string>) => { const r = grade(id, answer); expect(r.correct, `${id} ${JSON.stringify(answer)}`).toBe(false); return r.message; };

describe('exercise set', () => {
  it('has unique ids, at least eight exercises, every kind of prompt, a solution, and plain text (no TeX, no HTML)', () => {
    expect(new Set(EXERCISES.map(e => e.id)).size).toBe(EXERCISES.length);
    expect(EXERCISES.length).toBeGreaterThanOrEqual(8);
    for (const e of EXERCISES) {
      expect(Boolean(e.fields?.length) !== Boolean(e.choices?.length), `${e.id}: fields xor choices`).toBe(true);
      for (const text of [e.title, e.prompt, e.solution, ...(e.fields ?? []).map(f => f.label), ...(e.choices ?? []).map(c => c.label)]) expect(text, e.id).not.toMatch(/[$\\]|<[a-z/]/i);
      expect(e.solution.length).toBeGreaterThan(60);
    }
    expect(new Set(EXERCISES.map(e => e.kind)).size).toBeGreaterThanOrEqual(3);
  });
  it('every multiple-choice exercise has exactly one correct choice, and each wrong choice has its own hint', () => {
    for (const e of EXERCISES.filter(x => x.choices)) {
      const results = e.choices!.map(c => ({ id: c.id, r: e.grade({ choice: c.id }) }));
      expect(results.filter(x => x.r.correct), e.id).toHaveLength(1);
      const hints = results.filter(x => !x.r.correct).map(x => x.r.message);
      expect(new Set(hints).size, e.id).toBe(hints.length);
      for (const h of hints) expect(h).not.toBe('Not quite.');
      expect(e.grade({}).message).toBe('Choose an answer first.');
    }
  });
  it('every numeric exercise rejects empty and junk input with the standard prompt, and never throws', () => {
    const junk = ['', ' ', 'abc', '1e3', '--1', '1,5', 'NaN', 'Infinity', '9'.repeat(400), '\u0000', '3/0'];
    for (const e of EXERCISES.filter(x => x.fields)) for (const j of junk) {
      const r = e.grade(Object.fromEntries(e.fields!.map(f => [f.id, j])));
      if (j === '9'.repeat(400)) expect(r.correct).toBe(false);
      else expect(r, `${e.id} ${JSON.stringify(j)}`).toEqual(NEED_NUMBERS);
    }
  });
});

describe('numeric exercises accept the independently computed answer and name the usual mistakes', () => {
  it('2ˣ against x²: n = 5 (k = 4 is a tie)', () => {
    expect(grade('exp-overtakes-square', { n: '5' }).correct).toBe(true);
    expect(wrong('exp-overtakes-square', { n: '4' })).toMatch(/EQUAL/);
    expect(wrong('exp-overtakes-square', { n: '3' })).toMatch(/9/);
    expect(wrong('exp-overtakes-square', { n: '1' })).toMatch(/EVERY/);
    // brute force: the claim really holds from 5 to 200 and fails at 4
    for (let k = 5; k <= 200; k++) expect(2n ** BigInt(k) > BigInt(k * k)).toBe(true);
    expect(2 ** 4 > 4 ** 2).toBe(false);
  });
  it('√((−7)²) = 7', () => {
    expect(grade('root-of-square', { result: '7' }).correct).toBe(true);
    expect(wrong('root-of-square', { result: '-7' })).toMatch(/non-negative/);
    expect(wrong('root-of-square', { result: '−7' })).toMatch(/non-negative/);
    expect(wrong('root-of-square', { result: '49' })).toMatch(/49 is the square/);
  });
  it('cos(5π/6) = −√3/2 ≈ −0.866, and the radians-versus-degrees mistake is named', () => {
    expect(grade('cosine-quadrant', { cos: '-0.866' }).correct).toBe(true);
    expect(grade('cosine-quadrant', { cos: '−0.8660' }).correct).toBe(true);
    expect(Math.cos(5 * Math.PI / 6)).toBeCloseTo(-0.8660254, 6);
    expect(wrong('cosine-quadrant', { cos: '0.866' })).toMatch(/sign/);
    expect(wrong('cosine-quadrant', { cos: '0.5' })).toMatch(/sin/);
    expect(wrong('cosine-quadrant', { cos: String(Math.cos(150)) })).toMatch(/RADIANS/);
  });
  it('asin(sin 2) = π − 2 ≈ 1.1416', () => {
    expect(Math.asin(Math.sin(2))).toBeCloseTo(Math.PI - 2, 12);
    expect(grade('arcsin-of-sin', { value: '1.1416' }).correct).toBe(true);
    expect(wrong('arcsin-of-sin', { value: '2' })).toMatch(/asin only answers/);
    expect(wrong('arcsin-of-sin', { value: '0.9093' })).toMatch(/sin 2 itself/);
    expect(wrong('arcsin-of-sin', { value: '1.14' })).toMatch(/Not yet/); // too coarse for four decimals
  });
  it('two angles in [0, 2π) have sine 1/2', () => {
    expect(grade('sine-solutions', { count: '2' }).correct).toBe(true);
    expect(wrong('sine-solutions', { count: '1' })).toMatch(/arcsin/);
    expect(wrong('sine-solutions', { count: '0' })).toMatch(/between −1 and 1/);
    expect(wrong('sine-solutions', { count: '4' })).toMatch(/Not yet/);
  });
  it('log₂ 1024 = 10 bits; ln 1024 and log₁₀ 1024 are named', () => {
    expect(grade('log-bits', { bits: '10' }).correct).toBe(true);
    expect(wrong('log-bits', { bits: '6.93' })).toMatch(/nats/);
    expect(wrong('log-bits', { bits: '3.01' })).toMatch(/base-10/);
    expect(wrong('log-bits', { bits: '512' })).toMatch(/halv/);
  });
  it('the zero of 2·ln(x − h) at x = 5 gives h = 4', () => {
    expect(grade('find-the-shift', { h: '4' }).correct).toBe(true);
    expect(wrong('find-the-shift', { h: '5' })).toMatch(/not the shift/);
    expect(wrong('find-the-shift', { h: '6' })).toMatch(/Sign slip/);
    expect(wrong('find-the-shift', { h: '2.5' })).toMatch(/stretch/);
  });
});

describe('choice exercises pick the right statement', () => {
  it('only ln(eˣ) = x holds for every real x', () => {
    expect(grade('inverse-domains', { choice: 'ln-exp' }).correct).toBe(true);
    expect(wrong('inverse-domains', { choice: 'sqrt-square' }) ).toMatch(/−3/);
    expect(wrong('inverse-domains', { choice: 'exp-ln' })).toMatch(/x > 0/);
  });
  it('math.exp(710.0) raises OverflowError (NumPy returns inf)', () => {
    expect(grade('exp-overflow', { choice: 'error' }).correct).toBe(true);
    expect(wrong('exp-overflow', { choice: 'inf' })).toMatch(/NumPy/);
    expect(Math.exp(710)).toBe(Infinity); // JavaScript follows the IEEE rule, like NumPy
  });
  it('softmax: the common factor e^(−m) cancels', () => {
    expect(grade('softmax-shift', { choice: 'cancel' }).correct).toBe(true);
    expect(wrong('softmax-shift', { choice: 'approx' })).toMatch(/exact identity/);
    // independent check of the claim: the stable and the naive softmax agree on scores that do not overflow
    const s = [1.5, -2, 0.25, 3];
    const m = Math.max(...s);
    const naive = s.map(v => Math.exp(v) / s.reduce((t, w) => t + Math.exp(w), 0));
    const stable = s.map(v => Math.exp(v - m) / s.reduce((t, w) => t + Math.exp(w - m), 0));
    stable.forEach((v, i) => expect(v).toBeCloseTo(naive[i]!, 14));
  });
});
