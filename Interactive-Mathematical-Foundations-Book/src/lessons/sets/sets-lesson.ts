/**
 * Lesson views for the finite-sets stage: a Venn diagram inside the universe U = {1, …, 12}, the result of one chosen operation, the
 * subset facts, and the two identities that always hold (inclusion–exclusion and De Morgan).
 *
 *   SetsState → deriveSets → { Venn layout · inspector rows · facts · identity formulas · verdict · spoken text }
 *
 * The mathematics is `deriveSets`'; this module only arranges it. The diagram is schematic (areas are not to scale) and says so.
 */
import type { InspectorRowData } from '../../ui/Inspector';
import {
  CANONICAL_SETS, SET_OPS, UNIVERSE, deriveSets, hasItem, maskOf, toggleItem,
  type SetOp, type SetsDerived, type SetsState,
} from '../../math/sets/finite';
import { braces, countDescription, plural, setDescription } from './view';

export { CANONICAL_SETS, deriveSets, hasItem, toggleItem };
export type { SetOp, SetsDerived, SetsState };

export interface OpInfo { readonly id: SetOp; readonly label: string; readonly tex: string; readonly name: string; readonly aria: string; readonly regions: readonly Region[] }
export type Region = 'onlyA' | 'both' | 'onlyB' | 'neither';

/** Which of the four Venn regions an operation selects (presentation of the picture; `selectedMatchesRegions` is tested against the model). */
export const OPS: readonly OpInfo[] = Object.freeze(([
  { id: 'union', label: 'A ∪ B', tex: 'A\\cup B', name: 'union', aria: 'A union B: in A, in B, or in both', regions: ['onlyA', 'both', 'onlyB'] },
  { id: 'intersection', label: 'A ∩ B', tex: 'A\\cap B', name: 'intersection', aria: 'A intersect B: in both A and B', regions: ['both'] },
  { id: 'a-minus-b', label: 'A \\ B', tex: 'A\\setminus B', name: 'A minus B', aria: 'A minus B: in A but not in B', regions: ['onlyA'] },
  { id: 'b-minus-a', label: 'B \\ A', tex: 'B\\setminus A', name: 'B minus A', aria: 'B minus A: in B but not in A', regions: ['onlyB'] },
  { id: 'symmetric', label: 'A △ B', tex: 'A\\mathbin{\\triangle}B', name: 'symmetric difference', aria: 'symmetric difference: in exactly one of A and B', regions: ['onlyA', 'onlyB'] },
  { id: 'complement-a', label: 'U \\ A', tex: 'U\\setminus A', name: 'complement of A relative to U', aria: 'U minus A: everything in the universe that is not in A', regions: ['onlyB', 'neither'] },
  { id: 'complement-b', label: 'U \\ B', tex: 'U\\setminus B', name: 'complement of B relative to U', aria: 'U minus B: everything in the universe that is not in B', regions: ['onlyA', 'neither'] },
] as OpInfo[]).map(o => Object.freeze(o)));
export const opInfo = (id: SetOp): OpInfo => OPS.find(o => o.id === id)!;
export const OP_IDS: readonly SetOp[] = SET_OPS;

export interface SetsPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: SetsState }
const preset = (id: string, label: string, aria: string, a: readonly number[], b: readonly number[], op: SetOp): SetsPreset =>
  Object.freeze({ id, label, aria, state: Object.freeze({ a: maskOf(a), b: maskOf(b), op }) });
export const SETS_PRESETS: readonly SetsPreset[] = Object.freeze([
  preset('overlap', 'overlapping', 'A and B overlap: A is 1 to 5 and B is 4 to 7', [1, 2, 3, 4, 5], [4, 5, 6, 7], 'union'),
  preset('subset', 'A inside B', 'A is a proper subset of B', [2, 3], [1, 2, 3, 4], 'a-minus-b'),
  preset('disjoint', 'disjoint', 'A and B share no element: the odd numbers and the even numbers', [1, 3, 5, 7, 9, 11], [2, 4, 6, 8, 10, 12], 'intersection'),
  preset('equal', 'A = B', 'A and B are the same set', [3, 6, 9], [9, 6, 3], 'symmetric'),
  preset('empty', 'A empty', 'A is the empty set', [], [2, 4, 6], 'complement-a'),
  preset('all', 'B is all of U', 'B is the whole universe', [1, 2, 3], [...UNIVERSE], 'complement-b'),
]);
export const presetMatches = (s: SetsState, p: SetsPreset): boolean => s.a === p.state.a && s.b === p.state.b && s.op === p.state.op;

// ---------------------------------------------------------------------------------------------- Venn layout
export const VENN = Object.freeze({ width: 400, height: 280, ax: 150, bx: 250, cy: 140, r: 100, token: 12 });
export interface VennToken { readonly element: number; readonly region: Region; readonly x: number; readonly y: number; readonly selected: boolean }

const CENTRE: Record<Exclude<Region, 'neither'>, number> = { onlyA: 100, both: 200, onlyB: 300 };
/** Tokens in a 3-column grid centred on the region's axis (inside the crescents and the lens), and in two rows at the top and bottom for "neither". */
export function vennTokens(d: SetsDerived): VennToken[] {
  const out: VennToken[] = [];
  const chosen = new Set(d.selected);
  for (const region of ['onlyA', 'both', 'onlyB'] as const) {
    const items = d.regions[region];
    const rows = Math.ceil(items.length / 3);
    items.forEach((element, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const inRow = row === rows - 1 ? items.length - 3 * row : 3;
      const x = CENTRE[region] + (col - (Math.min(inRow, 3) - 1) / 2) * 26;
      const y = VENN.cy + (row - (rows - 1) / 2) * 28;
      out.push({ element, region, x, y, selected: chosen.has(element) });
    });
  }
  d.regions.neither.forEach((element, i) => {
    const row = i % 2; // alternate the top and bottom rows
    const col = Math.floor(i / 2);
    out.push({ element, region: 'neither', x: 70 + col * 30, y: row === 0 ? 20 : VENN.height - 18, selected: chosen.has(element) });
  });
  return out.sort((p, q) => p.element - q.element);
}

/** Do the regions an operation highlights contain exactly the elements the model says the operation gives? */
export function selectedMatchesRegions(d: SetsDerived): boolean {
  const info = opInfo(d.state.op);
  const fromRegions = info.regions.flatMap(r => [...d.regions[r]]).sort((x, y) => x - y);
  return fromRegions.length === d.selected.length && fromRegions.every((v, i) => v === d.selected[i]);
}

// ---------------------------------------------------------------------------------------------- readout
export function setsRows(d: SetsDerived): InspectorRowData[] {
  const info = opInfo(d.state.op);
  return [
    { id: 'size-a', role: 'x', symbolTex: '\\lvert A\\rvert', name: 'elements in A', description: countDescription(d.A.length) },
    { id: 'size-b', role: 'y', symbolTex: '\\lvert B\\rvert', name: 'elements in B', description: countDescription(d.B.length) },
    { id: 'result', role: 'primary', symbolTex: info.tex, name: info.name, description: setDescription(d.selected) },
    { id: 'size-result', role: 'primary', symbolTex: `\\lvert ${info.tex}\\rvert`, name: 'elements in the result', description: countDescription(d.selected.length), secondary: true },
  ];
}

export interface Fact { readonly id: string; readonly claim: string; readonly holds: boolean; readonly why: string }
export function setsFacts(d: SetsDerived): Fact[] {
  const subset = (id: string, claim: string, fact: SetsDerived['subsetAB'], from: string, to: string): Fact => ({
    id, claim, holds: fact.holds,
    why: fact.holds ? `every element of ${from} is also in ${to}` : `${fact.witness} is in ${from} but not in ${to}`,
  });
  return [
    subset('a-in-b', 'A ⊆ B', d.subsetAB, 'A', 'B'),
    subset('b-in-a', 'B ⊆ A', d.subsetBA, 'B', 'A'),
    { id: 'equal', claim: 'A = B', holds: d.equal, why: d.equal ? 'each is a subset of the other' : d.subsetAB.holds || d.subsetBA.holds ? 'one is a proper subset of the other' : 'neither contains the other' },
    { id: 'disjoint', claim: 'A ∩ B = ∅', holds: d.disjoint, why: d.disjoint ? 'A and B have no element in common' : `${plural(d.intersection.length, 'element')} in common: ${braces(d.intersection).text}` },
  ];
}

export interface IdentityFormula { readonly id: string; readonly label: string; readonly tex: string }
export function setsFormulas(d: SetsDerived): IdentityFormula[] {
  const w = (items: readonly number[]) => braces(items).tex;
  const ie = d.inclusionExclusion;
  const { deMorgan: m } = d;
  return [
    {
      id: 'inclusion-exclusion', label: 'Counting the union, scrollable',
      tex: `\\lvert A\\cup B\\rvert=${ie.direct}\\quad\\text{and}\\quad \\lvert A\\rvert+\\lvert B\\rvert-\\lvert A\\cap B\\rvert=${d.A.length}+${d.B.length}-${d.intersection.length}=${ie.formula}`,
    },
    {
      id: 'de-morgan-union', label: 'First De Morgan law, scrollable',
      tex: `U\\setminus(A\\cup B)=${w(m.unionComplement)}\\quad\\text{and}\\quad (U\\setminus A)\\cap(U\\setminus B)=${w(m.complementsIntersection)}`,
    },
    {
      id: 'de-morgan-intersection', label: 'Second De Morgan law, scrollable',
      tex: `U\\setminus(A\\cap B)=${w(m.intersectionComplement)}\\quad\\text{and}\\quad (U\\setminus A)\\cup(U\\setminus B)=${w(m.complementsUnion)}`,
    },
  ];
}

export function setsVerdict(d: SetsDerived): string {
  const info = opInfo(d.state.op);
  const r = braces(d.selected).text;
  const count = plural(d.selected.length, 'element');
  switch (d.state.op) {
    case 'union': return `A ∪ B = ${r}: everything that is in A, in B, or in both. It has ${count}.`;
    case 'intersection': return d.selected.length === 0 ? 'A ∩ B = ∅: A and B have nothing in common (they are disjoint).' : `A ∩ B = ${r}: only what is in both. It has ${count}.`;
    case 'a-minus-b': return `A \\ B = ${r}: what is in A and not in B. It has ${count}.`;
    case 'b-minus-a': return `B \\ A = ${r}: what is in B and not in A. It has ${count}.`;
    case 'symmetric': return `A △ B = ${r}: what is in exactly one of the two. It has ${count}.`;
    default: return `${info.label} = ${r}: a complement is always taken relative to the universe U = {1, 2, …, 12}; without U it has no meaning. It has ${count}.`;
  }
}

export function setsDescription(d: SetsDerived): string {
  const info = opInfo(d.state.op);
  const part = (name: string, items: readonly number[]) => `${name}: ${items.length === 0 ? 'none' : items.join(', ')}.`;
  return [
    'A Venn diagram inside the universe U, the numbers 1 to 12, with two overlapping circles A and B.',
    part('Only in A', d.regions.onlyA), part('In both', d.regions.both), part('Only in B', d.regions.onlyB), part('In neither', d.regions.neither),
    `Highlighted: ${info.name}, ${braces(d.selected).text}.`,
    'The picture is schematic: the areas are not to scale.',
  ].join(' ');
}

export function setsSpoken(d: SetsDerived): string {
  const info = opInfo(d.state.op);
  return `${info.name} is ${braces(d.selected).spoken}, with ${plural(d.selected.length, 'element')}. ${d.subsetAB.holds ? 'A is a subset of B.' : 'A is not a subset of B.'} ${d.disjoint ? 'A and B are disjoint.' : ''}`.trim();
}

export function chipLabel(set: 'A' | 'B', element: number, member: boolean): string {
  return `${element} ${member ? 'is in' : 'is not in'} ${set}. Press to ${member ? 'remove it from' : 'add it to'} ${set}.`;
}
