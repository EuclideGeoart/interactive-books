import { describe, expect, it } from 'vitest';
import { DEFAULT_FORMAT } from '../../src/platform/numeric/format';
import { describeValue, type ExactForm, type Value } from '../../src/platform/numeric/quantity';

const sqrt13: ExactForm = { text: '√13', tex: '\\sqrt{13}', spoken: 'the square root of 13', integer: false, irrational: true };
const five: ExactForm = { text: '5', tex: '5', spoken: '5', integer: true, irrational: false };
const half: ExactForm = { text: '1/2', tex: '\\tfrac12', spoken: 'one half', integer: false, irrational: false };
const rad = { text: 'rad', tex: '\\mathrm{rad}', spoken: 'radians' };

describe('describeValue — exact versus approximate (plan §3.8, §3.9)', () => {
  it('exact irrational: an equality line, then an approximation line with an ellipsis', () => {
    const d = describeValue({ kind: 'exact', exact: sqrt13, approx: Math.sqrt(13) }, DEFAULT_FORMAT);
    expect(d.status).toBe('exact');
    expect(d.lines).toEqual([
      { relation: '=', text: '√13', tex: '\\sqrt{13}' },
      { relation: '≈', text: '3.605551…', tex: '3.605551\\ldots' },
    ]);
    expect(d.spoken).toBe('exactly the square root of 13, approximately 3.605551');
  });
  it('exact integer: a single equality, no approximation line', () => {
    const d = describeValue({ kind: 'exact', exact: five, approx: 5 }, DEFAULT_FORMAT);
    expect(d.lines).toEqual([{ relation: '=', text: '5', tex: '5' }]);
  });
  it('exact rational that is not an integer: approximation line has NO ellipsis (it is shown as ≈ of a terminating or repeating value)', () => {
    const d = describeValue({ kind: 'exact', exact: half, approx: 0.5 }, DEFAULT_FORMAT);
    expect(d.lines[1]).toEqual({ relation: '≈', text: '0.500000', tex: '0.500000' });
  });
  it('a computed value with no exact form is only ever "≈"', () => {
    const d = describeValue({ kind: 'numeric', value: 0.5880026035475675 }, DEFAULT_FORMAT, rad);
    expect(d.status).toBe('approximate');
    expect(d.lines).toEqual([{ relation: '≈', text: '0.588003 rad', tex: '0.588003\\,\\mathrm{rad}' }]);
    expect(d.spoken).toBe('approximately 0.588003 radians');
  });
  it('a chosen value is an equality', () => {
    expect(describeValue({ kind: 'given', value: 2.3 }, DEFAULT_FORMAT).lines).toEqual([{ relation: '=', text: '2.3', tex: '2.3' }]);
  });
  it('an undefined value says so and carries the reason; it never shows a number', () => {
    const d = describeValue({ kind: 'undefined', reason: 'The zero vector has no direction.' }, DEFAULT_FORMAT, rad);
    expect(d.status).toBe('undefined');
    expect(d.lines[0]?.text).toBe('undefined');
    expect(d.note).toBe('The zero vector has no direction.');
    expect(d.spoken).toContain('The zero vector has no direction.');
  });
  it('overflow / NaN is reported as not finite with a note', () => {
    const d = describeValue({ kind: 'numeric', value: Infinity }, DEFAULT_FORMAT);
    expect(d.status).toBe('not-finite');
    expect(d.note).toMatch(/not a finite number/i);
  });
  it('property: a rounded (numeric/approximation) line is never presented with "="', () => {
    const values: Value[] = [-3.5, 1e-9, 0.1 + 0.2, 123456.789, 2 / 3, Math.SQRT2].map(value => ({ kind: 'numeric', value }));
    values.push({ kind: 'exact', exact: sqrt13, approx: Math.sqrt(13) });
    for (const v of values) {
      const d = describeValue(v, DEFAULT_FORMAT);
      for (const line of d.lines.slice(v.kind === 'exact' ? 1 : 0)) expect(line.relation).toBe('≈');
    }
  });
});
