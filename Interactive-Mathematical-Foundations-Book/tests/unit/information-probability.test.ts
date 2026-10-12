import { describe,it,expect } from 'vitest';
import { rational as q } from '../../src/math/quantity/rational';
import { probabilityProduct, selfInformation, logProbability, decimalProbability, entropy, distribution } from '../../src/math/information-theory/probabilities';
describe('exact probability sources and approximate information',()=>{
  it('products equal log sums; underflow never changes exact support',()=>{
    const d=probabilityProduct({probabilities:[.5,.25,.8],repeat:1});expect(d.exact).toEqual(q(1n,10n));expect(d.logLikelihood).toBeCloseTo(-Math.log(10),14);
    const small=probabilityProduct({probabilities:[.5,.5,.5],repeat:400});expect(small.exact.num).toBe(1n);expect(small.direct).toBe(0);expect(small.logLikelihood).toBeCloseTo(-1200*Math.LN2,12);expect(small.status).toBe('underflow');
    const subnormal=probabilityProduct({probabilities:[.8,.8,.8],repeat:1200});expect(subnormal.direct).toBeGreaterThan(0);expect(subnormal.status).toBe('underflow');
    expect(probabilityProduct({probabilities:[0,.5],repeat:1}).status).toBe('impossible');
  });
  it('keeps mathematical boundaries explicit, including tiny exact probabilities',()=>{
    expect(selfInformation(q(1n,4n),'bits')).toBe(2);expect(selfInformation(q(1n))).toBe(0);expect(selfInformation(q(0n))).toBe(Infinity);expect(logProbability(q(0n))).toBe(-Infinity);
    expect(logProbability(q(1n,10n**400n))).toBeCloseTo(-400*Math.LN10,10);
    for(const p of [-.2,1.01,NaN,Infinity,.001])expect(()=>decimalProbability(p)).toThrow();
    for(const p of [q(-1n,2n),q(2n),{num:1n,den:0n}])expect(()=>selfInformation(p)).toThrow();
  });
  it('zero terms and entropy extrema use one exact normalized source',()=>{
    expect(entropy(distribution([1,0,0]),'bits').terms).toEqual([0,0,0]);
    expect(entropy(distribution([2,1,1]),'bits').terms).toEqual([.5,.5,.5]);
    expect(entropy(distribution([1,1,1,1]),'bits').value).toBe(2);
    for(let a=0;a<=10;a++)for(let b=0;b<=10;b++)if(a+b){const d=entropy(distribution([a,b]),'bits');expect(d.value).toBeGreaterThanOrEqual(0);expect(d.value).toBeLessThanOrEqual(1+2e-15);}
  });
  it('rejects malformed domains before doing arithmetic',()=>{
    for(const weights of [[],[0,0],[-1,2],[.5,1],[1,1,1,1,1,1,1]])expect(()=>distribution(weights)).toThrow();
    expect(()=>entropy([q(1n,2n)])).toThrow();expect(()=>entropy([q(1n)],'invalid' as never)).toThrow();
    for(const repeat of [0,1201,.5,NaN])expect(()=>probabilityProduct({probabilities:[.5],repeat})).toThrow();
  });
});
