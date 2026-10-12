/** Canonical state → pure transition → immutable evaluated trace. Failed transitions are never accepted steps. */
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { regression, vectorFinite, type ObjectiveConfig, type Vector, type Evaluation } from './objectives';
import { project, regularizedModel, clipGradient, type Constraint } from './constraints';
import { ADAM_ZERO, adamTransition, momentumTransition, sampleBatch, type AdamState, type BatchMode, type Method } from './dynamics';

export interface DescentConfig extends ObjectiveConfig {
  readonly start: Vector; readonly eta: number; readonly iterations: number;
  readonly method?: Method; readonly beta?: number; readonly beta1?: number; readonly beta2?: number; readonly epsilon?: number;
  readonly constraint?: Constraint; readonly lambda?: number; readonly gradientTolerance?: number; readonly lossTolerance?: number; readonly clip?: number; readonly divergenceLimit?: number;
  readonly batch?: BatchMode; readonly batchSize?: number; readonly seed?: number;
}
export interface Step {
  readonly k: number; readonly method: Method; readonly point: Vector; readonly loss: number; readonly gradient: Vector;
  readonly gradientNorm: number|null; readonly eta: number; readonly update: Vector; readonly next: Vector; readonly nextEvaluation: Evaluation;
  readonly rawUpdate?:Vector; readonly rawProposal?:Vector; readonly actualDisplacement?:Vector;
  readonly projection?: ReturnType<typeof project>; readonly clipping?: ReturnType<typeof clipGradient>;
  readonly penalty?: {readonly lambda:number;readonly baseLoss:number;readonly value:number}; readonly lossChange?:number;
  readonly momentum?: ReturnType<typeof momentumTransition>;
  readonly adam?: ReturnType<typeof adamTransition>;
  readonly batch?: { indices: readonly number[]; before: number; after: number; loss: number; fullGradient: Vector; examples: ReturnType<typeof regression>['examples'] };
}
export interface DescentTrace {
  readonly frames: readonly TraceFrame<Step>[]; readonly initial: Evaluation; readonly final: Vector; readonly reason: string; readonly start: Vector; readonly initialProjection: ReturnType<typeof project> | null; readonly finalEvaluation: Evaluation; readonly stopGradientNorm: number|null; readonly lastLossChange: number|null;
  readonly failure: { readonly point: Vector; readonly gradient: Vector; readonly momentum?: Step['momentum']; readonly adam?: Step['adam']; readonly clipping?: Step['clipping'] } | null;
}
export function descentTrace(config: DescentConfig): DescentTrace {
  if (!vectorFinite(config.start) || !Number.isFinite(config.eta) || config.eta <= 0 || !Number.isInteger(config.iterations) || config.iterations < 1 || config.iterations > 40) throw new RangeError('Use a finite start, positive finite rate and 1–40 iterations.');
  const method = config.method ?? 'descent', beta = config.beta ?? .8, beta1 = config.beta1 ?? .9, beta2 = config.beta2 ?? .999, epsilon = config.epsilon ?? 1e-8;
  if (!['descent','momentum','stochastic','adam'].includes(method)) throw new RangeError('Unsupported optimizer.');
  if (method === 'stochastic' && config.objective !== 'regression') throw new RangeError('Sampled gradients belong to the fixed four-example regression objective.');
  if (method === 'momentum') momentumTransition([0,0],[0,0],config.eta,beta);
  if (method === 'adam') adamTransition(ADAM_ZERO,[0,0],config.eta,beta1,beta2,epsilon);
  if (method === 'stochastic') sampleBatch(config.seed ?? 42,config.batch ?? 'mini',config.batchSize ?? 2);
  const constraint=config.constraint??'none', lambda=config.lambda??0, gradientTolerance=config.gradientTolerance??0, lossTolerance=config.lossTolerance??0, clip=config.clip??0, divergenceLimit=config.divergenceLimit??1e6;
  if (![gradientTolerance,lossTolerance,clip].every(v=>Number.isFinite(v)&&v>=0) || !Number.isFinite(divergenceLimit) || divergenceLimit<=0) throw new RangeError('Tolerances/clipping must be nonnegative and finite; the divergence limit must be positive and finite.');
  if (method!=='descent' && (constraint!=='none'||clip>0||lambda>0)) throw new RangeError('This foundational projection, penalty and clipping explorer uses plain gradient descent.');
  const projected=project(config.start,constraint), start=projected.next, initialProjection=constraint==='none'?null:projected;
  const model = regularizedModel(config,lambda), initial = model.evaluate(start), states: {state: Step}[] = [];
  let point = start, velocity: Vector = [0,0], moments: AdamState = ADAM_ZERO, rng = config.seed ?? 42;
  let reason = 'iteration budget', failure: DescentTrace['failure'] = null;
  for (let k = 0; k < config.iterations; k++) {
    const e = model.evaluate(point);
    if (e.status !== 'finite' || e.loss === null || !e.gradient) { reason = e.reason; break; }
    if (gradientTolerance>0 && Math.hypot(...e.gradient)<=gradientTolerance) { reason='gradient-norm threshold (not a global-optimality certificate)'; break; }
    if (method === 'descent' && e.gradient.every(g => g === 0)) { reason = 'zero gradient (not a global-optimality certificate)'; break; }
    let gradient = e.gradient, batch: Step['batch'];
    if (method === 'stochastic') {
      const selection = sampleBatch(rng,config.batch ?? 'mini',config.batchSize ?? 2), selected = regression(point,selection.indices);
      if (selected.evaluation.status !== 'finite' || !selected.evaluation.gradient || selected.evaluation.loss === null) { reason = selected.evaluation.reason; break; }
      gradient = selected.evaluation.gradient; rng = selection.after;
      batch = {...selection,examples:selected.examples,loss:selected.evaluation.loss,fullGradient:e.gradient};
    }
    const clipping=clip>0?clipGradient(gradient,clip):undefined, applied=clipping?.applied??gradient;
    const rawUpdate:Vector|undefined=clipping?[-config.eta*gradient[0]+0,-config.eta*gradient[1]+0]:undefined;
    const rawProposal:Vector|undefined=rawUpdate?[point[0]+rawUpdate[0],point[1]+rawUpdate[1]]:undefined;
    let update: Vector = [-config.eta * applied[0] + 0,-config.eta * applied[1] + 0];
    let momentum: Step['momentum'], adam: Step['adam'];
    if (method === 'momentum') { momentum = momentumTransition(velocity,gradient,config.eta,beta); velocity = momentum.velocity; update = momentum.update; }
    if (method === 'adam') { adam = adamTransition(moments,gradient,config.eta,beta1,beta2,epsilon); moments = {time:adam.time,m:adam.m,v:adam.v}; update = adam.update; }
    if (clipping?.finite === false || momentum?.finite === false || adam?.finite === false || !vectorFinite(update)) {
      reason = 'non-finite optimizer state: transition rejected before accepting an update';
      failure = {point,gradient,...(clipping?{clipping}:{}),...(momentum?{momentum}:{}),...(adam?{adam}:{})}; break;
    }
    const proposed: Vector = [point[0] + update[0],point[1] + update[1]];
    // A non-finite proposal cannot be made finite by projecting it.
    const projection=constraint!=='none'&&vectorFinite(proposed)?project(proposed,constraint):undefined;
    const next=projection?.next??proposed, nextEvaluation = model.evaluate(next);
    const lossChange=nextEvaluation.loss===null?undefined:Math.abs(nextEvaluation.loss-e.loss);
    const penalty=e.lambda!==undefined&&e.baseLoss!==undefined&&e.penalty!==undefined?{lambda:e.lambda,baseLoss:e.baseLoss,value:e.penalty}:undefined;
    states.push({state:{k,method,point,loss:e.loss,gradient,gradientNorm:Number.isFinite(Math.hypot(...gradient))?Math.hypot(...gradient):null,eta:config.eta,update,next,nextEvaluation,...(projection?{projection,actualDisplacement:[next[0]-point[0]+0,next[1]-point[1]+0] as Vector}:{}),...(rawUpdate?{rawUpdate,rawProposal}:{}),...(clipping?{clipping}:{}),...(penalty?{penalty}:{}),...(lossChange!==undefined?{lossChange}:{}),...(momentum?{momentum}:{}),...(adam?{adam}:{}),...(batch?{batch}:{})}});
    point = next;
    if (nextEvaluation.status !== 'finite') { reason = nextEvaluation.reason; break; }
    if (Math.hypot(...point) > divergenceLimit) { reason = `divergence boundary: parameter norm exceeded ${divergenceLimit===1e6?'1,000,000':divergenceLimit}`; break; }
    if (lossTolerance>0 && lossChange!==undefined && lossChange<=lossTolerance) { reason='small loss-change threshold (a numerical stopping heuristic)'; break; }
  }
  const finalEvaluation=model.evaluate(point), finalNorm=finalEvaluation.gradient?Math.hypot(...finalEvaluation.gradient):NaN;
  const stopGradientNorm=Number.isFinite(finalNorm)?finalNorm:null, lastLossChange=states.at(-1)?.state.lossChange??null;
  const summary = traceFrom([{state:{initial,start,initialProjection,final:point,finalEvaluation,stopGradientNorm,lastLossChange,reason,failure}}])[0]!.state;
  return Object.freeze({...summary,frames:traceFrom(states)});
}
