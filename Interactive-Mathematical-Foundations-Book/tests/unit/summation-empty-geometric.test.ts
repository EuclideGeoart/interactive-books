/**
 * M5-P1: an empty geometric sum is 0 whatever the formula's r^m and r^(n+1) would be, and the zero-exponent convention is the
 * same in the model, the lesson and the Python text. The expected values are written by hand and re-derived with an independent loop.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { form, pow, q } from '../../src/math/summation/rational';
import { DEFAULT_PARAMS, closedForm, term } from '../../src/math/summation/sequences';
import { deriveSumLesson, loopCode, sumFormulas, sumRows, sumSpoken, sumVerdict, type SumLessonState } from '../../src/lessons/summation/sum-lesson';

const geo = (r: number, m: number, n: number): SumLessonState => ({ seq: 'geometric', m, n, r, list: '1' });

describe('empty geometric sums are 0, with no exception', () => {
  for (const [m, n] of [[5, -5], [0, -2], [5, 4], [-1, -2], [-3, -5]] as const) {
    it(`r = 0, m = ${m}, n = ${n}: no terms, the sum is 0, the formula is not claimed`, () => {
      const v = deriveSumLesson(geo(0, m, n));
      expect(v.d.empty).toBe(true);
      expect(v.d.failure).toBeNull();
      expect(form(v.d.total!).text).toBe('0');
      // n = m − 1 with m ≥ 0 is a valid use of the formula ((0^5 − 0^5)/1 = 0); every other empty case here makes no claim
      const valid = n === m - 1 && m >= 0;
      expect(v.d.closed?.applies ?? false).toBe(valid);
      expect(v.d.closedMatches).toBe(valid ? true : null);
      expect(v.frames).toHaveLength(1);
      expect(sumFormulas(v).map(f => f.id)).toEqual(['expansion']); // an empty sum shows only the convention, never a closed form
      expect(sumFormulas(v)[0]!.tex).toContain('empty sum');
      expect(sumVerdict(v).text).toMatch(/empty sum/);
      expect(sumVerdict(v).caution).toBe(false);
      expect(sumSpoken(v)).toMatch(/empty sum, 0/);
      expect(() => sumRows(v)).not.toThrow();
      expect(loopCode(v)).toContain(`for i in range(${m}, ${n} + 1):`);
    });
  }
  it('every ratio and every empty bound pair: closedForm never throws and the total is 0', () => {
    for (const r of [-2, -0.5, 0, 0.5, 1, 3]) for (let m = -5; m <= 20; m++) for (let n = -5; n < m; n++) {
      const v = deriveSumLesson(geo(r, m, n));
      expect(form(v.d.total!).text, `r=${r} ${m}..${n}`).toBe('0');
    }
  });
});

describe('zero-exponent convention for geometric sequences: r^0 = 1, including r = 0', () => {
  it('r = 0, m = 0, n = 0: the single term 0^0 is the empty product 1', () => {
    const v = deriveSumLesson(geo(0, 0, 0));
    expect(form(v.d.total!).text).toBe('1');
    expect(v.d.closed!.applies).toBe(true);
    expect(form(v.d.closed!.value).text).toBe('1'); // (0^0 − 0^1)/(1 − 0)
    expect(v.d.closedMatches).toBe(true);
    expect(loopCode(v)).toContain('acc += r ** i'); // Python: Fraction(0) ** 0 == 1, the same convention
  });
  it('r = 0, m = 0, n = 3: 1 + 0 + 0 + 0, and the closed form agrees', () => {
    const v = deriveSumLesson(geo(0, 0, 3));
    expect(form(v.d.total!).text).toBe('1');
    expect(v.d.closedMatches).toBe(true);
  });
  it('the model power function uses r^0 = 1 for every base', () => {
    expect(pow(q(0), 0)).toEqual(q(1));
    expect(term('geometric', DEFAULT_PARAMS, 0)).toMatchObject({ ok: true });
  });
});

describe('a non-empty sum with an actual term 0^(negative) is undefined', () => {
  it('r = 0, m = −1, n = 2', () => {
    const v = deriveSumLesson(geo(0, -1, 2));
    expect(v.d.empty).toBe(false);
    expect(v.d.total).toBeNull();
    expect(v.d.failure).toMatchObject({ i: -1, pythonError: 'ZeroDivisionError' });
    expect(v.d.closed).toBeNull(); // no closed form claimed
    expect(sumFormulas(v).map(f => f.id)).toEqual(['expansion']);
    expect(sumVerdict(v).caution).toBe(true);
    expect(sumVerdict(v).text).toMatch(/undefined/);
  });
  it('closedForm for r = 0, m < 0 and a real term is null', () => {
    expect(closedForm('geometric', { ...DEFAULT_PARAMS, r: q(0) }, -1, 2)).toBeNull();
  });
});

describe('the zero-exponent policy is stated consistently across I.1 and I.8', () => {
  const read = (f: string) => readFileSync(`src/content/chapters/${f}.mdx`, 'utf8');
  it('I.1 leaves 0^0 undefined for ordinary powers and points to the one stated exception', () => {
    const t = read('quantities');
    expect(t).toMatch(/leaves \$0\^\{0\}\$ and every negative power of \$0\$ \*undefined\*/);
    expect(t).toMatch(/geometric sum/);
    expect(t).toMatch(/Chapter I\.8/);
  });
  it('I.8 states r^0 = 1 for geometric sums, names I.1, keeps 0^(negative) undefined and says an empty sum is 0', () => {
    const t = read('summation');
    expect(t).toMatch(/read it as \$1\$ for every \$r\$, including \$r=0\$/);
    expect(t).toMatch(/Chapter I\.1 leaves \$0\^\{0\}\$ undefined/);
    expect(t).toMatch(/negative power of \$0\$ stays undefined/);
    expect(t).toMatch(/\*empty\* sum is different again/);
  });
});
