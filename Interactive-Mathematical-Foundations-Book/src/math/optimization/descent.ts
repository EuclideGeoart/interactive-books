/** Pure evaluated transitions; immutable history uses the accepted semantic snapshot primitive. */
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { objectiveModel, vectorFinite, type ObjectiveConfig, type Vector, type Evaluation } from './objectives';
export interface DescentConfig extends ObjectiveConfig { readonly start: Vector; readonly eta: number; readonly iterations: number }
export interface Step {
  readonly k: number; readonly point: Vector; readonly loss: number; readonly gradient: Vector;
  readonly eta: number; readonly update: Vector; readonly next: Vector; readonly nextEvaluation: Evaluation;
}
export interface DescentTrace { readonly frames: readonly TraceFrame<Step>[]; readonly initial: Evaluation; readonly final: Vector; readonly reason: string }
export function descentTrace(config: DescentConfig): DescentTrace {
  if (!vectorFinite(config.start) || !Number.isFinite(config.eta) || config.eta <= 0 || !Number.isInteger(config.iterations) || config.iterations < 1 || config.iterations > 40) throw new RangeError('Use a finite start, positive finite rate and 1–40 iterations.');
  const model = objectiveModel(config), initial = model.evaluate(config.start), states: {state: Step}[] = [];
  let point = config.start, reason = 'iteration budget';
  for(let k=0;k<config.iterations;k++) {
    const e = model.evaluate(point);
    if (e.status !== 'finite' || e.loss === null || !e.gradient) { reason = e.reason; break; }
    if (e.gradient.every(g => g === 0)) { reason = 'zero gradient (not a global-optimality certificate)'; break; }
    const update: Vector = [-config.eta*e.gradient[0]+0,-config.eta*e.gradient[1]+0], next: Vector = [point[0]+update[0],point[1]+update[1]], nextEvaluation = model.evaluate(next);
    states.push({state:{k,point,loss:e.loss,gradient:e.gradient,eta:config.eta,update,next,nextEvaluation}});
    point = next;
    if(nextEvaluation.status !== 'finite') { reason=nextEvaluation.reason;break; }
    if(Math.hypot(...point)>1e6) { reason='divergence boundary: parameter norm exceeded 1,000,000';break; }
  }
  const summary=traceFrom([{state:{initial,final:point,reason}}])[0]!.state;
  return Object.freeze({...summary,frames:traceFrom(states)});
}
