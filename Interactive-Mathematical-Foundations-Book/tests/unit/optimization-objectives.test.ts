import { describe,it,expect } from 'vitest';
import { evaluateObjective, objectiveModel, stationaryPoints, convexity, chord, exactQuadraticStep, DATA, regression, type ObjectiveId } from '../../src/math/optimization/objectives';
import { int, rational } from '../../src/math/quantity/rational';
const c={objective:'quadratic' as const,a:1,center:0};
describe('Optimization objectives: literal calculations and independent derivative checks',()=>{
 it('evaluates the canonical loss, gradient and Hessian',()=>{expect(evaluateObjective(c,[2,1])).toMatchObject({status:'finite',loss:4,gradient:[2,4],hessian:[[1,0],[0,4]]});});
 it('changes shape through curvature and center without changing the meaning of parameters',()=>{expect(evaluateObjective({...c,a:2,center:1},[2,1])).toMatchObject({loss:3,gradient:[2,4],hessian:[[2,0],[0,4]]});});
 it('evaluates a finite large quadratic without overflowing its unweighted square',()=>{expect(evaluateObjective(c,[1.5e154,0])).toMatchObject({status:'finite',gradient:[1.5e154,0]});expect(evaluateObjective(c,[1.5e154,0]).loss!/1.125e308).toBeCloseTo(1,15);expect(evaluateObjective({...c,center:.25},[.25,0]).gradient).toEqual([0,0]);});
 it('keeps exact rational steps separate from binary64',()=>{const s=exactQuadraticStep([int(2),int(1)],rational(1n,4n));expect(s.gradient).toEqual([int(2),int(4)]);expect(s.update).toEqual([rational(-1n,2n),int(-1)]);expect(s.next).toEqual([rational(3n,2n),int(0)]);});
 it.each(['quadratic','well','cubic','ridge','saddle','flat','degenerate','absolute','log','regression'] as ObjectiveId[])('checks %s derivatives by centered differences',objective=>{
   const m=objectiveModel({...c,objective}),p=[1.25,.5] as const,e=m.evaluate(p),h=1e-5;
   for(let j=0;j<2;j++) {const a=[...p] as [number,number],b=[...p] as [number,number];a[j]!+=h;b[j]!-=h;const ea=m.evaluate(a),eb=m.evaluate(b);
     expect((ea.loss!-eb.loss!)/(2*h)).toBeCloseTo(e.gradient![j]!,7);
     for(let i=0;i<2;i++) expect((ea.gradient![i]!-eb.gradient![i]!)/(2*h)).toBeCloseTo(e.hessian![i]![j]!,6);
   }
 });
 it('reports a kink and domain violations without inventing a gradient',()=>{expect(evaluateObjective({...c,objective:'absolute'},[0,1])).toMatchObject({status:'finite',loss:1,gradient:null,hessian:null});expect(evaluateObjective({...c,objective:'log'},[0,1])).toMatchObject({status:'domain',loss:null});expect(evaluateObjective(c,[1e308,0]).status).toBe('non-finite');});
 it('distinguishes local minima, global minima, maxima and degenerate stationary points',()=>{expect(stationaryPoints({...c,objective:'well'}).map(p=>p.kind)).toEqual(['strict minimum','saddle','strict minimum']);expect(stationaryPoints({...c,objective:'cubic'})[1]!.global).toContain('not global');expect(stationaryPoints({...c,objective:'flat'})[0]!.global).toContain('Hessian test inconclusive');expect(stationaryPoints({...c,objective:'ridge'})[0]!.kind).toBe('strict maximum');expect(stationaryPoints({...c,objective:'degenerate'})[0]!.global).toContain('neither');});
 it('has correct positive and negative chord gaps',()=>{expect(chord(c,-2,2,.5)).toEqual({x:0,curve:0,height:2,gap:2});expect(chord({...c,objective:'well'},-1,1,.5)).toEqual({x:0,curve:1,height:0,gap:-1});expect(chord({...c,objective:'log'},-1,1,.5).gap).toBeNull();});
 it('uses whole-domain convexity, including nonsmooth and singular-Hessian cases',()=>{for(const objective of ['quadratic','flat','absolute','log','regression'] as ObjectiveId[])expect(convexity({...c,objective}).convex).toBe(true);for(const objective of ['well','cubic','ridge','saddle','degenerate'] as ObjectiveId[])expect(convexity({...c,objective}).convex).toBe(false);});
 it('rejects invalid boundary inputs',()=>{expect(()=>objectiveModel({...c,a:0})).toThrow();expect(()=>objectiveModel({...c,a:.333})).toThrow();expect(()=>chord(c,0,1,1.1)).toThrow();expect(()=>regression([0,0],[])).toThrow();expect(()=>regression([0,0],[4])).toThrow();expect(Object.isFrozen(DATA)).toBe(true);});
});
