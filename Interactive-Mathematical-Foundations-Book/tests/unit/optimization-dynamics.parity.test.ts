/** Python owns fixed-K reference recurrences. The bounded UI may stop earlier; every reference transition is still checked. */
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {descentTrace} from '../../src/math/optimization/descent';
import {evaluateObjective,regression,type Vector} from '../../src/math/optimization/objectives';
import {momentumTransition,adamTransition,ADAM_ZERO,type AdamState} from '../../src/math/optimization/dynamics';
const fixture=JSON.parse(readFileSync('fixtures/optimization_dynamics.fixtures.json','utf8'));
let worst=0;
function check(actual:any,expected:any):void {
 if(Array.isArray(expected)){expect(actual).toHaveLength(expected.length);expected.forEach((v,i)=>check(actual[i],v));}
 else if(typeof expected==='number'){
  if(expected===0)expect(actual+0).toBe(0);
  else {const ulp=Number.EPSILON*2**Math.floor(Math.log2(Math.max(1,Math.abs(expected))));const err=Math.abs(actual-expected)/ulp;worst=Math.max(worst,err);expect(err).toBeLessThanOrEqual(fixture.policy.tolerance.ulps);}
 } else expect(actual).toEqual(expected);
}
const config=(c:any)=>({objective:'quadratic' as const,a:c.a??1,center:c.center??0,start:c.start as Vector,eta:c.eta,iterations:c.K});
describe('Independent Optimization dynamics fixtures',()=>{
 for(const [section,cases] of Object.entries(fixture).filter(([k])=>['stability','momentum','batches'].includes(k)))
  for(const [i,{config:c,expected}] of (cases as any[]).entries())it(`${section} reference ${i}`,()=>{
   const runtime={...config(c),...(section==='momentum'?{method:'momentum' as const,beta:c.beta}:{}),...(section==='batches'?{objective:'regression' as const,method:'stochastic' as const,batch:c.mode,batchSize:c.batchSize,seed:c.seed}: {})};
   if(c.K===0){expect(()=>descentTrace(runtime)).toThrow();return;}
   const run=descentTrace(runtime);
   for(const e of expected) {
    if(e.status!=='finite') {
     expect(run.reason).toMatch(/non-finite|overflow|divergence/);continue;
    }
    if(section==='momentum') {
     const ev=evaluateObjective(runtime,e.theta),m=momentumTransition(e.velocity,ev.gradient!,c.eta,c.beta);
     check(ev.loss,e.loss);check(ev.gradient,e.gradient);check(m.velocity,e.nextVelocity);check(m.update,e.update);
    } else {
     const step=descentTrace({...runtime,start:e.theta,iterations:1,...(section==='batches'?{seed:e.rngBefore}:{})}).frames[0]?.state;
     if(!step){expect(section).toBe('stability');check(e.gradient,[0,0]);check(e.update,[0,0]);check(e.nextTheta,e.theta);continue;}
     check(step.point,e.theta);check(step.loss,e.loss);check(step.gradient,e.gradient);check(step.update,e.update);check(step.next,e.nextTheta);check(step.nextEvaluation.loss,e.nextLoss);
     if(section==='batches'){expect(step.batch!.before).toBe(e.rngBefore);expect(step.batch!.after).toBe(e.rngAfter);expect(step.batch!.indices).toEqual(e.indices);check(step.batch!.examples.map(x=>x.gradient),e.perExampleGradients);check(regression(e.theta).evaluation.loss,e.loss);}
    }
   }
   for(const [j,f] of run.frames.entries()) {
    const e=expected[j];if(e.status!=='finite')continue;
    check(f.state.point,e.theta);check(f.state.gradient,e.gradient);check(f.state.update,e.update);check(f.state.next,e.nextTheta);check(f.state.nextEvaluation.loss,e.nextLoss);
    if(section==='momentum'){check(f.state.momentum!.previous,e.velocity);check(f.state.momentum!.velocity,e.nextVelocity);}
   }
   if(run.frames.length<expected.length&&run.initial.status==='finite')expect(run.reason).toMatch(/zero gradient|divergence|non-finite/);
  });
 for(const [i,{config:c,expected}] of fixture.adam.entries())it(`Adam exact weighted-history reference ${i}`,()=>{
  if(c.K===0){expect(()=>descentTrace({...config(c),method:'adam'})).toThrow();return;}
  const local=c.source==='quadratic'&&c.b1===0&&c.b2===0;
  let previous:AdamState=ADAM_ZERO,theta:Vector=c.start;
  for(const e of expected) {
   if(local)theta=e.theta;
   const objective=evaluateObjective(config(c),theta),gradient:Vector=c.source==='sequence'?c.gradients[e.k]:objective.gradient!;
   if(objective.status!=='finite'&&c.source==='quadratic'){expect(e.status).toBe('non-finite');break;}
   const a=adamTransition(previous,gradient,c.eta,c.b1,c.b2,c.eps);
   expect(a.finite).toBe(e.status==='finite');if(!a.finite)break;
   check(theta,e.theta);check(gradient,e.gradient);expect(a.time).toBe(e.t);check(a.m,e.m1);check(a.v,e.m2);check(a.bias1,e.bias1);check(a.bias2,e.bias2);check(a.mhat,e.m1Hat);check(a.vhat,e.m2Hat);check(a.denominator,e.denominator);check(a.update,e.update);
   theta=[theta[0]+a.update[0],theta[1]+a.update[1]];check(theta,e.nextTheta);
   if(c.source==='quadratic'){check(objective.loss,e.loss);check(evaluateObjective(config(c),theta).loss,e.nextLoss);}
   previous={time:a.time,m:a.m,v:a.v};
  }
  if(c.source==='quadratic'){const run=descentTrace({...config(c),method:'adam',beta1:c.b1,beta2:c.b2,epsilon:c.eps});if(local) {
    const result=spawnSync('.venv/bin/python',['oracle/optimization_dynamics_oracle.py','--transitions'],{input:JSON.stringify(run.frames.map(f=>({config:c,state:f.state}))),encoding:'utf8'});
    expect(result.status,result.stderr).toBe(0);const transitions=JSON.parse(result.stdout);
    for(const [j,f] of run.frames.entries()){const e=transitions[j],a=f.state.adam!;check(f.state.point,e.point);check(f.state.loss,e.loss);check(f.state.gradient,e.gradient);check(a.m,e.m);check(a.v,e.v);check(a.mhat,e.mhat);check(a.vhat,e.vhat);check(a.denominator,e.denominator);check(f.state.update,e.update);check(f.state.next,e.next);}
   } else for(const [j,f] of run.frames.entries()){check(f.state.point,expected[j].theta);check(f.state.adam!.mhat,expected[j].m1Hat);check(f.state.next,expected[j].nextTheta);}}
 });
 it('reports worst observed scaled-ulp trajectory error',()=>{console.info(`Optimization dynamics worst observed error ${worst} scaled ulps; oracle allowance ${fixture.policy.tolerance.ulps}.`);expect(worst).toBeLessThanOrEqual(fixture.policy.tolerance.ulps);});
});
