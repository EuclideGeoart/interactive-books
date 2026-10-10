/**
 * How I.5 writes its objects: values (exact radicals, decimals, "undefined"), operations, rules, composites and sets, as LaTeX, plain text and
 * spoken text. Pure strings: nothing here decides a domain, an image or a value, it only writes what the model already decided.
 */
import { rationalForm } from '../../math/quantity/exactform';
import { abs, eq, ONE, sign, type Rational } from '../../math/quantity/rational';
import type { RadicalSum } from '../../math/algebra/extraneous';
import type { Interval, IntervalSet } from '../../math/functions/interval';
import { isAll, isEmpty } from '../../math/functions/interval';
import type { FnId } from '../../math/functions/compose';
import type { RuleId } from '../../math/functions/rule';
import type { Num, Op } from '../../math/functions/value';
import { MINUS, formatApprox } from '../../platform/numeric/format';
import { describeValue, type ExactForm, type ValueDescription } from '../../platform/numeric/quantity';
import { FORMAT } from '../shared/format';
import { shiftText, shiftTex } from '../algebra/format';

// ---------------------------------------------------------------------------------------------- values
/** The exact form of  u + v√b  with rational u, v. A rational sum is written by `rationalForm`. */
export function sumForm(s: RadicalSum): ExactForm {
  if (s.b === 1n) return rationalForm(s.u);
  const negative = sign(s.v) < 0;
  const mag = abs(s.v);
  const one = eq(mag, ONE);
  const whole = mag.den === 1n;
  const coefText = one ? '' : whole ? `${mag.num}` : `(${mag.num}/${mag.den})`;
  const coefTex = one ? '' : whole ? `${mag.num}` : `\\frac{${mag.num}}{${mag.den}}`;
  const coefSpoken = one ? '' : whole ? `${mag.num} times ` : `${mag.num} over ${mag.den} times `;
  const radicalText = `${coefText}√${s.b}`;
  const radicalTex = `${coefTex}\\sqrt{${s.b}}`;
  const radicalSpoken = `${coefSpoken}the square root of ${s.b}`;
  if (sign(s.u) === 0) {
    return {
      text: `${negative ? MINUS : ''}${radicalText}`, tex: `${negative ? '-' : ''}${radicalTex}`, spoken: `${negative ? 'minus ' : ''}${radicalSpoken}`,
      integer: false, irrational: true,
    };
  }
  const u = rationalForm(s.u);
  return {
    text: `${u.text} ${negative ? MINUS : '+'} ${radicalText}`,
    tex: `${u.tex}${negative ? '-' : '+'}${radicalTex}`,
    spoken: `${u.spoken} ${negative ? 'minus' : 'plus'} ${radicalSpoken}`,
    integer: false, irrational: true,
  };
}

/** A value as an inspector line: exact (with a decimal when useful), a decimal only (no exact form attempted) or undefined with its reason. */
export function describeNum(n: Num): ValueDescription {
  if (n.kind === 'undefined') return describeValue({ kind: 'undefined', reason: n.reason }, FORMAT);
  if (n.kind === 'approx') return { ...describeValue({ kind: 'numeric', value: n.value }, FORMAT), note: n.reason };
  return describeValue({ kind: 'exact', exact: sumForm(n.s), approx: n.approx }, FORMAT);
}

export function numTex(n: Num): string {
  if (n.kind === 'undefined') return '\\text{undefined}';
  if (n.kind === 'approx') return `\\approx ${formatApprox(n.value, FORMAT).tex}`;
  return sumForm(n.s).tex;
}
export function numText(n: Num): string {
  if (n.kind === 'undefined') return 'undefined';
  if (n.kind === 'approx') return `≈ ${formatApprox(n.value, FORMAT).text}`;
  return sumForm(n.s).text;
}
export function numSpoken(n: Num): string {
  if (n.kind === 'undefined') return 'undefined';
  if (n.kind === 'approx') return `approximately ${formatApprox(n.value, FORMAT).spoken}`;
  return sumForm(n.s).spoken;
}
/** LaTeX of a value written as an argument of a power, a sum or a product: negative, compound and fractional values are parenthesised. */
export function numBaseTex(n: Num): string {
  if (n.kind !== 'exact') return numTex(n);
  const tex = sumForm(n.s).tex;
  return n.s.b !== 1n || sign(n.s.u) < 0 || tex.includes('\\frac') ? `\\left(${tex}\\right)` : tex;
}

// ---------------------------------------------------------------------------------------------- operations
const rtext = (r: Rational): string => rationalForm(r).text;
const rtex = (r: Rational): string => rationalForm(r).tex;

/** What the box in the pipeline says: "subtract 2", "multiply by −3", "square", "take the square root". */
export function opWords(op: Op): string {
  switch (op.op) {
    case 'add': return sign(op.c) < 0 ? `subtract ${rtext(abs(op.c))}` : `add ${rtext(op.c)}`;
    case 'mul': return `multiply by ${rtext(op.c)}`;
    case 'square': return 'square';
    case 'sqrt': return 'take the square root';
    case 'recip': return 'take the reciprocal';
    case 'abs': return 'take the absolute value';
  }
}
export function opSpoken(op: Op): string {
  switch (op.op) {
    case 'add': return sign(op.c) < 0 ? `subtract ${rationalForm(abs(op.c)).spoken}` : `add ${rationalForm(op.c).spoken}`;
    case 'mul': return `multiply by ${rationalForm(op.c).spoken}`;
    default: return opWords(op);
  }
}
/** The operation applied to a written argument:  op(arg)  as LaTeX, for the substitution lines. */
export function opApplyTex(op: Op, arg: string): string {
  switch (op.op) {
    case 'add': return sign(op.c) < 0 ? `${arg}-${rtex(abs(op.c))}` : `${arg}+${rtex(op.c)}`;
    case 'mul': return `${rtex(op.c)}\\cdot ${arg}`;
    case 'square': return `${arg}^{2}`;
    case 'sqrt': return `\\sqrt{${arg}}`;
    case 'recip': return `\\frac{1}{${arg}}`;
    case 'abs': return `\\lvert ${arg}\\rvert`;
  }
}

// ---------------------------------------------------------------------------------------------- rules
export const RULE_LABEL: Readonly<Record<RuleId, string>> = Object.freeze({
  line: 'a·x', stretch: 'a·x²', shift: '(x − a)²', root: '√(x + a)', pole: '1/(x − a)', abs: '|x − a|',
});
export const RULE_CHOICES: readonly { readonly id: RuleId; readonly label: string }[] = Object.freeze(
  (['line', 'stretch', 'shift', 'root', 'pole', 'abs'] as const).map(id => ({ id, label: RULE_LABEL[id] })),
);
export const paramName = (rule: RuleId): string => (rule === 'line' || rule === 'stretch' ? 'multiplier' : 'shift');

export function ruleTex(rule: RuleId, a: number): string {
  switch (rule) {
    case 'line': return a === 0 ? '0\\cdot x' : a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
    case 'stretch': return a === 0 ? '0\\cdot x^{2}' : a === 1 ? 'x^{2}' : a === -1 ? '-x^{2}' : `${a}x^{2}`;
    case 'shift': return a === 0 ? 'x^{2}' : `\\left(${shiftTex(-a)}\\right)^{2}`;
    case 'root': return `\\sqrt{${shiftTex(a)}}`;
    case 'pole': return `\\frac{1}{${shiftTex(-a)}}`;
    case 'abs': return `\\lvert ${shiftTex(-a)}\\rvert`;
  }
}
export function ruleText(rule: RuleId, a: number): string {
  switch (rule) {
    case 'line': return a === 0 ? '0·x' : a === 1 ? 'x' : a === -1 ? `${MINUS}x` : `${a < 0 ? MINUS : ''}${Math.abs(a)}x`;
    case 'stretch': return a === 0 ? '0·x²' : a === 1 ? 'x²' : a === -1 ? `${MINUS}x²` : `${a < 0 ? MINUS : ''}${Math.abs(a)}x²`;
    case 'shift': return a === 0 ? 'x²' : `(${shiftText(-a)})²`;
    case 'root': return `√(${shiftText(a)})`;
    case 'pole': return a === 0 ? '1/x' : `1/(${shiftText(-a)})`;
    case 'abs': return `|${shiftText(-a)}|`;
  }
}
export function ruleSpoken(rule: RuleId, a: number): string {
  const sh = (n: number): string => (n === 0 ? 'x' : `x ${n > 0 ? 'plus' : 'minus'} ${Math.abs(n)}`);
  switch (rule) {
    case 'line': return a === 0 ? '0 times x' : `${a < 0 ? 'minus ' : ''}${Math.abs(a)} times x`;
    case 'stretch': return a === 0 ? '0 times x squared' : `${a < 0 ? 'minus ' : ''}${Math.abs(a)} times x squared`;
    case 'shift': return a === 0 ? 'x squared' : `the square of ${sh(-a)}`;
    case 'root': return `the square root of ${sh(a)}`;
    case 'pole': return `1 over ${sh(-a)}`;
    case 'abs': return `the absolute value of ${sh(-a)}`;
  }
}

export const FN_LABEL: Readonly<Record<FnId, string>> = Object.freeze({ lin: '2x − 1', sq: 'x²', rt: '√x', rec: '1/x' });
export const FN_TEX: Readonly<Record<FnId, string>> = Object.freeze({ lin: '2x-1', sq: 'x^{2}', rt: '\\sqrt{x}', rec: '\\frac{1}{x}' });
export const FN_SPOKEN: Readonly<Record<FnId, string>> = Object.freeze({ lin: '2 x minus 1', sq: 'x squared', rt: 'the square root of x', rec: '1 over x' });
export const FN_CHOICES: readonly { readonly id: FnId; readonly label: string }[] = Object.freeze(
  (['lin', 'sq', 'rt', 'rec'] as const).map(id => ({ id, label: FN_LABEL[id] })),
);
/** The catalogue function with its argument substituted, e.g. `substituteTex('sq', '2x-1')` is `(2x-1)^{2}`. */
export function fnApplyTex(fn: FnId, arg: string): string {
  switch (fn) {
    case 'lin': return `2\\left(${arg}\\right)-1`;
    case 'sq': return `\\left(${arg}\\right)^{2}`;
    case 'rt': return `\\sqrt{${arg}}`;
    case 'rec': return `\\frac{1}{${arg}}`;
  }
}

// ---------------------------------------------------------------------------------------------- sets of numbers
const endText = (r: Rational): string => rtext(r);
const endTex = (r: Rational): string => rtex(r);

function isExcept(set: IntervalSet): Rational | null {
  if (set.length !== 2) return null;
  const [a, b] = set as readonly [Interval, Interval];
  if (a.lo === null && b.hi === null && a.hi !== null && b.lo !== null && !a.hiClosed && !b.loClosed && eq(a.hi, b.lo)) return a.hi;
  return null;
}
const isPoint = (i: Interval): boolean => i.lo !== null && i.hi !== null && eq(i.lo, i.hi);

function intervalText(i: Interval): string {
  if (isPoint(i)) return `{${endText(i.lo!)}}`;
  const lo = i.lo === null ? `(${MINUS}∞` : `${i.loClosed ? '[' : '('}${endText(i.lo)}`;
  const hi = i.hi === null ? '∞)' : `${endText(i.hi)}${i.hiClosed ? ']' : ')'}`;
  return `${lo}, ${hi}`;
}
function intervalTex(i: Interval): string {
  if (isPoint(i)) return `\\{${endTex(i.lo!)}\\}`;
  const lo = i.lo === null ? '(-\\infty' : `${i.loClosed ? '[' : '('}${endTex(i.lo)}`;
  const hi = i.hi === null ? '\\infty)' : `${endTex(i.hi)}${i.hiClosed ? ']' : ')'}`;
  return `${lo},\\,${hi}`;
}

export function setText(set: IntervalSet): string {
  if (isEmpty(set)) return '∅';
  if (isAll(set)) return 'ℝ';
  const p = isExcept(set);
  if (p) return `ℝ ∖ {${endText(p)}}`;
  return set.map(intervalText).join(' ∪ ');
}
export function setTex(set: IntervalSet): string {
  if (isEmpty(set)) return '\\varnothing';
  if (isAll(set)) return '\\R';
  const p = isExcept(set);
  if (p) return `\\R\\setminus\\{${endTex(p)}\\}`;
  return set.map(intervalTex).join('\\cup ');
}
export function setSpoken(set: IntervalSet): string {
  if (isEmpty(set)) return 'no number at all';
  if (isAll(set)) return 'all real numbers';
  const p = isExcept(set);
  if (p) return `all real numbers except ${rationalForm(p).spoken}`;
  return set.map(i => {
    if (isPoint(i)) return `only the number ${rationalForm(i.lo!).spoken}`;
    if (i.lo !== null && i.hi === null) return `all numbers greater than ${i.loClosed ? 'or equal to ' : ''}${rationalForm(i.lo).spoken}`;
    if (i.lo === null && i.hi !== null) return `all numbers less than ${i.hiClosed ? 'or equal to ' : ''}${rationalForm(i.hi).spoken}`;
    return `the numbers from ${rationalForm(i.lo!).spoken} to ${rationalForm(i.hi!).spoken}`;
  }).join(', and ');
}
