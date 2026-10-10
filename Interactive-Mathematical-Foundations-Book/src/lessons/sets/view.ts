/**
 * Helpers shared by the I.7 lesson views: how a finite set is WRITTEN (text, TeX, speech) and how it becomes a platform `ValueDescription`.
 * Nothing here decides a mathematical fact; every element list was produced by `src/math/sets`.
 */
import type { ValueDescription } from '../../platform/numeric/quantity';
import { FORMAT } from '../shared/format';

export { FORMAT };

export interface Written { readonly text: string; readonly tex: string; readonly spoken: string }

/** A finite set of whole numbers written with braces: `{1, 2, 3}`; the empty set is `∅`. */
export function braces(items: readonly number[]): Written {
  if (items.length === 0) return { text: '∅', tex: '\\varnothing', spoken: 'the empty set' };
  return { text: `{${items.join(', ')}}`, tex: `\\{${items.join(',')}\\}`, spoken: `the set ${items.join(', ')}` };
}

/** A finite set as a read-only exact value (`=` only). */
export function setDescription(items: readonly number[]): ValueDescription {
  const w = braces(items);
  return { status: 'exact', lines: [{ relation: '=', text: w.text, tex: w.tex }], spoken: w.spoken };
}

/** A whole number as an exact value. */
export function countDescription(n: number): ValueDescription {
  return { status: 'exact', lines: [{ relation: '=', text: String(n), tex: String(n) }], spoken: String(n) };
}

/** A piece of text as an exact value (used for set-builder results such as interval unions). */
export function textDescription(text: string, tex: string, spoken: string): ValueDescription {
  return { status: 'exact', lines: [{ relation: '=', text, tex }], spoken };
}

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
