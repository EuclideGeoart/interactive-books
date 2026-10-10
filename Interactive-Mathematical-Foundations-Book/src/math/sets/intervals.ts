/**
 * Intervals on the real line with EXACT rational endpoints (chapter I.7).
 *
 * An `Interval` is a non-empty set {x : lo ≤ x ≤ hi} whose ends are each open or closed; an infinite end (`null`) is always open.
 * An `IntervalSet` is a NORMALISED list of such intervals: sorted, pairwise disjoint, and with no two pieces that could be merged
 * (so (0,1) ∪ (1,2) is two pieces, because 1 belongs to neither, while [0,1) ∪ [1,2] is the single piece [0,2]). The empty set is the empty list.
 *
 * Decision on reversed endpoints: an interval specified with lo > hi is NOT rejected; it is the empty set, with a reason (see `emptyReason`).
 * Every operation returns a normalised set, and `contains` decides membership exactly, with a reason.
 */
import { compare, equals, rationalForm, type Rat } from '../families/rational';

export type Endpoint = Rat | null;

export interface Interval {
  readonly lo: Endpoint;
  readonly hi: Endpoint;
  readonly loClosed: boolean;
  readonly hiClosed: boolean;
}
export type IntervalSet = readonly Interval[];

/** An interval as entered: any ends, in any order. */
export interface IntervalSpec { readonly lo: Endpoint; readonly hi: Endpoint; readonly loClosed: boolean; readonly hiClosed: boolean }

export const EMPTY: IntervalSet = Object.freeze([]);
export const WHOLE_LINE: IntervalSet = Object.freeze([Object.freeze({ lo: null, hi: null, loClosed: false, hiClosed: false })]);

// ---------------------------------------------------------------------------------------------- endpoint order
/** Compare two LOWER ends (−∞ is smallest). */
const cmpLo = (a: Endpoint, b: Endpoint): number => (a === null ? (b === null ? 0 : -1) : b === null ? 1 : compare(a, b));
/** Compare two UPPER ends (+∞ is largest). */
const cmpHi = (a: Endpoint, b: Endpoint): number => (a === null ? (b === null ? 0 : 1) : b === null ? -1 : compare(a, b));
/** Compare a lower end with an upper end (for emptiness: lo vs hi). Infinite ends never make an interval empty. */
const loVsHi = (lo: Endpoint, hi: Endpoint): number => (lo === null || hi === null ? -1 : compare(lo, hi));

const make = (lo: Endpoint, hi: Endpoint, loClosed: boolean, hiClosed: boolean): Interval | null => {
  const lc = lo !== null && loClosed;
  const hc = hi !== null && hiClosed;
  const order = loVsHi(lo, hi);
  if (order > 0) return null;
  if (order === 0 && !(lc && hc)) return null;
  return Object.freeze({ lo, hi, loClosed: lc, hiClosed: hc });
};

/** The set denoted by an interval specification: one piece, or the empty set (with `emptyReason` saying why). */
export function fromSpec(spec: IntervalSpec): IntervalSet {
  const piece = make(spec.lo, spec.hi, spec.loClosed, spec.hiClosed);
  return piece ? Object.freeze([piece]) : EMPTY;
}

/** Why a specification denotes the empty set, or `null` when it does not. */
export function emptyReason(spec: IntervalSpec): string | null {
  if (spec.lo === null || spec.hi === null) return null;
  const order = compare(spec.lo, spec.hi);
  if (order > 0) return 'the left end is greater than the right end, so no number is both at least the left end and at most the right end';
  if (order === 0 && !(spec.loClosed && spec.hiClosed)) return 'both ends are the same number and at least one is open, so that number is excluded and nothing else remains';
  return null;
}

// ---------------------------------------------------------------------------------------------- normal form
/** Do two pieces, with `a` starting no later than `b`, overlap or touch so that their union is one interval? */
function joins(a: Interval, b: Interval): boolean {
  if (a.hi === null || b.lo === null) return true;
  const order = compare(b.lo, a.hi);
  if (order < 0) return true;
  if (order === 0) return a.hiClosed || b.loClosed;
  return false;
}

export function normalise(pieces: readonly Interval[]): IntervalSet {
  const sorted = [...pieces].sort((p, q) => cmpLo(p.lo, q.lo) || (p.loClosed === q.loClosed ? 0 : p.loClosed ? -1 : 1));
  const out: Interval[] = [];
  for (const piece of sorted) {
    const last = out[out.length - 1];
    if (last && joins(last, piece)) {
      const c = cmpHi(piece.hi, last.hi);
      const hi = c > 0 ? piece.hi : last.hi;
      const hiClosed = c > 0 ? piece.hiClosed : c < 0 ? last.hiClosed : last.hiClosed || piece.hiClosed;
      out[out.length - 1] = Object.freeze({ lo: last.lo, hi, loClosed: last.loClosed, hiClosed });
    } else out.push(piece);
  }
  return Object.freeze(out);
}

export const union = (a: IntervalSet, b: IntervalSet): IntervalSet => normalise([...a, ...b]);

export function intersect(a: IntervalSet, b: IntervalSet): IntervalSet {
  const pieces: Interval[] = [];
  for (const p of a) for (const q of b) {
    const lc = cmpLo(p.lo, q.lo);
    const lo = lc >= 0 ? p.lo : q.lo;
    const loClosed = lc > 0 ? p.loClosed : lc < 0 ? q.loClosed : p.loClosed && q.loClosed;
    const hc = cmpHi(p.hi, q.hi);
    const hi = hc <= 0 ? p.hi : q.hi;
    const hiClosed = hc < 0 ? p.hiClosed : hc > 0 ? q.hiClosed : p.hiClosed && q.hiClosed;
    const piece = make(lo, hi, loClosed, hiClosed);
    if (piece) pieces.push(piece);
  }
  return normalise(pieces);
}

/** The elements of `a` that are not in `b`: a ∩ bᶜ. */
export const difference = (a: IntervalSet, b: IntervalSet): IntervalSet => intersect(a, complement(b));

/** The complement within ℝ. */
export function complement(a: IntervalSet): IntervalSet {
  if (a.length === 0) return WHOLE_LINE;
  const out: Interval[] = [];
  const first = a[0]!;
  if (first.lo !== null) { const head = make(null, first.lo, false, !first.loClosed); if (head) out.push(head); }
  for (let i = 0; i + 1 < a.length; i++) {
    const gap = make(a[i]!.hi, a[i + 1]!.lo, !a[i]!.hiClosed, !a[i + 1]!.loClosed);
    if (gap) out.push(gap);
  }
  const last = a[a.length - 1]!;
  if (last.hi !== null) { const tail = make(last.hi, null, !last.hiClosed, false); if (tail) out.push(tail); }
  return Object.freeze(out);
}

export const isInterval = (a: IntervalSet): boolean => a.length <= 1;
export const isEmpty = (a: IntervalSet): boolean => a.length === 0;
export const isSinglePoint = (a: IntervalSet): boolean => a.length === 1 && a[0]!.lo !== null && a[0]!.hi !== null && equals(a[0]!.lo, a[0]!.hi);

export function equalSets(a: IntervalSet, b: IntervalSet): boolean {
  const same = (p: Endpoint, q: Endpoint) => (p === null || q === null ? p === q : equals(p, q));
  return a.length === b.length && a.every((p, i) => same(p.lo, b[i]!.lo) && same(p.hi, b[i]!.hi) && p.loClosed === b[i]!.loClosed && p.hiClosed === b[i]!.hiClosed);
}

// ---------------------------------------------------------------------------------------------- how two intervals meet
/**
 * How two sets of at most one piece each sit relative to each other, which decides whether their union is one interval:
 *   overlap       they share a point (the union is one interval)
 *   touch-joined  no common point, but they meet at an end that belongs to at least one of them (the union is one interval)
 *   touch-gap     they meet at an end that belongs to NEITHER: the union has a one-point hole
 *   apart         a gap of positive length separates them
 *   empty         at least one of the two is empty
 */
export type Junction =
  | { readonly kind: 'empty' }
  | { readonly kind: 'overlap' }
  | { readonly kind: 'touch-joined'; readonly at: Rat }
  | { readonly kind: 'touch-gap'; readonly at: Rat }
  | { readonly kind: 'apart' };

export function junction(a: IntervalSet, b: IntervalSet): Junction {
  if (a.length === 0 || b.length === 0) return { kind: 'empty' };
  if (a.length > 1 || b.length > 1) throw new RangeError('junction compares sets of at most one piece each');
  if (intersect(a, b).length > 0) return { kind: 'overlap' };
  const p = a[0]!;
  const q = b[0]!;
  const meets = (left: Interval, right: Interval): Junction | null => {
    if (left.hi === null || right.lo === null || !equals(left.hi, right.lo)) return null;
    return left.hiClosed || right.loClosed ? { kind: 'touch-joined', at: left.hi } : { kind: 'touch-gap', at: left.hi };
  };
  return meets(p, q) ?? meets(q, p) ?? { kind: 'apart' };
}

// ---------------------------------------------------------------------------------------------- membership with a reason
export interface Membership {
  readonly member: boolean;
  readonly kind:
    | 'inside'            // strictly between the ends of a piece
    | 'closed-end'        // equals an end that is closed
    | 'open-end'          // equals an end that is open (excluded)
    | 'gap'               // between two pieces (or an excluded point shared by two open ends)
    | 'left-of-all'
    | 'right-of-all'
    | 'empty-set';
  /** The piece that decides it (the one containing x, or the nearest one when x is excluded). */
  readonly piece: Interval | null;
  /** For 'open-end' / 'closed-end': which end of `piece`. */
  readonly end: 'left' | 'right' | null;
  /** For a gap: the piece before and the piece after. */
  readonly before: Interval | null;
  readonly after: Interval | null;
}

const NONE = { piece: null, end: null, before: null, after: null } as const;

export function membership(set: IntervalSet, x: Rat): Membership {
  if (set.length === 0) return { member: false, kind: 'empty-set', ...NONE };
  for (let i = 0; i < set.length; i++) {
    const piece = set[i]!;
    const l = piece.lo === null ? 1 : compare(x, piece.lo);
    const h = piece.hi === null ? -1 : compare(x, piece.hi);
    if (l > 0 && h < 0) return { member: true, kind: 'inside', ...NONE, piece };
    if (l === 0) {
      if (piece.loClosed) return { member: true, kind: 'closed-end', ...NONE, piece, end: 'left' };
      const before = set[i - 1] && set[i - 1]!.hi !== null && equals(set[i - 1]!.hi!, x) ? set[i - 1]! : null;
      return { member: false, kind: 'open-end', ...NONE, piece, end: 'left', before };
    }
    if (h === 0) {
      if (piece.hiClosed) return { member: true, kind: 'closed-end', ...NONE, piece, end: 'right' };
      const after = set[i + 1] && set[i + 1]!.lo !== null && equals(set[i + 1]!.lo!, x) ? set[i + 1]! : null;
      return { member: false, kind: 'open-end', ...NONE, piece, end: 'right', after };
    }
  }
  const first = set[0]!;
  const last = set[set.length - 1]!;
  if (first.lo !== null && compare(x, first.lo) < 0) return { member: false, kind: 'left-of-all', ...NONE, after: first };
  if (last.hi !== null && compare(x, last.hi) > 0) return { member: false, kind: 'right-of-all', ...NONE, before: last };
  for (let i = 0; i + 1 < set.length; i++) {
    if (compare(x, set[i]!.hi!) > 0 && compare(x, set[i + 1]!.lo!) < 0) return { member: false, kind: 'gap', ...NONE, before: set[i]!, after: set[i + 1]! };
  }
  throw new Error('unreachable: every real number is inside, on an end of, or outside a normalised interval set');
}

export const contains = (set: IntervalSet, x: Rat): boolean => membership(set, x).member;

// ---------------------------------------------------------------------------------------------- text
const num = (r: Rat) => rationalForm(r);
const endText = (e: Endpoint, side: 'lo' | 'hi'): string => (e === null ? (side === 'lo' ? '−∞' : '∞') : num(e).text);
const endTex = (e: Endpoint, side: 'lo' | 'hi'): string => (e === null ? (side === 'lo' ? '-\\infty' : '\\infty') : num(e).tex);

export function pieceText(p: Interval): string {
  if (p.lo !== null && p.hi !== null && equals(p.lo, p.hi)) return `{${num(p.lo).text}}`;
  if (p.lo === null && p.hi === null) return 'ℝ';
  return `${p.loClosed ? '[' : '('}${endText(p.lo, 'lo')}, ${endText(p.hi, 'hi')}${p.hiClosed ? ']' : ')'}`;
}
export function pieceTex(p: Interval): string {
  if (p.lo !== null && p.hi !== null && equals(p.lo, p.hi)) return `\\{${num(p.lo).tex}\\}`;
  if (p.lo === null && p.hi === null) return '\\mathbb{R}';
  return `${p.loClosed ? '[' : '('}${endTex(p.lo, 'lo')},\\,${endTex(p.hi, 'hi')}${p.hiClosed ? ']' : ')'}`;
}
export function pieceSpoken(p: Interval): string {
  const spokenEnd = (e: Endpoint, side: 'lo' | 'hi') => (e === null ? (side === 'lo' ? 'minus infinity' : 'infinity') : num(e).spoken);
  if (p.lo !== null && p.hi !== null && equals(p.lo, p.hi)) return `the single point ${num(p.lo).spoken}`;
  if (p.lo === null && p.hi === null) return 'all real numbers';
  return `from ${spokenEnd(p.lo, 'lo')}, ${p.loClosed ? 'included' : 'excluded'}, to ${spokenEnd(p.hi, 'hi')}, ${p.hiClosed ? 'included' : 'excluded'}`;
}

export const setText = (s: IntervalSet): string => (s.length === 0 ? '∅' : s.map(pieceText).join(' ∪ '));
export const setTex = (s: IntervalSet): string => (s.length === 0 ? '\\varnothing' : s.map(pieceTex).join('\\cup '));
export const setSpoken = (s: IntervalSet): string => (s.length === 0 ? 'the empty set' : s.map(pieceSpoken).join(', and '));

/** The interval specification as typed, e.g. "[1, 1]" or "(0, 5)" (before normalisation). */
export const specText = (s: IntervalSpec): string => `${s.loClosed && s.lo !== null ? '[' : '('}${endText(s.lo, 'lo')}, ${endText(s.hi, 'hi')}${s.hiClosed && s.hi !== null ? ']' : ')'}`;
export const specTex = (s: IntervalSpec): string => `${s.loClosed && s.lo !== null ? '[' : '('}${endTex(s.lo, 'lo')},\\,${endTex(s.hi, 'hi')}${s.hiClosed && s.hi !== null ? ']' : ')'}`;
