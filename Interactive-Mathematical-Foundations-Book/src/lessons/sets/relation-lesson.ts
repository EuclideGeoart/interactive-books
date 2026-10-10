/**
 * Lesson views for the relations stage: a relation R ⊆ A × B drawn as a grid of toggles, the four properties a relation on ONE set can
 * have (with a witness when one fails), equivalence classes, and the test "is R a function A → B?".
 *
 *   RelationLessonState → deriveRelationLesson → { grid · highlighted witness cells · property list · inspector rows · verdict }
 *
 * The lesson state is flat and primitive (sizes, one cell string, the property whose witness is shown). The mathematics is
 * `src/math/sets/relations`.
 */
import type { InspectorRowData } from '../../ui/Inspector';
import {
  CANONICAL_RELATION, PRESET_TESTS, RELATION_MAX, deriveRelation, presetCells, presetState, resize, toggleCell,
  type PresetId, type RelationDerived, type RelationState,
} from '../../math/sets/relations';
import { braces, countDescription, plural, textDescription } from './view';

export { RELATION_MAX, deriveRelation, resize, toggleCell };
export type { PresetId, RelationDerived };

export type FocusId = 'none' | 'reflexive' | 'symmetric' | 'antisymmetric' | 'transitive';
export interface RelationLessonState extends RelationState { readonly focus: FocusId }
export const CANONICAL_RELATION_LESSON: RelationLessonState = Object.freeze({ ...CANONICAL_RELATION, focus: 'none' as FocusId });
export interface RelationLessonDerived { readonly d: RelationDerived; readonly focus: FocusId }
export const deriveRelationLesson = (s: RelationLessonState): RelationLessonDerived => ({ d: deriveRelation({ n: s.n, k: s.k, cells: s.cells }), focus: s.focus });

export const SIZE_OPTIONS = Object.freeze([1, 2, 3, 4, 5, 6].map(n => Object.freeze({ id: String(n), label: String(n) })));

export interface RelationPreset { readonly id: PresetId; readonly label: string; readonly aria: string; readonly tex: string }
export const RELATION_PRESETS: readonly RelationPreset[] = Object.freeze([
  { id: 'less', label: 'a < b', aria: 'a is less than b', tex: 'a<b' },
  { id: 'at-most', label: 'a ≤ b', aria: 'a is at most b', tex: 'a\\le b' },
  { id: 'equal', label: 'a = b', aria: 'a equals b', tex: 'a=b' },
  { id: 'divides', label: 'a divides b', aria: 'a divides b: b is a multiple of a', tex: 'a\\mid b' },
  { id: 'same-parity', label: 'same parity', aria: 'a and b are both odd or both even', tex: 'a\\equiv b\\pmod 2' },
  { id: 'empty', label: 'nothing', aria: 'no pair is related', tex: '\\varnothing' },
  { id: 'all', label: 'everything', aria: 'every pair is related', tex: 'A\\times B' },
].map(p => Object.freeze(p as RelationPreset)));
export const applyPreset = (s: RelationLessonState, id: PresetId): RelationLessonState => ({ ...s, cells: presetState(id, s.n, s.k).cells });
export const presetIsActive = (s: RelationLessonState, id: PresetId): boolean => presetCells(id, s.n, s.k) === s.cells;
export const rule = (id: PresetId): ((a: number, b: number) => boolean) => PRESET_TESTS[id];

export const toggled = (s: RelationLessonState, a: number, b: number): RelationLessonState => ({ ...s, cells: toggleCell(s, a, b).cells });
/** New sizes keep the pairs that still exist; the outlined property is cleared because its witness may be gone. */
export const resized = (s: RelationLessonState, n: number, k: number): RelationLessonState => ({ ...resize(s, n, k), focus: 'none' });

export const isRelated = (s: RelationState, a: number, b: number): boolean => s.cells[(b - 1) * s.n + (a - 1)] === '1';

// ---------------------------------------------------------------------------------------------- properties
export interface PropertyLine {
  readonly id: 'reflexive' | 'symmetric' | 'antisymmetric' | 'transitive';
  readonly name: string;
  readonly definition: string;
  readonly holds: boolean | null;
  readonly sentence: string;
}
const pair = (a: number, b: number): string => `(${a}, ${b})`;

export function propertyLines(d: RelationDerived): PropertyLine[] {
  if (!d.onOneSet) {
    const why = `Needs a relation on one set (A and B the same size); here A has ${plural(d.state.n, 'element')} and B has ${d.state.k}.`;
    return (['reflexive', 'symmetric', 'antisymmetric', 'transitive'] as const).map(id => ({ id, name: NAMES[id], definition: DEFINITIONS[id], holds: null, sentence: why }));
  }
  const r = d.reflexive!;
  const sy = d.symmetric!;
  const an = d.antisymmetric!;
  const tr = d.transitive!;
  return [
    { id: 'reflexive', name: NAMES.reflexive, definition: DEFINITIONS.reflexive, holds: r.holds, sentence: r.holds ? 'every element is related to itself.' : `${r.witness} is not related to itself, ${pair(r.witness!, r.witness!)} is missing.` },
    { id: 'symmetric', name: NAMES.symmetric, definition: DEFINITIONS.symmetric, holds: sy.holds, sentence: sy.holds ? 'whenever a is related to b, b is related to a.' : `${pair(sy.witness![0], sy.witness![1])} is in R but ${pair(sy.witness![1], sy.witness![0])} is not.` },
    { id: 'antisymmetric', name: NAMES.antisymmetric, definition: DEFINITIONS.antisymmetric, holds: an.holds, sentence: an.holds ? 'no two different elements are related both ways.' : `${an.witness![0]} and ${an.witness![1]} are different but related both ways: ${pair(an.witness![0], an.witness![1])} and ${pair(an.witness![1], an.witness![0])} are in R.` },
    { id: 'transitive', name: NAMES.transitive, definition: DEFINITIONS.transitive, holds: tr.holds, sentence: tr.holds ? 'whenever a is related to b and b to c, a is related to c.' : `${pair(tr.witness![0], tr.witness![1])} and ${pair(tr.witness![1], tr.witness![2])} are in R, but ${pair(tr.witness![0], tr.witness![2])} is not.` },
  ];
}
const NAMES = { reflexive: 'Reflexive', symmetric: 'Symmetric', antisymmetric: 'Antisymmetric', transitive: 'Transitive' } as const;
const DEFINITIONS = {
  reflexive: 'a R a for every a', symmetric: 'a R b implies b R a', antisymmetric: 'a R b and b R a imply a = b', transitive: 'a R b and b R c imply a R c',
} as const;

/** Cells to draw attention to for the chosen property: related cells that take part, and cells that SHOULD be related but are not. */
export interface Highlight { readonly a: number; readonly b: number; readonly kind: 'present' | 'missing' }
export function highlights(d: RelationDerived, focus: FocusId): Highlight[] {
  if (focus === 'none' || !d.onOneSet) return [];
  const present = (a: number, b: number): Highlight => ({ a, b, kind: 'present' });
  const missing = (a: number, b: number): Highlight => ({ a, b, kind: 'missing' });
  switch (focus) {
    case 'reflexive': return d.reflexive!.holds ? Array.from({ length: d.state.n }, (_, i) => present(i + 1, i + 1)) : [missing(d.reflexive!.witness!, d.reflexive!.witness!)];
    case 'symmetric': return d.symmetric!.holds ? [] : [present(d.symmetric!.witness![0], d.symmetric!.witness![1]), missing(d.symmetric!.witness![1], d.symmetric!.witness![0])];
    case 'antisymmetric': return d.antisymmetric!.holds ? [] : [present(d.antisymmetric!.witness![0], d.antisymmetric!.witness![1]), present(d.antisymmetric!.witness![1], d.antisymmetric!.witness![0])];
    case 'transitive': {
      if (d.transitive!.holds) return [];
      const [a, b, c] = d.transitive!.witness!;
      return [present(a, b), present(b, c), missing(a, c)];
    }
  }
}

// ---------------------------------------------------------------------------------------------- readout
const pairsText = (d: RelationDerived): string => (d.pairs.length === 0 ? '∅' : `{${d.pairs.map(([a, b]) => `(${a}, ${b})`).join(', ')}}`);

export function relationRows(d: RelationDerived): InspectorRowData[] {
  return [
    { id: 'possible', role: 'ink', symbolTex: '\\lvert A\\times B\\rvert', name: 'all ordered pairs', description: countDescription(d.total), secondary: true },
    { id: 'size', role: 'primary', symbolTex: '\\lvert R\\rvert', name: 'pairs in the relation', description: countDescription(d.size) },
    { id: 'pairs', role: 'derived', symbolTex: 'R', name: 'the relation as a set of pairs', description: textDescription(pairsText(d), d.pairs.length === 0 ? '\\varnothing' : `\\{${d.pairs.map(([a, b]) => `(${a},${b})`).join(',')}\\}`, pairsText(d)), secondary: true },
  ];
}

export interface FunctionLine { readonly holds: boolean; readonly sentence: string }
export function functionLine(d: RelationDerived): FunctionLine {
  const f = d.function;
  if (f.isFunction) return { holds: true, sentence: 'Yes: every element of A is related to exactly one element of B, so R is a function from A to B.' };
  const fail = f.failure!;
  return {
    holds: false,
    sentence: fail.kind === 'none' ? `No: ${fail.a} is not related to any element of B, so R assigns it no value.` : `No: ${fail.a} is related to ${fail.images.length} elements of B (${fail.images.join(', ')}), so R does not assign it a single value.`,
  };
}

export function equivalenceLine(d: RelationDerived): string {
  if (!d.onOneSet) return 'Equivalence relations live on one set, so this needs A and B to have the same size.';
  if (d.equivalence) return `It is an equivalence relation: it is reflexive, symmetric and transitive, and it splits A into ${plural(d.classes!.length, 'class', 'classes')}: ${d.classes!.map(c => braces(c).text).join(', ')}.`;
  const missing = [d.reflexive!.holds ? null : 'reflexive', d.symmetric!.holds ? null : 'symmetric', d.transitive!.holds ? null : 'transitive'].filter((x): x is string => x !== null);
  return `It is not an equivalence relation: it is not ${missing.join(' and not ')}.`;
}

export function relationVerdict(d: RelationDerived): { text: string; caution: boolean } {
  const size = `${plural(d.size, 'pair')} out of ${d.total}.`;
  if (!d.onOneSet) return { text: `R has ${size} ${functionLine(d).sentence}`, caution: false };
  return { text: `R has ${size} ${equivalenceLine(d)}`, caution: false };
}

export function relationDescription(d: RelationDerived): string {
  return `A grid with the ${d.state.n} elements of A as rows and the ${d.state.k} elements of B as columns. ${pairsText(d)} are related, ${d.size} of ${d.total} pairs.`;
}
export const relationSpoken = (d: RelationDerived): string => `${plural(d.size, 'pair')} related. ${d.onOneSet ? (d.equivalence ? 'This is an equivalence relation.' : 'This is not an equivalence relation.') : functionLine(d).sentence}`;
export const cellLabel = (a: number, b: number, related: boolean): string => `${a} and ${b}: ${related ? 'related' : 'not related'}. Press to ${related ? 'remove' : 'add'} the pair ${a}, ${b}.`;
