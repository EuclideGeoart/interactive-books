/**
 * Named one-variable functions used by Part III. Each is built from the fixed vocabulary in `univariate.ts`; nothing is parsed or evaluated
 * from text. Exact functions use rational pieces; transcendental ones are labelled binary64.
 */
import { add, ZERO, type Rational } from '../quantity/rational';
import { poly } from './polynomial';
import { cbrtFn, piece, piecewise, polynomialFn, r, sinFn, sinRecipFn, sqrtFn, xSinRecipFn, type Univariate } from './univariate';

/** x³/6 − x: smooth, exact; f′(x) = x²/2 − 1. */
export const cubic = polynomialFn('cubic', poly(0, -1, 0, r(1, 6)));
/** |x|: a corner at 0 with exact one-sided slopes −1 and 1. */
export const absolute = piecewise({ id: 'abs', text: '|x|', tex: '|x|', pieces: [piece(null, ZERO, poly(0, -1), { hiClosed: true }), piece(ZERO, null, poly(0, 1))] });
/** A unit jump at 0 whose value at 0 belongs to the right piece. */
export const jump = piecewise({ id: 'jump', text: 'step: −1 for x < 0, 1 for x ≥ 0', tex: '\\begin{cases}-1 & x<0\\\\ 1 & x\\ge 0\\end{cases}',
  pieces: [piece(null, ZERO, poly(-1)), piece(ZERO, null, poly(1), { loClosed: true })] });

export const SECANT_FUNCTIONS: Readonly<Record<string, Univariate>> = { cubic, abs: absolute, jump, cbrt: cbrtFn, sqrt: sqrtFn, sin: sinFn };

// ------------------------------------------------------------------------------------------- III.1 limits
/** (x² − 1)/(x − 1): undefined at 1 (0/0), limit 2 after cancelling the common factor. */
export const hole = piecewise({ id: 'hole', text: '(x² − 1)/(x − 1)', tex: '\\frac{x^2-1}{x-1}', pieces: [piece(null, null, poly(-1, 0, 1), { den: poly(-1, 1) })] });
/** x + 1 with its value at 1 moved to 3: the limit (2) and the value (3) disagree. */
export const moved = piecewise({ id: 'moved', text: 'x + 1, except f(1) = 3', tex: '\\begin{cases}x+1 & x\\ne1\\\\ 3 & x=1\\end{cases}',
  pieces: [piece(null, null, poly(1, 1))], points: [{ x: r(1), value: r(3) }] });
/** 1/x²: both sides grow without bound. */
export const recipSquare = piecewise({ id: 'recip-square', text: '1/x²', tex: '\\frac{1}{x^2}', pieces: [piece(null, null, poly(1), { den: poly(0, 0, 1) })] });
/** 1/x: opposite infinite one-sided behaviour. */
export const recip = piecewise({ id: 'recip', text: '1/x', tex: '\\frac{1}{x}', pieces: [piece(null, null, poly(1), { den: poly(0, 1) })] });
/** x²/2: continuous everywhere, so the limit is the value. */
export const halfSquare = polynomialFn('half-square', poly(0, 0, r(1, 2)));

export interface LimitEntry { readonly f: Univariate; readonly a: number; readonly note: string; readonly derivation?: string }
export const LIMIT_FUNCTIONS: Readonly<Record<string, LimitEntry>> = {
  hole: { f: hole, a: 1, note: 'removable hole', derivation: '\\frac{x^2-1}{x-1}=x+1\\quad(x\\ne1)' },
  moved: { f: moved, a: 1, note: 'value moved away from the limit' },
  jump: { f: jump, a: 0, note: 'jump' },
  'recip-square': { f: recipSquare, a: 0, note: 'both sides unbounded' },
  recip: { f: recip, a: 0, note: 'opposite unbounded sides' },
  oscillation: { f: sinRecipFn, a: 0, note: 'oscillation without a limit' },
  squeeze: { f: xSinRecipFn, a: 0, note: 'squeezed to 0', derivation: '-|x|\\le x\\sin(1/x)\\le|x|\\quad(x\\ne0)' },
  smooth: { f: halfSquare, a: 1, note: 'continuous: limit equals value' },
};

// ------------------------------------------------------------------------------------------- III.2 continuity
export type JoinValue = 'left' | 'right' | 'custom' | 'none';
/**
 * x² + c for x < 1 and m·x for x > 1, with f(1) chosen by `mode`: the left piece's value, the right piece's value, a custom value v, or
 * excluded. Continuity at 1 holds exactly when 1 + c = m = f(1).
 */
export function joinFunction(c: Rational, m: Rational, mode: JoinValue, v: Rational): Univariate {
  const one = r(1);
  const value = mode === 'left' ? add(one, c) : mode === 'right' ? m : mode === 'custom' ? v : null;
  return piecewise({ id: `join-${c.num}/${c.den}-${m.num}/${m.den}-${mode}-${v.num}/${v.den}`, text: 'x² + c (x < 1), m·x (x > 1)', tex: '\\begin{cases}x^2+c & x<1\\\\ m\\,x & x>1\\end{cases}',
    pieces: [piece(null, one, poly(c, 0, 1)), piece(one, null, poly(0, m))], points: [{ x: one, value, reason: 'f(1) has been left undefined.' }] });
}
/** 1/(x − 1): an infinite discontinuity at 1. */
export const shiftedPole = piecewise({ id: 'shifted-pole', text: '1/(x − 1)', tex: '\\frac{1}{x-1}', pieces: [piece(null, null, poly(1), { den: poly(-1, 1) })] });
