/** Python owns expectations: exact Fraction histories and independent Decimal radicals/affine recurrences. */
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {project,regularizedModel} from '../../src/math/optimization/constraints';
import {descentTrace} from '../../src/math/optimization/descent';
const f=JSON.parse(readFileSync('fixtures/optimization_constraints.fixtures.json','utf8'));
let worstEvaluation=0,worstTrace=0;
function check(actual:any,expected:any,ulps=f.policy.tolerance.traceUlps):void {
 if(Array.isArray(expected)){expect(actual).toHaveLength(expected.length);expected.forEach((v,i)=>check(actual[i],v,ulps));}
 else if(typeof expected==='number'){
  expect(Number.isFinite(actual)).toBe(true);
  if(expected===0)expect(actual+0).toBe(0);
  else{const scale=Number.EPSILON*2**Math.floor(Math.log2(Math.max(1,Math.abs(expected)))),err=Math.abs(actual-expected)/scale;if(ulps===f.policy.tolerance.evaluationUlps)worstEvaluation=Math.max(worstEvaluation,err);else worstTrace=Math.max(worstTrace,err);expect(err).toBeLessThanOrEqual(ulps);}
 }else expect(actual).toEqual(expected);
}
const reason=(s:string)=>s.includes('gradient-norm threshold')?'gradient-threshold':s.includes('zero gradient')?'zero-gradient':s.includes('optimizer state')?'non-finite-transition':s.includes('divergence boundary')?'divergence':s.includes('loss-change threshold')?'loss-change':s.includes('non-finite')?'non-finite-evaluation':'budget';
describe('Independent Optimization constraints/diagnostic fixtures',()=>{
 for(const [i,{config:c,expected:e}] of f.projections.entries())it(`projection ${i}`,()=>{const p=project(c.point,c.constraint);check(p.next,e.point,8);check(p.correction,e.correction,8);check(Math.hypot(...c.point),e.inputNorm,8);check(Math.hypot(...p.next),e.projectedNorm,8);expect(p.changed).toBe(e.changed);});
 for(const [i,{config:c,expected:e}] of f.penalties.evaluations.entries())it(`penalized evaluation ${i}`,()=>{const p=regularizedModel(c,c.lambda).evaluate(c.point);expect(p.status).toBe(e.status);check(p.loss,e.loss,8);check(p.gradient,e.gradient,8);check(p.hessian,e.hessian,8);if(e.status==='finite'){check(p.baseLoss??p.loss,e.baseLoss,8);check(p.penalty??0,e.penaltyLoss,8);}});
 for(const [i,{config:c,expected:e}] of f.penalties.minimizers.entries())it(`independently completed-square minimum ${i}`,()=>{
  const p=regularizedModel({...c,objective:'quadratic'},c.lambda).evaluate(e.point);check(p.loss,e.loss,8);check(p.hessian,e.hessian,8);expect(p.gradient).not.toBeNull();
  // Exported rational minimizer coordinates are rounded; stationarity at that binary64 point has an absolute roundoff bound.
  for(const axis of [0,1] as const)expect(Math.abs(p.gradient![axis]-e.gradient[axis])).toBeLessThanOrEqual(8*Number.EPSILON*Math.max(1,Math.abs(e.gradient[axis]),c.a,2*c.lambda));
  const projected=project(e.unconstrainedPoint,c.constraint);check(projected.next,e.point,8);expect(e.normalMultiplier).toBeGreaterThanOrEqual(0);
 });
 for(const [i,{config:c,expected:e}] of f.traces.entries())it(`projected/clipped/stopped trace ${i}`,()=>{
  if(c.iterations===0){expect(()=>descentTrace(c)).toThrow();return;}
  const run=descentTrace(c);
  const actualReason=run.initial.status==='non-finite'?'non-finite-initial':reason(run.reason);expect(actualReason).toBe(e.reason);expect(run.frames).toHaveLength(e.acceptedSteps);
  check(run.start,e.initial.point);check(run.initial.loss,e.initial.evaluation.loss);check(run.initial.gradient,e.initial.evaluation.gradient);check(run.final,e.final.point);check(run.finalEvaluation.loss,e.final.evaluation.loss);check(run.stopGradientNorm,e.final.rawNorm);
  for(const [j,frame] of run.frames.entries()){
   const s=frame.state,r=e.steps[j];expect(r.accepted).toBe(true);expect(s.k).toBe(r.k);check(s.point,r.currentPoint);check(s.loss,r.currentLoss);check(s.gradient,r.rawGradient);check(s.gradientNorm,r.rawNorm);check(s.clipping?.applied??s.gradient,r.appliedGradient);check(s.clipping?.scale??1,r.clipScale);check(s.update,r.proposedUpdate);check(s.projection?.proposed??s.next,r.proposal);check(s.projection?.correction??[0,0],r.projectionCorrection);check(s.next,r.nextPoint);check(s.nextEvaluation.loss,r.nextLoss);check(s.lossChange??null,r.lossChange);
   if(s.projection)expect(c.constraint==='box'?s.next.every(v=>Math.abs(v)<=1):Math.hypot(...s.next)<=1+8*Number.EPSILON).toBe(true);
  }
  if(e.reason==='non-finite-transition'){expect(run.failure).not.toBeNull();check(run.failure!.point,e.steps.at(-1).currentPoint);check(run.failure!.gradient,e.steps.at(-1).rawGradient);}
  if(e.exactHistory){const number=(text:string)=>{const [n,d='1']=text.split('/');return Number(n)/Number(d);};for(const h of e.exactHistory){const point=h.k===0?run.start:run.frames[h.k-1]!.state.next;check(point,h.point.map(number));}}
 });
 it('reports unchanged scaled-ulp bounds',()=>{console.info(`Constraints evaluation worst ${worstEvaluation} scaled ulps / 8; trajectory worst ${worstTrace} / 128.`);expect(worstEvaluation).toBeLessThanOrEqual(8);expect(worstTrace).toBeLessThanOrEqual(128);});
});
