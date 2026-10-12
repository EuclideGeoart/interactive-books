/** Fixed feasible sets and an explicit L2 objective change; neither is a hidden stability repair. */
import { normalizeNumeric } from '../linear-algebra/vectors';
import { objectiveModel, finiteEvaluation, vectorFinite, type ObjectiveConfig, type Vector, type Evaluation } from './objectives';

export type Constraint = 'none' | 'box' | 'disk';
export function project(point: Vector, constraint: Constraint) {
  if (point.length !== 2 || !vectorFinite(point) || !['none','box','disk'].includes(constraint)) throw new RangeError('Project a finite pair onto none, the fixed box, or the unit disk.');
  const norm = Math.hypot(...point);
  let next: Vector = point;
  if (constraint === 'box') next = [Math.max(-1,Math.min(1,point[0])),Math.max(-1,Math.min(1,point[1]))];
  if (constraint === 'disk' && norm > 1) { const unit = normalizeNumeric({x:point[0],y:point[1]})!; next = [unit.x,unit.y]; }
  const correction: Vector = [next[0]-point[0]+0,next[1]-point[1]+0], distance = Math.hypot(...correction);
  return { constraint, proposed:point, next, correction, distance:Number.isFinite(distance)?distance:null, changed:next.some((v,i)=>v!==point[i]) };
}
export interface PenalizedEvaluation extends Evaluation { readonly baseLoss?: number; readonly penalty?: number; readonly lambda?: number }
export function regularizedModel(config: ObjectiveConfig, lambda=0) {
  if (!Number.isFinite(lambda) || lambda < 0) throw new RangeError('L2 penalty strength must be nonnegative and finite.');
  const base = objectiveModel(config);
  return { evaluate(point:Vector):PenalizedEvaluation {
    const e=base.evaluate(point);
    if (lambda===0 || e.status!=='finite' || e.loss===null) return e;
    const penalty=lambda*point[0]*point[0]+lambda*point[1]*point[1];
    const gradient:Vector|null=e.gradient?[e.gradient[0]+2*lambda*point[0],e.gradient[1]+2*lambda*point[1]]:null;
    const hessian=e.hessian?[[e.hessian[0][0]+2*lambda,e.hessian[0][1]],[e.hessian[1][0],e.hessian[1][1]+2*lambda]] as const:null;
    return {...finiteEvaluation(e.loss+penalty,gradient,hessian,e.reason),baseLoss:e.loss,penalty:Number.isFinite(penalty)?penalty:undefined,lambda};
  } };
}
export function clipGradient(raw:Vector, threshold:number) {
  if (!vectorFinite(raw) || raw.length!==2 || !Number.isFinite(threshold) || threshold<=0) throw new RangeError('Clipping needs a finite pair and a positive finite threshold.');
  const norm=Math.hypot(...raw), scale=Math.min(1,threshold/norm);
  const applied:Vector=norm===0?raw:[raw[0]*scale+0,raw[1]*scale+0];
  return {raw,norm,threshold,scale: norm===0?1:scale,applied,finite:Number.isFinite(norm)&&vectorFinite(applied)};
}
