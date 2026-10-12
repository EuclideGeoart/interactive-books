import {it,expect} from 'vitest';
import {rational as q} from '../../src/math/quantity/rational';
import {distribution} from '../../src/math/information-theory/probabilities';
import {compareDistributions,oneHot} from '../../src/math/information-theory/comparison';
it('one-hot NLL, zero source terms and mismatched support are explicit',()=>{
  expect(compareDistributions(oneHot(3,1),distribution([2,1,1]),'bits').cross).toBe(2);
  expect(compareDistributions(distribution([1,0]),distribution([1,0])).klTerms).toEqual([0,0]);
  expect(compareDistributions(distribution([1,0]),distribution([0,1])).cross).toBe(Infinity);
  for(const [p,r] of [[[],[]],[[q(1n,2n)],[q(1n)]],[[q(-1n),q(2n)],[q(1n),q(0n)]],[[q(1n)],[q(1n),q(0n)]]] as const)expect(()=>compareDistributions(p,r)).toThrow();
  for(const i of [-1,.5,3,NaN])expect(()=>oneHot(3,i)).toThrow();
});
it('KL equality, signed terms, asymmetry and CE−H identity',()=>{
  const p=distribution([2,1,1]),q=distribution([1,2,1]),d=compareDistributions(p,q,'bits');expect(d.entropy).toBe(1.5);expect(d.cross).toBe(1.75);expect(d.klTerms).toEqual([.5,-.25,0]);expect(d.kl).toBe(.25);expect(d.identityResidual).toBe(0);
  expect(compareDistributions(p,p).kl).toBe(0);
  const unequal=distribution([1,1,6]);expect(compareDistributions(p,unequal).kl).not.toBeCloseTo(compareDistributions(unequal,p).kl,6);
  expect(compareDistributions(distribution([1,0]),distribution([1,1]),'bits').kl).toBe(1);
  expect(compareDistributions(distribution([1,1]),distribution([1,0]),'bits').kl).toBe(Infinity);
  const a=distribution([1,9]),b=distribution([2,8]),c=distribution([3,7]);expect(compareDistributions(a,c).kl).toBeGreaterThan(compareDistributions(a,b).kl+compareDistributions(b,c).kl);
});
it('non-negativity and identity hold across deterministic independent normalized examples',()=>{
  for(let a=0;a<=20;a++)for(let b=1;b<=20;b++){const p=distribution([a,20-a]),q=distribution([b,21-b]),d=compareDistributions(p,q);expect(d.kl).toBeGreaterThanOrEqual(-2e-12);expect(Math.abs(d.identityResidual!)).toBeLessThanOrEqual(2e-12);}
});
