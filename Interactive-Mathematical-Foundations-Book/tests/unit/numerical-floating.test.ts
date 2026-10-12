import { describe,it,expect } from 'vitest';
import { FORMATS,parseExact,encode,decode,representation,roundedSum,neighbor,pow2,exactBinary64,asBinary64 } from '../../src/math/numerical-computing/floating';
import { add,sub,mul,int,div,cmp } from '../../src/math/quantity/rational';
import {conditioning,cancellation,sqrtBounds} from '../../src/math/numerical-computing/error';
describe('direct exact format rounding',()=>{
 for(const id of Object.keys(FORMATS) as (keyof typeof FORMATS)[])it(`${id}: ties, boundary carries, signed zeros, gradual underflow, overflow and specials`,()=>{
  const f=FORMATS[id],q=(r:any)=>decode(encode({kind:'finite',value:r,negativeZero:false},id),id);
  expect(q(add(int(1),pow2(-f.fraction-1))).exact).toEqual(int(1));
  expect(q(add(int(1),mul(int(3),pow2(-f.fraction-1)))).exact).toEqual(add(int(1),pow2(1-f.fraction)));
  const tiny=pow2(1-f.bias-f.fraction),normal=pow2(1-f.bias);
  expect(q(div(tiny,int(2))).kind).toBe('zero');expect(q(mul(tiny,div(int(3),int(2)))).exact).toEqual(mul(int(2),tiny));
  expect(q(sub(normal,div(tiny,int(2)))).exact).toEqual(normal);
  expect(q(sub(normal,tiny)).kind).toBe('subnormal');
  const threshold=sub(pow2(f.bias+1),pow2(f.bias-f.fraction-1));expect(q(threshold).kind).toBe('infinity');expect(q(sub(threshold,div(tiny,int(2)))).kind).toBe('normal');
  const minus=decode(encode(parseExact('-0'),id),id);expect(minus.sign).toBe(1);expect(Object.is(minus.value,-0)).toBe(true);
  expect(decode(encode(parseExact('NaN'),id),id).kind).toBe('nan');expect(decode(encode(parseExact('-Infinity'),id),id).sign).toBe(1);
  expect(neighbor(minus.bits,id,1)!.exact).toEqual(tiny);
 });
 it('direct FP16 avoids a deliberately constructed binary64 double-rounding trap',()=>{
  const x=parseExact('1.000488281250000000000000000001');expect(decode(encode(x,'fp16'),'fp16').value).toBe(1.0009765625);
  expect(decode(encode(parseExact(String(Number('1.000488281250000000000000000001'))),'fp16'),'fp16').value).toBe(1);
 });
 it('binary64 round trips every bounded native value, including the least subnormal',()=>{
  for(const x of [0,Number.MIN_VALUE,1e-300,1e-10,.1,.2,1,1e20,Number.MAX_VALUE,-3.5])expect(asBinary64(exactBinary64(x))).toBe(x);
  expect(representation('0.1','binary64').stored.exact).toEqual({num:3602879701896397n,den:36028797018963968n});
  expect(roundedSum('.1','.2','binary64').stored.value).toBe(.1+.2);
 });
 it('bounds allocation and invalid input at the boundary',()=>{for(const x of ['','1e401','1e99999','x','1'.repeat(421)])expect(()=>parseExact(x)).toThrow();});
});
describe('conditioning and cancellation references',()=>{
 it('exact perturbations reveal problem conditioning, separately from algorithm error',()=>{const good=conditioning('2','.01','square');expect(good.condition).toEqual(int(2));expect(good.change).toEqual({num:401n,den:10000n});const bad=conditioning('1.000001','.000001','reciprocal');expect(bad.base).toEqual(int(1000000));expect(bad.changed).toEqual(int(500000));expect(bad.condition).toEqual(int(1000001));expect(conditioning('1','0','reciprocal').base).toBeNull();});
 it('integer radical enclosure contains literal roots and cancellation keeps meaningful digits',()=>{expect(sqrtBounds(int(4))).toEqual([int(2),int(2)]);for(const x of ['0','1','1e16','1e100','1e300']){const c=cancellation(x);expect(c.stable).toBeGreaterThan(0);expect(cmp(c.lower,c.upper)).toBeLessThanOrEqual(0);if(x==='1e16')expect(c.naive).toBe(0);expect(Math.abs(c.stable-c.reference)/c.reference).toBeLessThan(8*Number.EPSILON);}expect(()=>cancellation('-1')).toThrow();});
});
it('all FP16/BF16 finite encodings round-trip exactly, including signed zeros',()=>{
 for(const id of ['fp16','bf16'] as const)for(let bits=0n;bits<65536n;bits++){
  const v=decode(bits,id);if(v.exact!==null){const roundtrip=encode({kind:'finite',value:v.exact,negativeZero:v.kind==='zero'&&v.sign===1},id);if(roundtrip!==bits)throw new Error(`${id} ${bits}: ${roundtrip}`);}
 }
});
