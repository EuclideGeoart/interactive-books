import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {encode,decode,fractionText,type FormatId} from '../../src/math/numerical-computing/floating';
import {rational,cmp} from '../../src/math/quantity/rational';
import {cancellation,conditioning} from '../../src/math/numerical-computing/error';
const f=JSON.parse(readFileSync('fixtures/numerical_floating.fixtures.json','utf8'));
for(const [i,c]of f.rounding.entries())it(`independent ordered-bit search ${i}`,()=>{
 const bits=encode({kind:'finite',value:rational(BigInt(c.num),BigInt(c.den)),negativeZero:c.negativeZero},c.format as FormatId),v=decode(bits,c.format);
 expect(String(bits)).toBe(c.expected.bits);expect(v.kind).toBe(c.expected.kind);expect(v.sign).toBe(c.expected.sign);expect(v.exact===null?null:fractionText(v.exact)).toBe(c.expected.exact);
});
for(const c of f.radicals)it(`Decimal450 cancellation enclosure ${c.text}`,()=>{const m=cancellation(c.text),ref=rational(BigInt(c.num),BigInt(c.den));expect(cmp(m.lower,ref)).toBeLessThanOrEqual(0);expect(cmp(m.upper,ref)).toBeGreaterThanOrEqual(0);expect(Math.abs(m.reference-Number(c.reference))).toBeLessThanOrEqual(f.policy.binary64Ulps*Number.EPSILON*Math.abs(Number(c.reference)));});
for(const c of f.sensitivity)it(`Fraction sensitivity ${c.text} ${c.kind}`,()=>{const m=conditioning(c.text,c.delta,c.kind);expect(m.base===null?null:fractionText(m.base)).toBe(c.base);expect(m.changed===null?null:fractionText(m.changed)).toBe(c.changed);});
