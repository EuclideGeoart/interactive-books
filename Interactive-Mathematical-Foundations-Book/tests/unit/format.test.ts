import { describe, expect, it } from 'vitest';
import { DEFAULT_FORMAT, MINUS, formatApprox, formatGiven } from '../../src/platform/numeric/format';

describe('formatApprox — computed values', () => {
  it('uses fixed decimals and the plan example 3.605551', () => {
    expect(formatApprox(3.605551275463989).text).toBe('3.605551');
    expect(formatApprox(0.5880026035475675).text).toBe('0.588003');
  });
  it('uses U+2212 for the minus sign in text, ASCII "-" in LaTeX, and the word "minus" when spoken', () => {
    const f = formatApprox(-3.605551275463989);
    expect(f.text).toBe(`${MINUS}3.605551`);
    expect(f.text).not.toContain('-');
    expect(f.tex).toBe('-3.605551');
    expect(f.spoken).toBe('minus 3.605551');
  });
  it('never shows negative zero', () => {
    for (const z of [0, -0]) {
      expect(formatApprox(z).text).toBe('0');
      expect(formatGiven(z).text).toBe('0');
    }
  });
  it('prints integers without a decimal point', () => {
    expect(formatApprox(5).text).toBe('5');
    expect(formatApprox(-2).text).toBe(`${MINUS}2`);
  });
  it('switches to scientific notation instead of showing a non-zero value as zero', () => {
    expect(formatApprox(4e-7).text).toBe('4×10⁻⁷');
    expect(formatApprox(-1.5e-9).text).toBe(`${MINUS}1.5×10⁻⁹`);
    expect(formatApprox(1.5e-7).tex).toBe('1.5\\times 10^{-7}');
    expect(formatApprox(4e-7).text).not.toMatch(/^0/);
  });
  it('switches to scientific notation at the configured magnitude', () => {
    expect(formatApprox(1234567).text).toBe('1.23457×10⁶');
    expect(formatApprox(999999.5, { digits: 2, scientificAbove: 1e6 }).text).toBe('999999.50');
    expect(formatApprox(123456, { digits: 3, scientificAbove: 1e5 }).text).toBe('1.23×10⁵');
  });
  it('reports NaN and infinities as such, never as numbers', () => {
    expect(formatApprox(NaN)).toMatchObject({ text: 'NaN', finite: false, spoken: 'not a number' });
    expect(formatApprox(Infinity)).toMatchObject({ text: '∞', finite: false });
    expect(formatApprox(-Infinity)).toMatchObject({ text: `${MINUS}∞`, finite: false });
  });
  it('respects the digits setting', () => {
    expect(formatApprox(Math.PI, { ...DEFAULT_FORMAT, digits: 3 }).text).toBe('3.142');
  });
});

describe('formatGiven — values the learner chose', () => {
  it('prints the shortest faithful decimal, hiding binary representation noise', () => {
    expect(formatGiven(2.3).text).toBe('2.3');
    expect(formatGiven(0.1 + 0.2).text).toBe('0.3');
    expect(formatGiven(-4).text).toBe(`${MINUS}4`);
  });
  it('uses scientific notation outside a sensible range', () => {
    expect(formatGiven(1e-7).text).toBe('1×10⁻⁷');
    expect(formatGiven(123456789012345).text).toBe('1.23456789012×10¹⁴');
  });
});
