/**
 * Quantities with units: a tiny exponent-vector model (master plan §10.3 — chapter-owned, no unit library).
 *
 * A quantity is an exact rational VALUE together with a DIMENSION: three whole-number exponents of the base units metre (length, L),
 * second (time, T) and kilogram (mass, M). `3 m` is (3; 1, 0, 0); `9 m²` is (9; 2, 0, 0); a speed `m/s` is (L, T, M) = (1, −1, 0);
 * a ratio such as `m/m` has the zero vector and no unit at all (it is DIMENSIONLESS).
 *
 * The rules the stage lets you test are exactly these:
 *   add / subtract   need IDENTICAL dimensions, and keep them;
 *   multiply         adds the exponent vectors, divide subtracts them;
 *   integer power    multiplies the exponent vector by the power;
 *   square root      halves the vector, so every exponent must be EVEN (and the value must be ≥ 0).
 * A square root whose exponents are not all even is not a quantity of this model (it would need m^½). The model says so; it never invents
 * half-integer exponents. Only the three base units are used, with no prefixes: converting km to m is a multiplication by a factor, which
 * is a separate topic and not part of this model.
 */
import { add, eq, isZero, mul, power, rational, sub, div, type Rational } from './rational';
import { rootOf, type ExactRoot } from './root';

export type Dim = readonly [length: number, time: number, mass: number];
export const DIMENSIONLESS: Dim = [0, 0, 0];
export const LENGTH: Dim = [1, 0, 0];
export const TIME: Dim = [0, 1, 0];
export const MASS: Dim = [0, 0, 1];
export const AREA: Dim = [2, 0, 0];
export const SPEED: Dim = [1, -1, 0];

export interface Quantity {
  readonly value: Rational;
  readonly dim: Dim;
}

/** The value of a result: a rational, or an exact irrational root (the square root of a non-square, in some unit). */
export type ResultValue =
  | { readonly kind: 'rational'; readonly r: Rational }
  | { readonly kind: 'root'; readonly root: ExactRoot; readonly approx: number };

export interface ResultQuantity {
  readonly value: ResultValue;
  readonly dim: Dim;
}

export type QuantityOutcome =
  | { readonly ok: true; readonly result: ResultQuantity; /** the dimension rule that applied, in words */ readonly rule: string }
  | { readonly ok: false; readonly reason: string };

export type BinaryOp = 'add' | 'subtract' | 'multiply' | 'divide';
export type UnaryOp = 'square' | 'root';
export type Op = BinaryOp | UnaryOp;
export const isBinary = (op: Op): op is BinaryOp => op === 'add' || op === 'subtract' || op === 'multiply' || op === 'divide';

export const sameDim = (a: Dim, b: Dim): boolean => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
export const isDimensionless = (d: Dim): boolean => sameDim(d, DIMENSIONLESS);
export const addDim = (a: Dim, b: Dim): Dim => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const subDim = (a: Dim, b: Dim): Dim => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
/** `+ 0` turns −0 (0 × a negative power) into +0. */
export const scaleDim = (a: Dim, k: number): Dim => [a[0] * k + 0, a[1] * k + 0, a[2] * k + 0];
export const allEven = (d: Dim): boolean => d.every(e => e % 2 === 0);

// ------------------------------------------------------------------------------------------------ naming
const SYMBOLS = ['m', 's', 'kg'] as const;
const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const sup = (n: number): string => (n === 1 ? '' : [...String(n)].map(c => SUP[c] ?? c).join(''));
/** Print order inside a unit: kg, m, s (so force reads kg·m/s²). */
const ORDER = [2, 0, 1] as const;

function parts(d: Dim): { top: [string, number][]; bottom: [string, number][] } {
  const top: [string, number][] = [];
  const bottom: [string, number][] = [];
  for (const i of ORDER) {
    const e = d[i]!;
    if (e > 0) top.push([SYMBOLS[i]!, e]);
    else if (e < 0) bottom.push([SYMBOLS[i]!, -e]);
  }
  return { top, bottom };
}

/** `m`, `m²`, `m/s`, `kg·m/s²`, `1/s`; the empty string for a dimensionless quantity. */
export function unitText(d: Dim): string {
  if (isDimensionless(d)) return '';
  const { top, bottom } = parts(d);
  const join = (xs: [string, number][]) => xs.map(([s, e]) => `${s}${sup(e)}`).join('·');
  const numerator = top.length ? join(top) : '1';
  if (!bottom.length) return numerator;
  return `${numerator}/${bottom.length > 1 ? `(${join(bottom)})` : join(bottom)}`;
}

/** The same unit as LaTeX (upright, as units are set). */
export function unitTex(d: Dim): string {
  if (isDimensionless(d)) return '';
  const { top, bottom } = parts(d);
  const join = (xs: [string, number][]) => xs.map(([s, e]) => `\\mathrm{${s}}${e === 1 ? '' : `^{${e}}`}`).join('\\cdot ');
  const numerator = top.length ? join(top) : '1';
  if (!bottom.length) return numerator;
  return `${numerator}/${bottom.length > 1 ? `(${join(bottom)})` : join(bottom)}`;
}

/** What a screen reader says: "square metres", "metres per second". */
export function unitSpoken(d: Dim): string {
  if (isDimensionless(d)) return 'with no unit';
  const name = (s: string, e: number, plural: boolean): string => {
    const base = s === 'm' ? (plural ? 'metres' : 'metre') : s === 's' ? (plural ? 'seconds' : 'second') : plural ? 'kilograms' : 'kilogram';
    if (e === 1) return base;
    if (e === 2) return plural ? `square ${base}` : `${base} squared`;
    if (e === 3) return plural ? `cubic ${base}` : `${base} cubed`;
    return `${base} to the power ${e}`;
  };
  const { top, bottom } = parts(d);
  const num = top.length ? top.map(([s, e]) => name(s, e, true)).join(' ') : 'one';
  return bottom.length ? `${num} per ${bottom.map(([s, e]) => name(s, e, false)).join(' ')}` : num;
}

const KIND = new Map<string, string>([
  ['0,0,0', 'a plain number (no unit)'], ['1,0,0', 'a length'], ['0,1,0', 'a time'], ['0,0,1', 'a mass'], ['2,0,0', 'an area'],
  ['3,0,0', 'a volume'], ['1,-1,0', 'a speed'], ['0,-1,0', 'a rate (per second)'], ['1,-2,0', 'an acceleration'], ['1,-2,1', 'a force'],
]);
/** "a length", "an area", … or "a quantity in kg·m" for combinations without a common name. */
export const kindOf = (d: Dim): string => KIND.get(d.join(',')) ?? `a quantity in ${unitText(d)}`;

/** The exponent vector as the stage shows it: (L, T, M) = (2, 0, 0). */
export const dimVectorText = (d: Dim): string => `(L, T, M) = (${d.map(e => (e < 0 ? `−${-e}` : String(e))).join(', ')})`;

/** A quantity as plain text: `3 m`, `9 m²`, `2` (no unit). Value must be printable by the caller; this helper is for messages and tests. */
export const labelOf = (d: Dim): string => unitText(d) || 'a plain number';

// ------------------------------------------------------------------------------------------------ operations
const rationalResult = (r: Rational, dim: Dim): ResultQuantity => ({ value: { kind: 'rational', r }, dim });
const SYMBOL_OF: Record<BinaryOp, string> = { add: '+', subtract: '−', multiply: '×', divide: '÷' };

export function combine(op: BinaryOp, a: Quantity, b: Quantity): QuantityOutcome {
  const sym = SYMBOL_OF[op];
  if (op === 'add' || op === 'subtract') {
    if (!sameDim(a.dim, b.dim)) {
      return {
        ok: false,
        reason: `${labelOf(a.dim)} ${sym} ${labelOf(b.dim)} has no meaning: ${kindOf(a.dim)} and ${kindOf(b.dim)} are different kinds of quantity, so there is no common unit to ${op === 'add' ? 'add' : 'subtract'} in.`,
      };
    }
    const r = op === 'add' ? add(a.value, b.value) : sub(a.value, b.value);
    return { ok: true, result: rationalResult(r, a.dim), rule: `The units are identical (${labelOf(a.dim)}), so they carry over unchanged: only the numbers are ${op === 'add' ? 'added' : 'subtracted'}.` };
  }
  if (op === 'multiply') {
    const dim = addDim(a.dim, b.dim);
    return { ok: true, result: rationalResult(mul(a.value, b.value), dim), rule: `Multiplying adds the exponent vectors: ${dimVectorText(a.dim)} + ${dimVectorText(b.dim)} gives ${dimVectorText(dim)}${isDimensionless(dim) ? ', which is no unit at all' : `, that is ${unitText(dim)}`}.` };
  }
  if (isZero(b.value)) return { ok: false, reason: 'Dividing by a zero quantity is undefined, whatever its unit: no number multiplied by 0 gives a non-zero result.' };
  const dim = subDim(a.dim, b.dim);
  return { ok: true, result: rationalResult(div(a.value, b.value), dim), rule: `Dividing subtracts the exponent vectors: ${dimVectorText(a.dim)} − ${dimVectorText(b.dim)} gives ${dimVectorText(dim)}${isDimensionless(dim) ? ', which is no unit at all (a ratio)' : `, that is ${unitText(dim)}`}.` };
}

/** `a` raised to the integer power `k` (the value exactly, the dimension scaled). */
export function powerOf(a: Quantity, k: number): QuantityOutcome {
  const p = power(a.value, k);
  if (p.kind === 'undefined') return { ok: false, reason: p.reason };
  const dim = scaleDim(a.dim, k);
  return { ok: true, result: rationalResult(p.value, dim), rule: `Raising to the power ${k} multiplies every exponent by ${k}: ${dimVectorText(a.dim)} becomes ${dimVectorText(dim)}.` };
}

export function squareRootOf(a: Quantity): QuantityOutcome {
  if (a.value.num < 0n) {
    return { ok: false, reason: 'A square root of a negative value does not exist among the real numbers (no real number squares to a negative), whatever the unit.' };
  }
  if (!allEven(a.dim)) {
    return {
      ok: false,
      reason: `The square root of ${kindOf(a.dim)} is not a quantity of this model: halving the exponents ${dimVectorText(a.dim)} would leave a fractional exponent (for example m^½), and only whole-number exponents are used here. A square root keeps a genuine unit only when every exponent is even, as for m² or m²/s².`,
    };
  }
  const dim = scaleDim(a.dim, 0.5);
  const res = rootOf(a.value, 2);
  if (res.kind === 'undefined') return { ok: false, reason: res.reason };
  const rule = `Taking a square root halves every exponent: ${dimVectorText(a.dim)} becomes ${dimVectorText(dim)}. (It can only be done when every exponent is even.)`;
  if (res.kind === 'numeric') return { ok: false, reason: res.reason };
  const root = res.root;
  const value: ResultValue = root.b === 1n ? { kind: 'rational', r: rational(root.a, root.c) } : { kind: 'root', root, approx: res.approx };
  return { ok: true, result: { value, dim }, rule };
}

/** Apply any operation of the stage. `b` is ignored by the unary ones. */
export function applyOp(op: Op, a: Quantity, b: Quantity): QuantityOutcome {
  if (isBinary(op)) return combine(op, a, b);
  return op === 'square' ? powerOf(a, 2) : squareRootOf(a);
}

export const equalResult = (x: ResultQuantity, y: ResultQuantity): boolean =>
  sameDim(x.dim, y.dim) && x.value.kind === 'rational' && y.value.kind === 'rational' && eq(x.value.r, y.value.r);
