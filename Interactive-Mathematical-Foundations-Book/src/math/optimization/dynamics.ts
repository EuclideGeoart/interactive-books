/** Explicit bounded optimizer state. Each convention is the one taught in VI.5–VI.8. */
import { integer, seeded } from '../probability/seeded';
import { vectorFinite, type Vector } from './objectives';

export type Method = 'descent' | 'momentum' | 'stochastic' | 'adam';
export type BatchMode = 'full' | 'stochastic' | 'mini';
const rate = (eta: number) => {
  if (!Number.isFinite(eta) || eta <= 0) throw new RangeError('Learning rate must be positive and finite.');
};
const decay = (beta: number) => {
  if (!Number.isFinite(beta) || beta < 0 || beta >= 1) throw new RangeError('Decay must be in [0, 1).');
};
export function quadraticStability(a: number, eta: number) {
  rate(eta);
  if (!Number.isFinite(a) || a <= 0) throw new RangeError('Curvature must be positive and finite.');
  const eigenvalues: Vector = [a, 4], factors: Vector = [1 - eta * a, 1 - 4 * eta];
  const limit = 2 / Math.max(a, 4);
  const kind = factors.some(f => Math.abs(f) > 1) ? 'divergent mode'
    : factors.some(f => Math.abs(f) === 1) ? 'nondecaying mode'
    : factors.some(f => f < 0) ? 'damped oscillation' : 'monotone contraction';
  return { eigenvalues, factors, limit, stable: eta < limit, kind };
}
export function momentumTransition(previous: Vector, gradient: Vector, eta: number, beta: number) {
  rate(eta); decay(beta);
  if (!vectorFinite(previous) || !vectorFinite(gradient)) throw new RangeError('Momentum inputs must be finite.');
  const velocity: Vector = [beta * previous[0] + gradient[0], beta * previous[1] + gradient[1]];
  const update: Vector = [-eta * velocity[0] + 0, -eta * velocity[1] + 0];
  return { previous, velocity, update, beta, finite: vectorFinite(velocity) && vectorFinite(update) };
}
export interface AdamState { readonly time: number; readonly m: Vector; readonly v: Vector }
export const ADAM_ZERO: AdamState = Object.freeze({time:0,m:Object.freeze([0,0] as const),v:Object.freeze([0,0] as const)});
/** Algorithm 1: t starts at 1; epsilon is added AFTER the square root of the corrected second moment. */
export function adamTransition(previous: AdamState, gradient: Vector, eta: number, beta1: number, beta2: number, epsilon: number) {
  rate(eta); decay(beta1); decay(beta2);
  integer(previous.time, 0, 39, 'Adam time');
  if (!vectorFinite(gradient) || !vectorFinite(previous.m) || !vectorFinite(previous.v) || previous.v.some(v => v < 0) || !Number.isFinite(epsilon) || epsilon <= 0) throw new RangeError('Adam needs finite moments, nonnegative second moments, and positive finite epsilon.');
  const time = previous.time + 1;
  const m: Vector = [beta1 * previous.m[0] + (1-beta1) * gradient[0], beta1 * previous.m[1] + (1-beta1) * gradient[1]];
  const v: Vector = [beta2 * previous.v[0] + (1-beta2) * gradient[0] ** 2, beta2 * previous.v[1] + (1-beta2) * gradient[1] ** 2];
  // expm1 avoids cancellation in 1 − βᵗ for decays close to one.
  const bias = (beta: number) => beta === 0 ? 1 : -Math.expm1(time * Math.log(beta));
  const bias1=bias(beta1), bias2=bias(beta2);
  const mhat:Vector=[m[0]/bias1,m[1]/bias1],vhat:Vector=[v[0]/bias2,v[1]/bias2];
  const denominator:Vector=[Math.sqrt(vhat[0])+epsilon,Math.sqrt(vhat[1])+epsilon];
  const update:Vector=[-eta*mhat[0]/denominator[0]+0,-eta*mhat[1]/denominator[1]+0];
  return { previous, time, m, v, mhat, vhat, bias1, bias2, denominator, update, beta1, beta2, epsilon,
    finite: [m,v,mhat,vhat,update].every(vectorFinite) };
}
/** Independent uniform slots WITH replacement. The explicit next uint32 state makes replay reproducible. */
export function sampleBatch(seed: number, mode: BatchMode, size: number) {
  integer(seed, 0, 0xffffffff, 'Seed'); integer(size, 1, 4, 'Batch size');
  if (!['full', 'stochastic', 'mini'].includes(mode)) throw new RangeError('Choose full, stochastic or mini batch.');
  if (mode === 'full') return { indices: [0,1,2,3], before: seed, after: seed };
  const draw = seeded(seed), indices: number[] = [];
  let after = seed;
  for (let slot = 0; slot < (mode === 'stochastic' ? 1 : size); slot++) {
    const u = draw();
    after = u * 0x100000000;
    indices.push(Math.floor(u * 4));
  }
  return { indices, before: seed, after };
}
