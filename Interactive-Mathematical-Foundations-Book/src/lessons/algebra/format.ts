/**
 * How I.4 writes its objects: linear forms, statements, solution sets and operations, as LaTeX, plain text and spoken text. Pure strings,
 * no mathematics beyond reading the exact value's own digits (the same division of labour as `quantities/values.ts`).
 */
import { rationalForm } from '../../math/quantity/exactform';
import { isZero, sign, neg, eq, ONE, type Rational } from '../../math/quantity/rational';
import { MINUS } from '../../platform/numeric/format';
import type { ValueDescription } from '../../platform/numeric/quantity';
import { statement as describeStatement } from '../quantities/values';
import type { Linear, Operation, Relation, SolutionSet, Statement } from '../../math/algebra/linear';

export const relTex = (rel: Relation): string => ({ '=': '=', '<': '<', '≤': '\\le', '>': '>', '≥': '\\ge' } as const)[rel];
export const relSpoken = (rel: Relation): string => ({ '=': 'equals', '<': 'is less than', '≤': 'is at most', '>': 'is greater than', '≥': 'is at least' } as const)[rel];
export const relText = (rel: Relation): string => rel;

const absR = (r: Rational): Rational => (sign(r) < 0 ? neg(r) : r);
const numTex = (r: Rational): string => rationalForm(r).tex.replace(/^-/, '');
const numText = (r: Rational): string => rationalForm(r).text.replace(/^−/, '');
const numSpoken = (r: Rational): string => rationalForm(r).spoken.replace(/^minus /, '');

interface Part { readonly negative: boolean; readonly body: string }

/** The non-zero terms of a·x + b, each as a sign and a body. `x` builds the body of the x-term from its magnitude (never 0, never negative). */
function partsOf(l: Linear, xTerm: (mag: Rational) => string, constant: (mag: Rational) => string): Part[] {
  const parts: Part[] = [];
  if (!isZero(l.a)) parts.push({ negative: sign(l.a) < 0, body: xTerm(absR(l.a)) });
  if (!isZero(l.b)) parts.push({ negative: sign(l.b) < 0, body: constant(absR(l.b)) });
  return parts;
}

function join(parts: readonly Part[], minus: string, space: string, zero: string): string {
  if (parts.length === 0) return zero;
  return parts.map((p, i) => (i === 0 ? `${p.negative ? minus : ''}${p.body}` : `${space}${p.negative ? minus : '+'}${space}${p.body}`)).join('');
}

const xTex = (mag: Rational): string => (eq(mag, ONE) ? 'x' : `${numTex(mag)}x`);
const xText = (mag: Rational): string => (eq(mag, ONE) ? 'x' : numText(mag).includes('/') ? `(${numText(mag)})x` : `${numText(mag)}x`);
const xSpoken = (mag: Rational): string => (eq(mag, ONE) ? 'x' : `${numSpoken(mag)} x`);

/** `3x+2`, `x-4`, `-x`, `\frac{3}{4}x+1`, `5`, `0`. */
export const linearTex = (l: Linear): string => join(partsOf(l, xTex, numTex), '-', '', '0');
/** `3x + 2`, `x − 4`, `−x`, `3/4x + 1`: the plain-text twin (U+2212 for every minus). */
export const linearText = (l: Linear): string => join(partsOf(l, xText, numText), MINUS, ' ', '0');
export const linearSpoken = (l: Linear): string => {
  const parts = partsOf(l, xSpoken, numSpoken);
  if (parts.length === 0) return 'zero';
  return parts.map((p, i) => (i === 0 ? `${p.negative ? 'minus ' : ''}${p.body}` : ` ${p.negative ? 'minus' : 'plus'} ${p.body}`)).join('');
};

export const statementTex = (s: Statement): string => `${linearTex(s.l)}${relTex(s.rel)}${linearTex(s.r)}`;
export const statementText = (s: Statement): string => `${linearText(s.l)} ${relText(s.rel)} ${linearText(s.r)}`;
export const statementSpoken = (s: Statement): string => `${linearSpoken(s.l)} ${relSpoken(s.rel)} ${linearSpoken(s.r)}`;

/** `3x+2` with x replaced by the number: `3\cdot 4+2`, `x-4` at x = -2 becomes `\left(-2\right)-4`. */
export function substitutedTex(l: Linear, x: Rational): string {
  const at = sign(x) < 0 ? `\\left(${rationalForm(x).tex}\\right)` : rationalForm(x).tex;
  return join(partsOf(l, mag => (eq(mag, ONE) ? at : `${numTex(mag)}\\cdot ${at}`), numTex), '-', '', '0');
}

// ---------------------------------------------------------------------------------------------- solution sets
const fmt = (r: Rational) => rationalForm(r);

/** Interval notation: `{4}`, `∅`, `(−∞, ∞)`, `(−2, ∞)`, `[3, ∞)`, `(−∞, 8/3]`. */
export function intervalText(set: SolutionSet): string {
  switch (set.kind) {
    case 'none': return '∅';
    case 'all': return '(−∞, ∞)';
    case 'point': return `{${fmt(set.x).text}}`;
    case 'ray': return set.side === 'above' ? `${set.closed ? '[' : '('}${fmt(set.bound).text}, ∞)` : `(−∞, ${fmt(set.bound).text}${set.closed ? ']' : ')'}`;
  }
}
export function intervalTex(set: SolutionSet): string {
  switch (set.kind) {
    case 'none': return '\\varnothing';
    case 'all': return '(-\\infty,\\infty)';
    case 'point': return `\\{${fmt(set.x).tex}\\}`;
    case 'ray': return set.side === 'above' ? `${set.closed ? '[' : '('}${fmt(set.bound).tex},\\infty)` : `(-\\infty,${fmt(set.bound).tex}${set.closed ? ']' : ')'}`;
  }
}
/** The condition on x: `x = 4`, `x > −2`, `x ≤ 8/3`, `every x`, `no x`. */
export function conditionText(set: SolutionSet): string {
  switch (set.kind) {
    case 'none': return 'no x';
    case 'all': return 'every x';
    case 'point': return `x = ${fmt(set.x).text}`;
    case 'ray': return `x ${set.side === 'above' ? (set.closed ? '≥' : '>') : set.closed ? '≤' : '<'} ${fmt(set.bound).text}`;
  }
}
export function conditionTex(set: SolutionSet): string {
  switch (set.kind) {
    case 'none': return '\\text{no } x';
    case 'all': return '\\text{every } x';
    case 'point': return `x=${fmt(set.x).tex}`;
    case 'ray': return `x${set.side === 'above' ? (set.closed ? '\\ge' : '>') : set.closed ? '\\le' : '<'}${fmt(set.bound).tex}`;
  }
}
export function conditionSpoken(set: SolutionSet): string {
  switch (set.kind) {
    case 'none': return 'no value of x';
    case 'all': return 'every value of x';
    case 'point': return `x equals ${fmt(set.x).spoken}`;
    case 'ray': return `x is ${set.side === 'above' ? (set.closed ? 'at least' : 'greater than') : set.closed ? 'at most' : 'less than'} ${fmt(set.bound).spoken}`;
  }
}

/** The solution set as an inspector value: `S = (−2, ∞)`. */
export function describeSet(set: SolutionSet): ValueDescription {
  return describeStatement(intervalText(set), intervalTex(set), `the solution set is ${conditionSpoken(set)}`);
}

// ---------------------------------------------------------------------------------------------- operations
/** What an `add` operation adds, as (is it a subtraction, the magnitude as text/tex). `null` for the general term `ax + b`. */
function addedTerm(term: Linear): { negative: boolean; text: string; tex: string } | null {
  if (isZero(term.a) && isZero(term.b)) return { negative: false, text: '0', tex: '0' };
  if (isZero(term.a)) return { negative: sign(term.b) < 0, text: numText(absR(term.b)), tex: numTex(absR(term.b)) };
  if (isZero(term.b)) return { negative: sign(term.a) < 0, text: xText(absR(term.a)), tex: xTex(absR(term.a)) };
  return null;
}

/** "Subtract 2 from both sides", "Divide both sides by −3". */
export function operationText(op: Operation): string {
  if (op.kind === 'add') {
    const t = addedTerm(op.term);
    if (t === null) return `Add (${linearText(op.term)}) to both sides`;
    return t.negative ? `Subtract ${t.text} from both sides` : `Add ${t.text} to both sides`;
  }
  const k = rationalForm(op.k).text;
  return op.kind === 'scale' ? `Multiply both sides by ${k}` : `Divide both sides by ${k}`;
}
export const operationSpoken = (op: Operation): string => operationText(op).replace(/−/g, 'minus ');

/** Each side with the operation written out and NOT yet simplified, e.g. `3x+2-x`, `\frac{2x}{2}`, `\left(-3\right)\left(x+1\right)`. */
export function appliedTex(l: Linear, op: Operation): string {
  const side = linearTex(l);
  if (op.kind === 'add') {
    const t = addedTerm(op.term);
    if (t === null) return `${side}+\\left(${linearTex(op.term)}\\right)`;
    return t.text === '0' ? side : `${side}${t.negative ? '-' : '+'}${t.tex}`;
  }
  const k = rationalForm(op.k);
  if (op.kind === 'scale') return `${sign(op.k) < 0 ? `\\left(${k.tex}\\right)` : k.tex}\\left(${side}\\right)`;
  return `\\frac{${side}}{${k.tex}}`;
}

// ---------------------------------------------------------------------------------------------- x shifted by a whole number
/** `x`, `x + 2`, `x − 2`: the plain text of x shifted by an integer. */
export const shiftText = (n: number): string => (n === 0 ? 'x' : `x ${n > 0 ? '+' : MINUS} ${Math.abs(n)}`);
/** `x`, `x+2`, `x-2`. */
export const shiftTex = (n: number): string => (n === 0 ? 'x' : `x${n > 0 ? '+' : '-'}${Math.abs(n)}`);
/** A whole number as plain text with U+2212. */
export const intText = (n: number): string => String(n).replace('-', MINUS);
