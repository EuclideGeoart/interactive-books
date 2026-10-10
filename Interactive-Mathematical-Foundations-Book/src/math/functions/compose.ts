/**
 * Composition and inverses over a small catalogue of four machines:
 *
 *   lin   2x − 1     multiply by 2, subtract 1        domain ℝ        image ℝ
 *   sq    x²         square                           domain ℝ        image [0, ∞)
 *   rt    √x         square root                      domain [0, ∞)   image [0, ∞)
 *   rec   1/x        reciprocal                       domain ℝ ∖ {0}  image ℝ ∖ {0}
 *
 * `f ∘ g` means "g first, then f": its pipeline is the pipeline of g followed by the pipeline of f. Its domain is computed backwards through
 * the joined pipeline (`domainOf`), so "x must be in the domain of g AND g(x) must be in the domain of f" is not a rule to remember but what
 * the computation does.
 *
 * The inverse of a machine is the reverse pipeline with each step undone. `sq` has no inverse on ℝ (x and −x give the same output); restricted
 * to [0, ∞) it has one, √. The check `f⁻¹(f(x)) = x` is made EXACTLY with the same arithmetic as everything else.
 */
import { fromDecimal, int, rational, ONE, ZERO, type Rational } from '../quantity/rational';
import { domainOf } from './domain';
import { ALL, contains, exceptPoint, rayUp, type IntervalSet } from './interval';
import { evaluate, evaluateDouble, numEqual, runOps, type Evaluation, type Num, type Op } from './value';

export type FnId = 'lin' | 'sq' | 'rt' | 'rec';
export const FN_IDS: readonly FnId[] = Object.freeze(['lin', 'sq', 'rt', 'rec']);

export const fnOps = (id: FnId): readonly Op[] => {
  switch (id) {
    case 'lin': return [{ op: 'mul', c: int(2) }, { op: 'add', c: int(-1) }];
    case 'sq': return [{ op: 'square' }];
    case 'rt': return [{ op: 'sqrt' }];
    case 'rec': return [{ op: 'recip' }];
  }
};

/** f ∘ g: g first, then f. */
export const composeOps = (f: FnId, g: FnId): readonly Op[] => Object.freeze([...fnOps(g), ...fnOps(f)]);

export const fnDomain = (id: FnId): IntervalSet => domainOf(fnOps(id));
export function fnImage(id: FnId): IntervalSet {
  switch (id) {
    case 'lin': return ALL;
    case 'sq': case 'rt': return rayUp(ZERO, true);
    case 'rec': return exceptPoint(ZERO);
  }
}

export interface CompositionState { readonly f: FnId; readonly g: FnId; readonly x: number }

export interface CompositionDerived {
  readonly state: CompositionState;
  readonly x: Rational;
  /** f(g(x)): g first. */
  readonly fg: Evaluation;
  /** g(f(x)): f first. */
  readonly gf: Evaluation;
  readonly fgDomain: IntervalSet;
  readonly gfDomain: IntervalSet;
  readonly fDomain: IntervalSet;
  readonly gDomain: IntervalSet;
  readonly fgDefined: boolean;
  readonly gfDefined: boolean;
  /** Do the two orders give the same value at this x (both defined and exactly equal)? */
  readonly sameValue: boolean;
}

export function deriveComposition(state: CompositionState): CompositionDerived {
  const x = fromDecimal(state.x, 2);
  if (!x) throw new RangeError('x must have at most two decimal places');
  const fg = evaluate(composeOps(state.f, state.g), x);
  const gf = evaluate(composeOps(state.g, state.f), x);
  const defined = (e: Evaluation): boolean => e.output.kind !== 'undefined';
  return {
    state, x, fg, gf,
    fgDomain: domainOf(composeOps(state.f, state.g)),
    gfDomain: domainOf(composeOps(state.g, state.f)),
    fDomain: fnDomain(state.f), gDomain: fnDomain(state.g),
    fgDefined: defined(fg), gfDefined: defined(gf),
    sameValue: defined(fg) && defined(gf) && numEqual(fg.output, gf.output),
  };
}

/** The pipeline of the inner machine alone (g), for the "g(x)" box of the f ∘ g trace. */
export const innerValue = (d: CompositionDerived): Num => d.fg.rows[Math.max(0, fnOps(d.state.g).length - 1)]!.after;

// ------------------------------------------------------------------------------------------------ inverses
export interface InverseState { readonly fn: FnId; readonly x: number; readonly restrict: boolean }

/** The operations that undo `fn`, in the order they are applied to an OUTPUT. `null` for `sq` when it is not restricted. */
export function inverseOps(fn: FnId, restrict: boolean): readonly Op[] | null {
  switch (fn) {
    case 'lin': return [{ op: 'add', c: ONE }, { op: 'mul', c: rational(1n, 2n) }];
    case 'sq': return restrict ? [{ op: 'sqrt' }] : null;
    case 'rt': return [{ op: 'square' }];
    case 'rec': return [{ op: 'recip' }];
  }
}

/** The domain the inverse test works on: `sq` is restricted to [0, ∞) when the learner asks for the inverse. */
export const restrictedDomain = (fn: FnId, restrict: boolean): IntervalSet => (fn === 'sq' && restrict ? rayUp(ZERO, true) : fnDomain(fn));

export interface InverseDerived {
  readonly state: InverseState;
  readonly x: Rational;
  readonly inDomain: boolean;
  readonly forward: Evaluation;
  /** `null` while `sq` is unrestricted (no inverse function exists) or the forward step is undefined. */
  readonly backward: Evaluation | null;
  readonly hasInverse: boolean;
  /** Round trip: f⁻¹(f(x)) is exactly x. */
  readonly roundTrip: boolean;
  /** For an unrestricted sq: the other input with the same output (−x), when x ≠ 0. */
  readonly twin: Rational | null;
  readonly domain: IntervalSet;
  readonly image: IntervalSet;
}

export function deriveInverse(state: InverseState): InverseDerived {
  const x = fromDecimal(state.x, 2);
  if (!x) throw new RangeError('x must have at most two decimal places');
  const domain = restrictedDomain(state.fn, state.restrict);
  const inDomain = contains(domain, x);
  const forward = evaluate(fnOps(state.fn), x);
  const inv = inverseOps(state.fn, state.restrict);
  const backward = inDomain && forward.output.kind !== 'undefined' && inv !== null ? runOps(inv, forward.output) : null;
  const twin = state.fn === 'sq' && !state.restrict && x.num !== 0n ? { num: -x.num, den: x.den } : null;
  return {
    state, x, inDomain, forward, backward, hasInverse: inv !== null, roundTrip: backward !== null && numEqual(backward.output, forward.input), twin,
    domain, image: state.fn === 'sq' && state.restrict ? rayUp(ZERO, true) : fnImage(state.fn),
  };
}

// ------------------------------------------------------------------------------------------------ doubles for drawing
export const fnDouble = (id: FnId): ((x: number) => number | null) => { const ops = fnOps(id); return x => evaluateDouble(ops, x); };
export const fnBreaks = (id: FnId): readonly number[] => (id === 'rec' ? [0] : []);
