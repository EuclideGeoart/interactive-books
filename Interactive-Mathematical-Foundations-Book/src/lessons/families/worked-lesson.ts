/**
 * Worked examples for the function families: four fixed problems, each a trace of immutable frames {tex, caption}.
 * Every number comes from the model (`deriveCompare`, `valueAt`, `roundTrip`, `deriveCircle`, `deriveGrowth`); this module only orders the steps.
 */
import { CANONICAL_COMPARE, deriveCompare, factsOf, numberOf, valueAt, type CompareState } from '../../math/families/families';
import { exactAngle, exactTrig, piMultiple, deriveCircle } from '../../math/families/circle';
import { deriveGrowth } from '../../math/families/growth';
import { roundTrip } from '../../math/families/roundtrip';
import { ONE } from '../../math/families/rational';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { given } from '../shared/format';
import { num, ratTex, ratText } from './view';

export interface WorkState { readonly tex: string; readonly caption: string }
export interface WorkedExample { readonly id: string; readonly label: string; readonly aria: string }
export const WORKED_EXAMPLES: readonly WorkedExample[] = Object.freeze([
  { id: 'shift', label: '2 ln(x − 1)', aria: 'a shifted and scaled logarithm at x equals 5' },
  { id: 'undo', label: 'e^(ln 5)', aria: 'the exponential of the logarithm of 5' },
  { id: 'circle', label: 'sin and cos of 7π/6', aria: 'sine and cosine of seven pi over six' },
  { id: 'base', label: 'log₂ 10', aria: 'the base 2 logarithm of 10' },
].map(e => Object.freeze(e)));

const SHIFT_STATE: CompareState = Object.freeze({ ...CANONICAL_COMPARE, exp: false, ln: true, sin: false, cos: false, a: 2, h: 1, x: 5 });

function shiftFrames(): WorkState[] {
  const d = deriveCompare(SHIFT_STATE);
  const unscaled = valueAt('ln', ONE, d.u);
  const facts = factsOf('ln', d.a, d.h);
  const scaled = numberOf(d.values.ln) as number;
  const lnU = numberOf(unscaled) as number;
  const zero = facts.zeros.kind === 'single' ? ratTex(facts.zeros.at) : '';
  return [
    { tex: `y=a\\ln(x-h)=${ratTex(d.a)}\\ln(x-${ratTex(d.h)})`, caption: `Read the parameters. The vertical scale is a = ${ratText(d.a)} and the graph is shifted to the right by h = ${ratText(d.h)}. We want the value at x = ${ratText(d.x)}.` },
    { tex: `x-h=${ratTex(d.x)}-${ratTex(d.h)}=${ratTex(d.u)}>0`, caption: 'The input of ln must be positive. It is, so the function is defined here. (If x − h were 0 or negative the answer would be "undefined", not a number.)' },
    { tex: `\\ln(${ratTex(d.u)})\\approx ${num(lnU)}`, caption: 'Take the natural logarithm of the shifted input: the power of e that gives 4.' },
    { tex: `y=${ratTex(d.a)}\\cdot ${num(lnU)}\\approx ${num(scaled)}`, caption: 'Scale: multiply by a. The factor 2 stretches the graph vertically; it does not move the zeros.' },
    { tex: `x=${ratTex(d.h)}\\ \\text{(asymptote)},\\qquad y=0\\ \\text{at}\\ x=${zero}`, caption: 'The shift moved everything with it: the vertical asymptote sits at x = h, and ln is 0 one unit to its right.' },
  ];
}

function undoFrames(): WorkState[] {
  const r = roundTrip({ family: 'exp', order: 'inverse-first', x: 5 });
  const l = r.steps[0].output.kind === 'numeric' ? r.steps[0].output.value : NaN;
  const back = r.steps[1].output.kind === 'numeric' ? r.steps[1].output.value : NaN;
  return [
    { tex: r.claim.tex, caption: 'The claim, with its honest domain: e^(ln x) = x, but only for positive x. We try x = 5.' },
    { tex: `\\ln 5\\approx ${num(l)}`, caption: 'First step: the logarithm exists because 5 is positive. It is irrational, so the computer holds a rounded double.' },
    { tex: `e^{${num(l)}}\\approx ${num(back)}`, caption: 'Second step: exponentiate that rounded number.' },
    { tex: `\\left|e^{\\ln 5}-5\\right|\\le ${num(r.tolerance)}`, caption: `The result matches 5 to within ${num(r.tolerance)}, a few units in the last place. Mathematically the answer is exactly 5; the computer promises no more than this.` },
  ];
}

function circleFrames(): WorkState[] {
  const k = 14;
  const d = deriveCircle(exactAngle(k));
  const t = exactTrig(k);
  const ref = exactTrig(t.reduction.referenceIndex);
  const refAngle = piMultiple(t.reduction.referenceIndex);
  const cos = t.cos;
  const sin = t.sin;
  return [
    { tex: `\\theta=${d.piMultiple!.tex}=${d.degrees.value}^{\\circ}`, caption: 'The angle is 7π/6 radians, which is 210°: a half-turn (π) and then π/6 more.' },
    { tex: '\\pi<\\theta<\\tfrac{3\\pi}{2}\\ \\Rightarrow\\ \\text{quadrant III}', caption: 'It lies between a half-turn and three quarters of a turn, in the third quadrant: both coordinates are negative.' },
    { tex: `\\theta-\\pi=${refAngle.tex}`, caption: 'The reference angle is the acute angle between the radius and the x-axis. Here it is π/6.' },
    { tex: `\\cos${refAngle.tex}=${ref.cos.tex},\\qquad \\sin${refAngle.tex}=${ref.sin.tex}`, caption: 'Read the unsigned values for the reference angle from the table of special angles.' },
    { tex: `\\cos\\theta=${cos.tex},\\qquad \\sin\\theta=${sin.tex}`, caption: 'Put the signs back from the quadrant: both are negative in quadrant III.' },
    { tex: `\\left(${cos.tex}\\right)^{2}+\\left(${sin.tex}\\right)^{2}=${t.cos2.tex}+${t.sin2.tex}=1`, caption: 'Check with cos² + sin² = 1. The point is on the unit circle.' },
  ];
}

function baseFrames(): WorkState[] {
  const d = deriveGrowth({ preset: 'two', custom: 3, x: 10 });
  const lnx = numberOf(d.nats) as number;
  const lnb = numberOf(d.lnBase) as number;
  const q = numberOf(d.logAtX) as number;
  return [
    { tex: `\\log_{2}${given(10)}\\ \\text{means}\\ 2^{y}=${given(10)}`, caption: 'The logarithm to the base 2 asks: what power of 2 gives 10? Between 2³ = 8 and 2⁴ = 16, so the answer is between 3 and 4.' },
    { tex: `\\log_{2}x=\\dfrac{\\ln x}{\\ln 2}`, caption: 'Change of base: every logarithm is a natural logarithm divided by the natural logarithm of the base.' },
    { tex: `\\ln 10\\approx ${num(lnx)},\\qquad \\ln 2\\approx ${num(lnb)}`, caption: 'Compute the two natural logarithms.' },
    { tex: `\\log_{2}10\\approx\\dfrac{${num(lnx)}}{${num(lnb)}}\\approx ${num(q)}`, caption: 'Divide. It is irrational, so this is a rounded value: about 3.32 bits.' },
    { tex: `2^{${num(q)}}\\approx 10`, caption: 'Check by going back: a number of bits between 3 and 4 is what it takes to tell 10 equally likely cases apart.' },
  ];
}

export function workedFrames(id: string): readonly TraceFrame<WorkState>[] {
  const states = id === 'shift' ? shiftFrames() : id === 'undo' ? undoFrames() : id === 'circle' ? circleFrames() : id === 'base' ? baseFrames() : null;
  if (!states) throw new RangeError(`Unknown worked example: ${id}`);
  return traceFrom<WorkState>(states.map(state => ({ state })));
}

