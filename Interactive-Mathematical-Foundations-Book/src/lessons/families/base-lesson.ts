/**
 * Lesson views for exponentials and logarithms with a chosen base, and for the CHECKED logarithm identities.
 *
 *   GrowthState   → deriveGrowth     → { curves, markers, rows, formulas, verdict }
 *   IdentityState → deriveIdentities → { four cards: statement, both sides, difference, tolerance, outcome }
 *
 * The identities are exact in mathematics; the cards show what a COMPUTER gets, with the difference and the tolerance in plain sight.
 */
import type { Point } from '../../platform/geometry/viewport';
import type { ParamSpec } from '../../platform/params';
import { formatApprox } from '../../platform/numeric/format';
import { describeValue, type Value } from '../../platform/numeric/quantity';
import type { InspectorRowData } from '../../ui/Inspector';
import {
  BASE_LABELS, CANONICAL_GROWTH, GROWTH_DECIMALS, deriveGrowth, sampleBase,
  type GrowthDerived, type GrowthState,
} from '../../math/families/growth';
import { CANONICAL_IDENTITY, IDENTITY_DECIMALS, deriveIdentities, type IdentityCheck, type IdentityDerived, type IdentityState } from '../../math/families/identities';
import { numberOf } from '../../math/families/families';
import { describeFamily, FORMAT } from './view';
import { SPOKEN_FORMAT, aligned, given } from '../shared/format';

export { CANONICAL_GROWTH, CANONICAL_IDENTITY, deriveGrowth, deriveIdentities, sampleBase };

export const GROWTH_WINDOW = Object.freeze({ xMin: -4, xMax: 8, yMin: -4, yMax: 8 });
export const BASE_OPTIONS = [{ id: 'half', label: '½' }, { id: 'two', label: '2' }, { id: 'e', label: 'e' }, { id: 'ten', label: '10' }, { id: 'custom', label: 'other' }] as const;

export const BASE_PARAM: ParamSpec = { id: 'b', name: 'base', symbolTex: 'b', symbolText: 'b', domain: { min: 0.01, max: 20 }, default: 3, step: 0.5, maxDecimals: GROWTH_DECIMALS, onInvalid: 'reject' };
export const GROWTH_X_PARAM: ParamSpec = { id: 'x', name: 'x', symbolTex: 'x', symbolText: 'x', domain: { min: -4, max: 8 }, default: 2, step: 0.5, maxDecimals: GROWTH_DECIMALS, onInvalid: 'reject' };
export const AXIS_Y: ParamSpec = { id: 'axis-y', name: 'height of the handle', symbolTex: 'y', symbolText: 'y', domain: { min: 0, max: 0 }, default: 0, step: 0.5, onInvalid: 'reject' };

export interface BasePreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: GrowthState }
export const GROWTH_PRESETS: readonly BasePreset[] = Object.freeze(([
  { id: 'doubling', label: 'doubling', aria: 'base 2: doubling', state: { preset: 'two', custom: 3, x: 3 } },
  { id: 'halving', label: 'halving', aria: 'base one half: halving', state: { preset: 'half', custom: 3, x: 3 } },
  { id: 'natural', label: 'natural', aria: 'base e: the natural exponential', state: { preset: 'e', custom: 3, x: 1 } },
  { id: 'decimal', label: 'powers of 10', aria: 'base 10', state: { preset: 'ten', custom: 3, x: 2 } },
  { id: 'one', label: 'base 1', aria: 'base 1: not an exponential function', state: { preset: 'custom', custom: 1, x: 2 } },
  { id: 'negative-x', label: 'log of x ≤ 0', aria: 'a logarithm of a negative number', state: { preset: 'two', custom: 3, x: -1 } },
] as BasePreset[]).map(p => Object.freeze({ ...p, state: Object.freeze(p.state) })));

export const baseTex = (s: GrowthState): string => (s.preset === 'custom' ? given(s.custom) : BASE_LABELS[s.preset].tex);
export const baseText = (s: GrowthState): string => (s.preset === 'custom' ? given(s.custom).replace(/\\/g, '') : BASE_LABELS[s.preset].text);

// ---------------------------------------------------------------------------------------------- scene
export interface GrowthMarkers { readonly power: Point | null; readonly log: Point | null }
const inWindow = (p: Point): boolean => p.x >= GROWTH_WINDOW.xMin && p.x <= GROWTH_WINDOW.xMax && p.y >= GROWTH_WINDOW.yMin && p.y <= GROWTH_WINDOW.yMax;
export function growthMarkers(d: GrowthDerived): GrowthMarkers {
  const x = d.state.x;
  const power = numberOf(d.power);
  const log = numberOf(d.logAtX);
  const p = power === null ? null : { x, y: power };
  const l = log === null ? null : { x, y: log };
  return { power: p && inWindow(p) ? p : null, log: l && inWindow(l) ? l : null };
}

export interface GrowthLabel { readonly at: Point; readonly dx: number; readonly dy: number; readonly anchor: 'start' | 'middle' | 'end'; readonly text: string }
/** Direct labels for the two curves, placed on the first candidate point comfortably inside the window; `null` when no candidate is (a base very near 1). */
export function growthLabels(base: number, kind: GrowthDerived['kind']): { readonly power: GrowthLabel | null; readonly log: GrowthLabel | null } {
  if (kind === 'constant') return { power: null, log: null };
  const w = GROWTH_WINDOW;
  const inside = (y: number) => Number.isFinite(y) && y >= w.yMin + 1 && y <= w.yMax - 1;
  const powerXs = base > 1 ? [7, 6, 5, 4, 3, 2] : [-3, -2, -1, 0, 1, 2];
  const px = powerXs.find(x => inside(base ** x) && base ** x > 1.5);
  const logXs = [7, 6, 5, 4, 3, 2.5, 2, 1.5];
  const lx = logXs.find(x => inside(Math.log(x) / Math.log(base)));
  return {
    power: px === undefined ? null : { at: { x: px, y: base ** px }, dx: -10, dy: -2, anchor: 'end', text: 'bˣ' },
    log: lx === undefined ? null : { at: { x: lx, y: Math.log(lx) / Math.log(base) }, dx: 0, dy: base > 1 ? 18 : -18, anchor: 'middle', text: 'log x' },
  };
}
export const growthDiagonal = (): readonly [Point, Point] => [{ x: GROWTH_WINDOW.xMin, y: GROWTH_WINDOW.xMin }, { x: GROWTH_WINDOW.xMax, y: GROWTH_WINDOW.xMax }];

// ---------------------------------------------------------------------------------------------- rows
const BASE_VALUE = (d: GrowthDerived): Value => (d.state.preset === 'e' ? { kind: 'exact', exact: { text: 'e', tex: 'e', spoken: 'e', integer: false, irrational: true }, approx: Math.E } : { kind: 'given', value: d.base });

export function growthRows(d: GrowthDerived): InspectorRowData[] {
  const bt = baseTex(d.state);
  const period = d.period.kind === 'none'
    ? describeValue({ kind: 'undefined', reason: d.period.reason }, FORMAT)
    : describeFamily(d.period.value);
  return [
    { id: 'base', role: 'ink', symbolTex: 'b', name: 'base', description: describeValue(BASE_VALUE(d), FORMAT) },
    { id: 'power', role: 'primary', symbolTex: `${bt}^{x}`, name: 'the power b to the x', description: describeFamily(d.power) },
    { id: 'log', role: 'derived', symbolTex: '\\log_b x', name: 'logarithm of x to the base b', description: describeFamily(d.logAtX) },
    { id: 'ln-base', role: 'ink', symbolTex: '\\ln b', name: 'natural logarithm of the base', description: describeFamily(d.lnBase), secondary: true },
    { id: 'period', role: 'y', symbolTex: d.period.kind === 'halving' ? 't_{1/2}' : 't_{2}', name: d.period.kind === 'halving' ? 'time to halve' : 'time to double', description: period },
    { id: 'bits', role: 'ink', symbolTex: '\\log_2 x', name: 'x in bits: log base 2', description: describeFamily(d.bits), secondary: true },
    { id: 'nats', role: 'ink', symbolTex: '\\ln x', name: 'x in nats: natural log', description: describeFamily(d.nats), secondary: true },
  ];
}

// ---------------------------------------------------------------------------------------------- text
export function growthVerdict(d: GrowthDerived): { text: string; caution: boolean } {
  if (d.kind === 'constant') return { text: 'b = 1 is not an exponential function: 1 to any power is 1, so the graph is flat, no input can be recovered from the output, and log base 1 does not exist.', caution: true };
  const nonPositive = d.logAtX.kind === 'undefined';
  const line = d.period.kind === 'none' ? null : describeFamily(d.period.value, FORMAT).lines[0]!;
  const every = line === null ? '' : `${line.relation === '=' ? '' : 'about '}every ${line.text} ${line.text === '1' ? 'unit' : 'units'}`;
  const behaviour = d.kind === 'growth' ? `b > 1: b^x grows, and doubles ${every} of x.` : `0 < b < 1: b^x shrinks, and halves ${every} of x.`;
  return {
    text: nonPositive ? `${behaviour} The logarithm of x does not exist here: x is not positive, and no power of a positive base is zero or negative.` : behaviour,
    caution: nonPositive,
  };
}

export function growthSpoken(d: GrowthDerived): string {
  return `Base ${baseText(d.state)}, x equals ${given(d.state.x)}. The power is ${describeFamily(d.power, SPOKEN_FORMAT).spoken}. The logarithm is ${describeFamily(d.logAtX, SPOKEN_FORMAT).spoken}.`;
}

export function growthDescription(d: GrowthDerived): string {
  const base = `Coordinate plane from −4 to 8 on both axes with the graphs of b to the x and the logarithm of x to the base b for b = ${baseText(d.state)}, and the dashed line y = x: the two graphs are mirror images across it.`;
  if (d.kind === 'constant') return `${base} For b = 1 the exponential graph is the flat line y = 1 and the logarithm graph does not exist.`;
  return `${base} At x = ${given(d.state.x)} the power is ${describeFamily(d.power, SPOKEN_FORMAT).spoken} and the logarithm is ${describeFamily(d.logAtX, SPOKEN_FORMAT).spoken}.`;
}

// ---------------------------------------------------------------------------------------------- formulas
const relTex = (v: Parameters<typeof describeFamily>[0]): { rel: string; tex: string } => {
  const line = describeFamily(v).lines[0]!;
  return { rel: line.relation === '=' ? '=' : '\\approx', tex: line.tex };
};

export function growthFormulas(d: GrowthDerived): string[] {
  const bt = baseTex(d.state);
  const xt = given(d.state.x);
  const p = relTex(d.power);
  const power = aligned([`b^{x}&=${bt}^{${xt}}`, `&${p.rel}${p.tex}`]);
  if (d.kind === 'constant') return [power, aligned([`\\log_b x&=\\dfrac{\\ln x}{\\ln b}=\\dfrac{\\ln x}{\\ln 1}=\\dfrac{\\ln x}{0}`, '&\\text{undefined: log base 1 does not exist}'])];
  if (d.logAtX.kind === 'undefined') {
    return [power, aligned([`\\log_b x&=\\dfrac{\\ln x}{\\ln b}=\\dfrac{\\ln(${xt})}{\\ln(${bt})}`, '&\\text{undefined: }x\\le 0'])];
  }
  const l = relTex(d.logAtX);
  const lnx = describeFamily(d.nats).lines[0]!.tex;
  const lnb = describeFamily(d.lnBase).lines[0]!.tex;
  const log = aligned([
    `\\log_b x&=\\dfrac{\\ln x}{\\ln b}=\\dfrac{\\ln(${xt})}{\\ln(${bt})}`,
    `&\\approx\\dfrac{${lnx}}{${lnb}}`,
    `&${l.rel}${l.tex}`,
  ]);
  return [power, log];
}
export const GROWTH_FORMULA_LABELS = ['The power', 'The logarithm by change of base'] as const;

// ---------------------------------------------------------------------------------------------- identities
export const IDENTITY_A: ParamSpec = { id: 'ia', name: 'first number', symbolTex: 'a', symbolText: 'a', domain: { min: -10, max: 1000 }, default: 6, step: 1, maxDecimals: IDENTITY_DECIMALS, onInvalid: 'reject' };
export const IDENTITY_B: ParamSpec = { id: 'ib', name: 'second number', symbolTex: 'b', symbolText: 'b', domain: { min: -10, max: 1000 }, default: 4, step: 1, maxDecimals: IDENTITY_DECIMALS, onInvalid: 'reject' };
export const IDENTITY_K: ParamSpec = { id: 'ik', name: 'exponent', symbolTex: 'k', symbolText: 'k', domain: { min: -20, max: 20 }, default: 3, step: 1, maxDecimals: IDENTITY_DECIMALS, onInvalid: 'reject' };

const SMALL: { digits: number; scientificAbove: number } = { digits: 3, scientificAbove: 1e6 };
const sci = (n: number): string => formatApprox(n, SMALL).text;

export interface IdentityCard {
  readonly id: IdentityCheck['id'];
  readonly statementTex: string;
  readonly status: IdentityCheck['status'];
  readonly within: boolean | null;
  readonly lines: readonly { readonly label: string; readonly text: string }[];
  readonly outcome: string;
}
const PLAIN: Record<IdentityCheck['id'], { lhs: string; rhs: string }> = {
  product: { lhs: 'ln(ab)', rhs: 'ln a + ln b' },
  power: { lhs: 'ln(aᵏ)', rhs: 'k · ln a' },
  'change-of-base': { lhs: 'a', rhs: 'b^(ln a / ln b)' },
  'bits-nats': { lhs: 'log₂ a', rhs: 'ln a / ln 2' },
};
export function identityCards(d: IdentityDerived): IdentityCard[] {
  return d.checks.map(c => {
    const names = PLAIN[c.id];
    if (c.status === 'undefined') {
      return { id: c.id, statementTex: c.statementTex, status: c.status, within: null, lines: [], outcome: `undefined: ${c.reason}` };
    }
    return {
      id: c.id,
      statementTex: c.statementTex,
      status: c.status,
      within: c.within,
      lines: [
        { label: `left side, ${names.lhs}`, text: `≈ ${formatApprox(c.lhs as number, FORMAT).text}` },
        { label: `right side, ${names.rhs}`, text: `≈ ${formatApprox(c.rhs as number, FORMAT).text}` },
        { label: 'difference, left − right', text: `≈ ${sci(c.difference as number)}` },
        { label: 'tolerance (a few units in the last place)', text: `≤ ${sci(c.tolerance as number)}` },
      ],
      outcome: c.within ? 'within tolerance: the two sides agree as far as a double can tell' : 'outside tolerance',
    };
  });
}

export function identitySpoken(d: IdentityDerived): string {
  const ok = d.checks.filter(c => c.within === true).length;
  const undef = d.checks.filter(c => c.status === 'undefined').length;
  return `${ok} of 4 identities checked and within tolerance${undef ? `, ${undef} undefined for these numbers` : ''}.`;
}

/** The four identities as one aligned display (symbols, not numbers: the cards carry the numbers). */
export function identityFormula(): string {
  const lines = [
    `\\ln(ab)&=\\ln a+\\ln b`,
    `\\ln(a^{k})&=k\\ln a`,
    `\\log_b a&=\\dfrac{\\ln a}{\\ln b}`,
    `\\log_2 a&=\\dfrac{\\ln a}{\\ln 2}`,
  ];
  return aligned(lines);
}

export type { GrowthState, IdentityState, GrowthDerived, IdentityDerived };
