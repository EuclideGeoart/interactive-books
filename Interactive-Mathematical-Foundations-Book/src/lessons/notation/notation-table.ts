/**
 * The pure filter behind the notation table: which entries a search word and a category leave visible, and the sentence that says so.
 * The table never hides everything without saying why; with no match it says so and offers the way back.
 */
import { CATEGORIES, NOTATION, type Category, type CategoryId, type NotationEntry } from './notation-data';

export type CategoryFilter = CategoryId | 'all';
export interface TableFilter {
  readonly query: string;
  readonly category: CategoryFilter;
}
export const NO_FILTER: TableFilter = Object.freeze({ query: '', category: 'all' });

export const isFiltered = (f: TableFilter): boolean => f.query.trim() !== '' || f.category !== 'all';

const categoryTitle = (id: CategoryId): string => CATEGORIES.find(c => c.id === id)!.title;

/** Everything a learner might type to find the entry: how it is read, what it means, its shape, where it is developed, its Python. */
export const searchText = (n: NotationEntry): string =>
  [n.reads, n.meaning, n.shape, n.where, n.python ?? '', categoryTitle(n.category), n.id.replace(/-/g, ' ')].join(' ').toLowerCase();

/** Every word of the query must occur somewhere in the entry (case does not matter); an empty query matches everything. */
export function matchesQuery(n: NotationEntry, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(w => w !== '');
  if (words.length === 0) return true;
  const hay = searchText(n);
  return words.every(w => hay.includes(w));
}

export function filterNotation(f: TableFilter, all: readonly NotationEntry[] = NOTATION): readonly NotationEntry[] {
  return all.filter(n => (f.category === 'all' || n.category === f.category) && matchesQuery(n, f.query));
}

export interface Group {
  readonly category: Category;
  readonly entries: readonly NotationEntry[];
}

/** The visible entries grouped by category, in the order of the categories; a category with no visible entry is left out. */
export function groupNotation(entries: readonly NotationEntry[]): readonly Group[] {
  return CATEGORIES.map(category => ({ category, entries: entries.filter(n => n.category === category.id) })).filter(g => g.entries.length > 0);
}

export function resultSentence(f: TableFilter, shown: number, total: number = NOTATION.length): string {
  const entries = (k: number) => `${k} ${k === 1 ? 'entry' : 'entries'}`;
  if (!isFiltered(f)) return `Showing all ${entries(total)}.`;
  if (shown === 0) {
    const what = f.query.trim() !== '' ? `“${f.query.trim()}”` : 'this group';
    return `No entry matches ${what}${f.category !== 'all' ? ` in ${categoryTitle(f.category)}` : ''}. Nothing is hidden by mistake: clear the filters to see all ${entries(total)} again.`;
  }
  return `Showing ${shown} of ${entries(total)}.`;
}
