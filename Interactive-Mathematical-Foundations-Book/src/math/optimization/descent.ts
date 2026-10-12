/** Canonical state → pure transition → immutable evaluated trace. Failed transitions are never accepted steps. */
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { objectiveModel, regression, vectorFinite, type ObjectiveConfig, type Vector, type Evaluation } from './objectives';
import { ADAM_ZERO, adamTransition, momentumTransition, sampleBatch, type AdamState, type BatchMode, type Method } from './dynamics';

export interface DescentConfig extends ObjectiveConfig {
  readonly start: Vector; readonly eta: number; readonly iterations: number;
  readonly method?: Method; readonly beta?: number; readonly beta1?: number; readonly beta2?: number; readonly epsilon?: number;
  readonly batch?: BatchMode; readonly batchSize?: number; readonly seed?: number;
}
export interface Step {
  readonly k: number; readonly method: Method; readonly point: Vector; readonly loss: number; readonly gradient: Vector;
  readonly eta: number; readonly update: Vector; readonly next: Vector; readonly nextEvaluation: Evaluation;
  readonly momentum?: ReturnType<typeof momentumTransition>;
  readonly adam?: ReturnType<typeof adamTransition>;
  readonly batch?: { indices: readonly number[]; before: number; after: number; loss: number; fullGradient: Vector; examples: ReturnType<typeof regression>['examples'] };
}
export interface DescentTrace {
  readonly frames: readonly TraceFrame<Step>[]; readonly initial: Evaluation; readonly final: Vector; readonly reason: string;
  readonly failure: { readonly point: Vector; readonly gradient: Vector; readonly momentum?: Step['momentum']; readonly adam?: Step['adam'] } | null;
}
export function descentTrace(config: DescentConfig): DescentTrace {
  if (!vectorFinite(config.start) || !Number.isFinite(config.eta) || config.eta <= 0 || !Number.isInteger(config.iterations) || config.iterations < 1 || config.iterations > 40) throw new RangeError('Use a finite start, positive finite rate and 1–40 iterations.');
  const method = config.method ?? 'descent', beta = config.beta ?? .8, beta1 = config.beta1 ?? .9, beta2 = config.beta2 ?? .999, epsilon = config.epsilon ?? 1e-8;
  if (!['descent','momentum','stochastic','adam'].includes(method)) throw new RangeError('Unsupported optimizer.');
  if (method === 'stochastic' && config.objective !== 'regression') throw new RangeError('Sampled gradients belong to the fixed four-example regression objective.');
  if (method === 'momentum') momentumTransition([0,0],[0,0],config.eta,beta);
  if (method === 'adam') adamTransition(ADAM_ZERO,[0,0],config.eta,beta1,beta2,epsilon);
  if (method === 'stochastic') sampleBatch(config.seed ?? 42,config.batch ?? 'mini',config.batchSize ?? 2);
  const model = objectiveModel(config), initial = model.evaluate(config.start), states: {state: Step}[] = [];
  let point = config.start, velocity: Vector = [0,0], moments: AdamState = ADAM_ZERO, rng = config.seed ?? 42;
  let reason = 'iteration budget', failure: DescentTrace['failure'] = null;
  for (let k = 0; k < config.iterations; k++) {
    const e = model.evaluate(point);
    if (e.status !== 'finite' || e.loss === null || !e.gradient) { reason = e.reason; break; }
    if (method === 'descent' && e.gradient.every(g => g === 0)) { reason = 'zero gradient (not a global-optimality certificate)'; break; }
    let gradient = e.gradient, batch: Step['batch'];
    if (method === 'stochastic') {
      const selection = sampleBatch(rng,config.batch ?? 'mini',config.batchSize ?? 2), selected = regression(point,selection.indices);
      if (selected.evaluation.status !== 'finite' || !selected.evaluation.gradient || selected.evaluation.loss === null) { reason = selected.evaluation.reason; break; }
      gradient = selected.evaluation.gradient; rng = selection.after;
      batch = {...selection,examples:selected.examples,loss:selected.evaluation.loss,fullGradient:e.gradient};
    }
    let update: Vector = [-config.eta * gradient[0] + 0,-config.eta * gradient[1] + 0];
    let momentum: Step['momentum'], adam: Step['adam'];
    if (method === 'momentum') { momentum = momentumTransition(velocity,gradient,config.eta,beta); velocity = momentum.velocity; update = momentum.update; }
    if (method === 'adam') { adam = adamTransition(moments,gradient,config.eta,beta1,beta2,epsilon); moments = {time:adam.time,m:adam.m,v:adam.v}; update = adam.update; }
    if (momentum?.finite === false || adam?.finite === false || !vectorFinite(update)) {
      reason = 'non-finite optimizer state: transition rejected before accepting an update';
      failure = {point,gradient,...(momentum?{momentum}:{}),...(adam?{adam}:{})}; break;
    }
    const next: Vector = [point[0] + update[0],point[1] + update[1]], nextEvaluation = model.evaluate(next);
    states.push({state:{k,method,point,loss:e.loss,gradient,eta:config.eta,update,next,nextEvaluation,...(momentum?{momentum}:{}),...(adam?{adam}:{}),...(batch?{batch}:{})}});
    point = next;
    if (nextEvaluation.status !== 'finite') { reason = nextEvaluation.reason; break; }
    if (Math.hypot(...point) > 1e6) { reason = 'divergence boundary: parameter norm exceeded 1,000,000'; break; }
  }
  const summary = traceFrom([{state:{initial,final:point,reason,failure}}])[0]!.state;
  return Object.freeze({...summary,frames:traceFrom(states)});
}
