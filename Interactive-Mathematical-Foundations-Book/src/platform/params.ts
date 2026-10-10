/**
 * Parameter declarations (master plan §6.5).
 *
 * A control is not "an <input>": it is a declared mathematical parameter. The declaration states the
 * symbol, unit, domain, default, step, display precision and — crucially — what happens on invalid input.
 * Controls must not silently repair a value into something the learner did not ask for.
 */
import { MINUS, formatGiven } from './numeric/format';

export interface ParamSpec {
  readonly id: string;
  /** Plain-language name used for the accessible label. */
  readonly name: string;
  /** LaTeX for the symbol. */
  readonly symbolTex: string;
  /** Plain-text symbol for places where LaTeX is unavailable (aria-labels). */
  readonly symbolText: string;
  readonly unit?: string;
  readonly domain: { readonly min: number; readonly max: number };
  readonly default: number;
  /** Increment for steppers and arrow keys. */
  readonly step: number;
  /** Declared maximum number of decimal places an accepted value may have; finer input is REJECTED, never rounded. */
  readonly maxDecimals?: number;
  /** Invalid input is rejected with a message; the model does not change. */
  readonly onInvalid: 'reject';
}

export type ParseResult = { readonly ok: true; readonly value: number } | { readonly ok: false; readonly reason: string };

const DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

export function describeDomain(spec: ParamSpec): string {
  return `${formatGiven(spec.domain.min).text} to ${formatGiven(spec.domain.max).text}`;
}

/** Parse text a learner typed. Accepts "−2" (U+2212) as well as "-2"; rejects anything that is not a plain decimal. */
export function parseParam(spec: ParamSpec, raw: string): ParseResult {
  const text = raw.trim().replace(new RegExp(MINUS, 'g'), '-');
  if (text === '') return { ok: false, reason: `Enter a number for ${spec.symbolText}.` };
  if (!DECIMAL.test(text)) return { ok: false, reason: `${spec.symbolText} must be a plain number such as 2 or −1.5.` };
  const value = Number(text);
  if (!Number.isFinite(value)) return { ok: false, reason: `${spec.symbolText} must be a finite number.` };
  if (value < spec.domain.min || value > spec.domain.max) {
    return { ok: false, reason: `${spec.symbolText} must be between ${describeDomain(spec).replace(' to ', ' and ')}.` };
  }
  if (spec.maxDecimals !== undefined && Number(value.toFixed(spec.maxDecimals)) !== value) {
    return { ok: false, reason: `${spec.symbolText} can have at most ${spec.maxDecimals} decimal places.` };
  }
  return { ok: true, value: value + 0 }; // `+ 0` normalises −0
}

/** How a draggable value is restricted to a grid. */
export type Grid = { readonly kind: 'lattice'; readonly step: number } | { readonly kind: 'free' };

/** Digits needed to write a multiple of `step` without floating-point noise. */
const decimalsOf = (step: number): number => Math.max(0, Math.min(10, Math.ceil(-Math.log10(step) - 1e-9)));

/** Snap to the grid. Lattice results are the double nearest the decimal value (23·0.1 → 2.3, not 2.3000000000000003). */
export function snapToGrid(value: number, grid: Grid): number {
  if (grid.kind === 'free') return Number(value.toFixed(6)) + 0;
  return Number((Math.round(value / grid.step) * grid.step).toFixed(decimalsOf(grid.step))) + 0;
}

export function clampToDomain(value: number, domain: { readonly min: number; readonly max: number }): number {
  return Math.min(domain.max, Math.max(domain.min, value));
}

/** One keyboard step: `direction` is −1 or +1; `coarse` multiplies the step (Shift). Result is snapped and clamped. */
export function stepValue(value: number, direction: -1 | 1, spec: ParamSpec, grid: Grid, coarse: boolean): number {
  const base = grid.kind === 'lattice' ? grid.step : spec.step;
  const moved = value + direction * base * (coarse ? 5 : 1);
  return clampToDomain(snapToGrid(moved, grid), spec.domain);
}
