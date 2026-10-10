/**
 * Lesson views for the intervals stage: two intervals A and B with endpoints that are each closed, open or missing (unbounded), one chosen
 * operation, and a test point x whose membership is explained.
 *
 *   IntervalsState → deriveIntervals → { number-line rows · inspector rows · membership reasons · formulas · verdict · spoken text }
 *
 * Every endpoint is an EXACT rational (a decimal the learner typed, with at most two places), so equality at an endpoint is a true
 * statement and never a floating-point accident. The mathematics is `src/math/sets/intervals`; this module only arranges it.
 */
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { exactDecimal, rationalForm, toNumber, type Rat } from '../../math/families/rational';
import {
  complement, difference, emptyReason, fromSpec, intersect, isSinglePoint, junction, membership, pieceText, setSpoken, setText, setTex, specTex, specText, union,
  type Interval, type IntervalSet, type IntervalSpec, type Junction, type Membership,
} from '../../math/sets/intervals';
import { plural, textDescription } from './view';

export type EndKind = 'closed' | 'open' | 'infinite';
export type IntervalOp = 'union' | 'intersection' | 'a-minus-b' | 'complement-a';
export const INTERVAL_OPS = ['union', 'intersection', 'a-minus-b', 'complement-a'] as const satisfies readonly IntervalOp[];

/** Flat and primitive: numbers and strings only. */
export interface IntervalsState {
  readonly a: number; readonly b: number; readonly aKind: EndKind; readonly bKind: EndKind;
  readonly c: number; readonly d: number; readonly cKind: EndKind; readonly dKind: EndKind;
  readonly x: number;
  readonly op: IntervalOp;
}
/** A = (0, 1), B = (1, 2) and the test point x = 1: the point that belongs to neither. */
export const CANONICAL_INTERVALS: IntervalsState = Object.freeze({ a: 0, b: 1, aKind: 'open', bKind: 'open', c: 1, d: 2, cKind: 'open', dKind: 'open', x: 1, op: 'union' } as const);

export const END_RANGE = Object.freeze({ min: -5, max: 5 });
export const DECIMALS = 2;
const param = (id: string, name: string, symbol: string, def: number): ParamSpec => ({ id, name, symbolTex: symbol, symbolText: symbol, domain: END_RANGE, default: def, step: 0.5, maxDecimals: DECIMALS, onInvalid: 'reject' });
export const A_PARAM = param('a', 'left end of A', 'a', 0);
export const B_PARAM = param('b', 'right end of A', 'b', 1);
export const C_PARAM = param('c', 'left end of B', 'c', 1);
export const D_PARAM = param('d', 'right end of B', 'd', 2);
export const X_PARAM = param('x', 'test point', 'x', 1);

export interface EndEditor {
  readonly set: 'A' | 'B';
  readonly side: 'left' | 'right';
  readonly valueKey: 'a' | 'b' | 'c' | 'd';
  readonly kindKey: 'aKind' | 'bKind' | 'cKind' | 'dKind';
  readonly spec: ParamSpec;
}
export const END_EDITORS: readonly EndEditor[] = Object.freeze([
  { set: 'A', side: 'left', valueKey: 'a', kindKey: 'aKind', spec: A_PARAM },
  { set: 'A', side: 'right', valueKey: 'b', kindKey: 'bKind', spec: B_PARAM },
  { set: 'B', side: 'left', valueKey: 'c', kindKey: 'cKind', spec: C_PARAM },
  { set: 'B', side: 'right', valueKey: 'd', kindKey: 'dKind', spec: D_PARAM },
]);

export const END_OPTIONS: Record<'left' | 'right', readonly { id: EndKind; label: string }[]> = {
  left: [{ id: 'closed', label: '[ closed' }, { id: 'open', label: '( open' }, { id: 'infinite', label: '−∞' }],
  right: [{ id: 'closed', label: 'closed ]' }, { id: 'open', label: 'open )' }, { id: 'infinite', label: '∞' }],
};

export interface OpInfo { readonly id: IntervalOp; readonly label: string; readonly tex: (a: string, b: string) => string; readonly name: string; readonly aria: string }
export const INTERVAL_OP_INFO: readonly OpInfo[] = Object.freeze([
  { id: 'union', label: 'A ∪ B', tex: (a, b) => `${a}\\cup ${b}`, name: 'union', aria: 'A union B: every number in A or in B' },
  { id: 'intersection', label: 'A ∩ B', tex: (a, b) => `${a}\\cap ${b}`, name: 'intersection', aria: 'A intersect B: every number in both' },
  { id: 'a-minus-b', label: 'A \\ B', tex: (a, b) => `${a}\\setminus ${b}`, name: 'A minus B', aria: 'A minus B: every number in A that is not in B' },
  { id: 'complement-a', label: 'ℝ \\ A', tex: a => `\\mathbb{R}\\setminus ${a}`, name: 'complement of A in the real line', aria: 'the complement of A: every real number not in A' },
] as OpInfo[]);
export const intervalOp = (id: IntervalOp): OpInfo => INTERVAL_OP_INFO.find(o => o.id === id)!;

export interface IntervalsPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: IntervalsState }
const P = (id: string, label: string, aria: string, s: Partial<IntervalsState>): IntervalsPreset => Object.freeze({ id, label, aria, state: Object.freeze({ ...CANONICAL_INTERVALS, ...s }) });
export const INTERVAL_PRESETS: readonly IntervalsPreset[] = Object.freeze([
  P('open-open', '(0,1) ∪ (1,2)', 'open 0 to 1 union open 1 to 2: two pieces', {}),
  P('closed-open', '[0,1] ∪ (1,2)', 'closed 0 to 1 union open 1 to 2: one piece', { aKind: 'closed', bKind: 'closed' }),
  P('touch-point', '[0,1] ∩ [1,2]', 'closed 0 to 1 intersect closed 1 to 2: one point', { aKind: 'closed', bKind: 'closed', cKind: 'closed', dKind: 'closed', op: 'intersection' }),
  P('touch-empty', '[0,1) ∩ [1,2]', 'half-open 0 to 1 intersect closed 1 to 2: empty', { aKind: 'closed', cKind: 'closed', dKind: 'closed', op: 'intersection' }),
  P('point-complement', 'ℝ \\ {1}', 'the complement of the single point 1: two rays', { a: 1, b: 1, aKind: 'closed', bKind: 'closed', op: 'complement-a' }),
  P('reversed', 'a > b', 'left end 3 and right end 1: the interval is empty', { a: 3, b: 1, aKind: 'closed', bKind: 'closed', c: 0, d: 5, cKind: 'open', dKind: 'open', x: 2 }),
  P('rays', 'two rays', 'the rays minus infinity to 1 and 1 to infinity, both open', { aKind: 'infinite', b: 1, c: 1, dKind: 'infinite' }),
  P('carve', '[0,5] \\ (2,3)', 'closed 0 to 5 minus open 2 to 3: two pieces', { a: 0, b: 5, aKind: 'closed', bKind: 'closed', c: 2, d: 3, cKind: 'open', dKind: 'open', op: 'a-minus-b', x: 2.5 }),
]);
export const intervalPresetMatches = (s: IntervalsState, p: IntervalsPreset): boolean => (Object.keys(CANONICAL_INTERVALS) as (keyof IntervalsState)[]).every(k => Object.is(s[k], p.state[k]));

// ---------------------------------------------------------------------------------------------- derive
export interface IntervalsDerived {
  readonly state: IntervalsState;
  readonly specA: IntervalSpec;
  readonly specB: IntervalSpec;
  readonly A: IntervalSet;
  readonly B: IntervalSet;
  readonly result: IntervalSet;
  readonly emptyA: string | null;
  readonly emptyB: string | null;
  readonly x: Rat;
  readonly inA: Membership;
  readonly inB: Membership;
  readonly inResult: Membership;
  readonly meet: Junction;
}

const end = (value: number, kind: EndKind): Rat | null => (kind === 'infinite' ? null : exactDecimal(value, DECIMALS));
export const specOf = (lo: number, hi: number, loKind: EndKind, hiKind: EndKind): IntervalSpec => ({ lo: end(lo, loKind), hi: end(hi, hiKind), loClosed: loKind === 'closed', hiClosed: hiKind === 'closed' });

export function deriveIntervals(state: IntervalsState): IntervalsDerived {
  const specA = specOf(state.a, state.b, state.aKind, state.bKind);
  const specB = specOf(state.c, state.d, state.cKind, state.dKind);
  const A = fromSpec(specA);
  const B = fromSpec(specB);
  const result = { union: () => union(A, B), intersection: () => intersect(A, B), 'a-minus-b': () => difference(A, B), 'complement-a': () => complement(A) }[state.op]();
  const x = exactDecimal(state.x, DECIMALS);
  return Object.freeze({
    state, specA, specB, A, B, result, emptyA: emptyReason(specA), emptyB: emptyReason(specB), x,
    inA: membership(A, x), inB: membership(B, x), inResult: membership(result, x), meet: junction(A, B),
  });
}

// ---------------------------------------------------------------------------------------------- number line
export const LINE_RANGE = Object.freeze({ min: -6, max: 6 });
export interface LinePiece { readonly lo: number | null; readonly hi: number | null; readonly loClosed: boolean; readonly hiClosed: boolean }
export interface LineRow { readonly id: 'a' | 'b' | 'result'; readonly label: string; readonly role: 'x' | 'y' | 'primary'; readonly pieces: readonly LinePiece[] }
const toPiece = (p: Interval): LinePiece => ({ lo: p.lo === null ? null : toNumber(p.lo), hi: p.hi === null ? null : toNumber(p.hi), loClosed: p.loClosed, hiClosed: p.hiClosed });

export function lineRows(d: IntervalsDerived): LineRow[] {
  return [
    { id: 'a', label: 'A', role: 'x', pieces: d.A.map(toPiece) },
    { id: 'b', label: 'B', role: 'y', pieces: d.B.map(toPiece) },
    { id: 'result', label: intervalOp(d.state.op).label, role: 'primary', pieces: d.result.map(toPiece) },
  ];
}

// ---------------------------------------------------------------------------------------------- text
const setLabel = (s: IntervalSet): string => setText(s);
const pointText = (r: Rat): string => rationalForm(r).text;

/** One sentence saying whether x is in a set, and why. */
export function membershipSentence(name: string, set: IntervalSet, m: Membership, x: Rat): string {
  const xs = pointText(x);
  const here = `${xs} ${m.member ? '∈' : '∉'} ${name}`;
  const piece = m.piece ? pieceText(m.piece) : '';
  switch (m.kind) {
    case 'inside': return `${here}: it lies strictly between the ends of ${piece}.`;
    case 'closed-end': return `${here}: it is the ${m.end} end of ${piece}, and that end is closed, so it is included.`;
    case 'open-end': {
      const other = m.end === 'left' ? m.before : m.after;
      const tail = other ? ` The neighbouring piece ${pieceText(other)} is also open at ${xs}, so ${xs} is a hole between them.` : '';
      return `${here}: it is the ${m.end} end of ${piece}, and that end is open, so it is excluded.${tail}`;
    }
    case 'gap': return `${here}: it lies in the gap between ${pieceText(m.before!)} and ${pieceText(m.after!)}.`;
    case 'left-of-all': return `${here}: it is to the left of every piece of ${setLabel(set)}.`;
    case 'right-of-all': return `${here}: it is to the right of every piece of ${setLabel(set)}.`;
    case 'empty-set': return `${here}: the empty set has no members at all.`;
  }
}

export function intervalRows(d: IntervalsDerived): InspectorRowData[] {
  const info = intervalOp(d.state.op);
  const row = (id: string, role: InspectorRowData['role'], symbolTex: string, name: string, set: IntervalSet, note?: string | null): InspectorRowData => ({
    id, role, symbolTex, name,
    description: { ...textDescription(setText(set), setTex(set), setSpoken(set)), ...(note ? { note } : {}) },
  });
  return [
    row('set-a', 'x', 'A', `interval A, typed as ${specText(d.specA)}`, d.A, d.emptyA ? `Empty: ${d.emptyA}.` : null),
    row('set-b', 'y', 'B', `interval B, typed as ${specText(d.specB)}`, d.B, d.emptyB ? `Empty: ${d.emptyB}.` : null),
    row('result', 'primary', info.tex('A', 'B'), info.name, d.result),
    { id: 'pieces', role: 'primary', symbolTex: '\\#', name: 'separate pieces in the result', description: textDescription(String(d.result.length), String(d.result.length), String(d.result.length)), secondary: true },
  ];
}

export function intervalFormulas(d: IntervalsDerived): { id: string; label: string; tex: string }[] {
  const info = intervalOp(d.state.op);
  const own = (s: IntervalSpec, set: IntervalSet) => `${specTex(s)}${set.length === 0 ? '=\\varnothing' : ''}`;
  const spec = `A=${own(d.specA, d.A)},\\qquad B=${own(d.specB, d.B)}`;
  const aTex = d.A.length ? setTex(d.A) : '\\varnothing';
  const bTex = d.B.length ? setTex(d.B) : '\\varnothing';
  const operation = `${info.tex(aTex, bTex)}=${setTex(d.result)}`;
  return [
    { id: 'spec', label: 'The two intervals, scrollable', tex: spec },
    { id: 'operation', label: 'The operation with numbers, scrollable', tex: operation },
  ];
}


export function intervalVerdict(d: IntervalsDerived): { text: string; caution: boolean } {
  const res = setText(d.result);
  const pieces = plural(d.result.length, 'piece');
  const meet = d.meet;
  const emptyNote = d.emptyA || d.emptyB ? ' (an interval whose ends are in the wrong order, or that excludes its only point, is the empty set)' : '';
  switch (d.state.op) {
    case 'union':
      if (meet.kind === 'empty') return { text: `At least one of A and B is empty${emptyNote}, so A ∪ B is just the other one: ${res}.`, caution: false };
      if (meet.kind === 'overlap') return { text: `A and B overlap, so A ∪ B is one interval: ${res}.`, caution: false };
      if (meet.kind === 'touch-joined') return { text: `A and B meet at ${pointText(meet.at)}, and that point belongs to one of them, so nothing is missing: A ∪ B is the single interval ${res}.`, caution: false };
      if (meet.kind === 'touch-gap') return { text: `A and B meet at ${pointText(meet.at)}, but that point belongs to neither (it is an open end of both), so it is missing: A ∪ B = ${res} has ${pieces}, with a one-point hole.`, caution: true };
      return { text: `A and B are separated by a gap, so A ∪ B = ${res} has ${pieces}. A union of intervals need not be an interval.`, caution: true };
    case 'intersection':
      if (d.result.length === 0) {
        if (meet.kind === 'empty') return { text: `A ∩ B = ∅ because at least one of A and B is empty${emptyNote}.`, caution: true };
        if (meet.kind === 'touch-gap') return { text: `A ∩ B = ∅: A and B meet at ${pointText(meet.at)}, but that point belongs to neither of them.`, caution: true };
        if (meet.kind === 'touch-joined') return { text: `A ∩ B = ∅: A and B meet at ${pointText(meet.at)}, but only one of them includes that point, so no number is in both.`, caution: true };
        return { text: 'A ∩ B = ∅: A and B are separated by a gap, so no number is in both.', caution: true };
      }
      return { text: isSinglePoint(d.result) ? `A ∩ B = ${res}: a single point, the end that both intervals include.` : `A ∩ B = ${res}: the numbers that are in both.`, caution: false };
    case 'a-minus-b':
      return { text: d.result.length === 0 ? `A \\ B = ∅: everything in A is also in B${emptyNote}.` : `A \\ B = ${res}: the numbers in A that are not in B. It has ${pieces}.`, caution: false };
    default:
      return { text: d.A.length === 0 ? `A is empty${emptyNote}, so its complement is the whole line ℝ.` : `ℝ \\ A = ${res}: every real number outside A. It has ${pieces}.`, caution: false };
  }
}

export function intervalDescription(d: IntervalsDerived): string {
  const info = intervalOp(d.state.op);
  return `A number line from −6 to 6 with three rows. A is ${setText(d.A)}. B is ${setText(d.B)}. ${info.name} is ${setText(d.result)}. A filled dot marks an included end, a hollow dot an excluded end, and an arrow an end that never stops. The test point is ${pointText(d.x)}.`;
}

export function intervalSpoken(d: IntervalsDerived): string {
  const info = intervalOp(d.state.op);
  return `${info.name} is ${setSpoken(d.result)}. The test point ${d.inResult.member ? 'is' : 'is not'} in the result.`;
}

export const withEnd = (s: IntervalsState, e: EndEditor, patch: { value?: number; kind?: EndKind }): IntervalsState => ({
  ...s, ...(patch.value !== undefined ? { [e.valueKey]: patch.value } : {}), ...(patch.kind !== undefined ? { [e.kindKey]: patch.kind } : {}),
});
