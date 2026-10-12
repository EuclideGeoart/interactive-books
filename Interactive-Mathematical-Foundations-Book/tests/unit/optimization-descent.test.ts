import { describe,it,expect } from 'vitest';
import { descentTrace } from '../../src/math/optimization/descent';
const c={objective:'quadratic' as const,a:1,center:0,start:[2,1] as const,eta:.25,iterations:12};
describe('Evaluated immutable gradient descent',()=>{
 it('matches two literal hand-worked steps',()=>{const t=descentTrace(c);expect(t.frames[0]!.state).toMatchObject({k:0,point:[2,1],loss:4,gradient:[2,4],eta:.25,update:[-.5,-1],next:[1.5,0],nextEvaluation:{loss:1.125}});expect(t.frames[1]!.state).toMatchObject({point:[1.5,0],loss:1.125,gradient:[1.5,0],update:[-.375,0],next:[1.125,0],nextEvaluation:{loss:.6328125}});});
 it('retains independent frozen history and is reproducible',()=>{const start:[number,number]=[2,1],t=descentTrace({...c,start});start[0]=9;expect(t.frames[0]!.state.point[0]).toBe(2);expect(Object.isFrozen(t.frames[0]!.state.point)).toBe(true);expect(()=>{Object.defineProperty(t.frames[0]!.state.next,'0',{value:7});}).toThrow();expect(t).toEqual(descentTrace(c));});
 it('detects invalid domains and nondifferentiability before constructing an update',()=>{for(const objective of ['absolute','log'] as const){const t=descentTrace({...c,objective,start:[0,0]});expect(t.frames).toHaveLength(0);expect(t.reason).toMatch(/undefined|requires/);}});
 it('records genuine uphill updates and stops at the numerical divergence boundary',()=>{const t=descentTrace({...c,eta:2});expect(t.frames[0]!.state.nextEvaluation.loss!).toBeGreaterThan(t.frames[0]!.state.loss);expect(t.reason).toContain('divergence');});
 it('stationary saddles stop without an optimality certificate',()=>{const t=descentTrace({...c,objective:'saddle',start:[0,0]});expect(t.frames).toHaveLength(0);expect(t.reason).toContain('not a global');});
 it('rejects an invalid optimizer configuration',()=>{for(const eta of [0,-1,NaN,Infinity])expect(()=>descentTrace({...c,eta})).toThrow();for(const iterations of [0,41,1.5])expect(()=>descentTrace({...c,iterations})).toThrow();expect(()=>descentTrace({...c,start:[NaN,0]})).toThrow();});
});
