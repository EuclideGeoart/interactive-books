/**
 * The notation table of I.9 (data and filter). The data are checked three ways:
 *  - every TeX string survives strict KaTeX,
 *  - every field is present and symbols are unique within their category,
 *  - every Python snippet marked as executed appears verbatim in one of the reference files under code/python/notation_*.py.
 * The filter is checked for the cases that matter to a reader: an empty query shows everything, a no-match search says so, and a category
 * never silently hides an entry that matches.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderTex } from '../../src/platform/tex';
import { CATEGORIES, NOTATION, entriesOf } from '../../src/lessons/notation/notation-data';
import { NO_FILTER, filterNotation, groupNotation, isFiltered, matchesQuery, resultSentence } from '../../src/lessons/notation/notation-table';

const FILES = ['notation_shapes.py', 'notation_norms_argmin.py', 'notation_expectation_gradient.py'].map(f => readFileSync(`code/python/${f}`, 'utf8'));
const ALL_PY = FILES.join('\n');

describe('the notation data', () => {
  it('has the categories of the plan, each used', () => {
    expect(CATEGORIES.map(c => c.id)).toEqual(['objects', 'indexing', 'products', 'sums', 'optimisation', 'probability', 'calculus', 'conventions']);
    for (const c of CATEGORIES) expect(entriesOf(c.id).length, c.id).toBeGreaterThanOrEqual(3);
    expect(NOTATION.length).toBeGreaterThanOrEqual(38);
  });
  it('renders every symbol with strict KaTeX', () => {
    for (const n of NOTATION) expect(() => renderTex(n.tex, true), n.id).not.toThrow();
  });
  it('has every field, no duplicate ids and no duplicate symbol in a category', () => {
    const ids = new Set<string>();
    for (const n of NOTATION) {
      expect(ids.has(n.id), n.id).toBe(false);
      ids.add(n.id);
      for (const field of [n.tex, n.reads, n.meaning, n.shape, n.where]) expect(field.trim().length, n.id).toBeGreaterThan(0);
      expect(n.meaning.endsWith('.'), `${n.id} ends its meaning with a full stop`).toBe(true);
      expect(n.where, n.id).toMatch(/^Part (I|II|III|IV|V|VI|VII|VIII) · /);
    }
    for (const c of CATEGORIES) {
      const texs = entriesOf(c.id).map(n => n.tex);
      expect(new Set(texs).size, c.id).toBe(texs.length);
    }
  });
  it('names the parts of the book by the curriculum, and links to no unpublished chapter', () => {
    for (const n of NOTATION) {
      expect(n.where, n.id).not.toMatch(/href|http|\//);
    }
  });
  it('runs every snippet it marks as executed, verbatim, in a reference file', () => {
    for (const n of NOTATION) {
      if (n.python === null) { expect(n.runs, n.id).toBe(false); continue; }
      if (n.runs) expect(ALL_PY.includes(n.python), `${n.id}: ${n.python}`).toBe(true);
    }
    expect(NOTATION.filter(n => n.runs).length).toBeGreaterThanOrEqual(30);
  });
  it('states the conventions the chapter freezes', () => {
    const by = (id: string) => NOTATION.find(n => n.id === id)!;
    expect(by('vector').meaning).toMatch(/column/);
    expect(by('matrix').meaning).toMatch(/n examples as rows/);
    expect(by('matrix').meaning).toMatch(/d features as columns/);
    expect(by('entry').meaning).toMatch(/start at 1/);
    expect(by('entry').python).toBe('X[i - 1, j - 1]');
    expect(by('log').meaning).toMatch(/natural logarithm/);
    expect(by('argmin').meaning).toMatch(/location/);
    expect(by('min').meaning).toMatch(/loss value/);
    expect(by('gradient').shape).toBe('same as θ');
    expect(by('approx').meaning).toMatch(/equals sign promises an exact value/);
  });
});

describe('the notation filter', () => {
  it('shows everything for an empty query and no category', () => {
    expect(filterNotation(NO_FILTER)).toHaveLength(NOTATION.length);
    expect(isFiltered(NO_FILTER)).toBe(false);
    expect(isFiltered({ query: '  ', category: 'all' })).toBe(false);
    expect(resultSentence(NO_FILTER, NOTATION.length)).toBe(`Showing all ${NOTATION.length} entries.`);
  });
  it('finds an entry by how it is read, what it means, its Python, or where it is developed', () => {
    const ids = (query: string) => filterNotation({ query, category: 'all' }).map(n => n.id);
    expect(ids('transpose')).toContain('transpose');
    expect(ids('TRANSPOSE')).toContain('transpose');
    expect(ids('ord=1')).toContain('l1');
    expect(ids('softmax')).toContain('argmax');
    expect(ids('natural logarithm')).toContain('log');
    expect(ids('x.t @')).toContain('gram');
  });
  it('needs every word of the query', () => {
    const entry = NOTATION.find(n => n.id === 'gram')!;
    expect(matchesQuery(entry, 'feature inner')).toBe(true);
    expect(matchesQuery(entry, 'feature zebra')).toBe(false);
  });
  it('intersects with a category and never drops a match by itself', () => {
    for (const c of CATEGORIES) {
      const inCategory = filterNotation({ query: '', category: c.id });
      expect(inCategory.map(n => n.id)).toEqual(entriesOf(c.id).map(n => n.id));
      for (const n of NOTATION) {
        const found = filterNotation({ query: n.reads, category: c.id }).some(m => m.id === n.id);
        expect(found, `${n.id} in ${c.id}`).toBe(n.category === c.id);
      }
    }
  });
  it('says there is no match, with the reason, instead of showing nothing silently', () => {
    const f = { query: 'zebra', category: 'all' } as const;
    expect(filterNotation(f)).toHaveLength(0);
    const text = resultSentence(f, 0);
    expect(text).toMatch(/No entry matches “zebra”/);
    expect(text).toMatch(/clear the filters/);
    expect(resultSentence({ query: '', category: 'calculus' }, 0)).toMatch(/No entry matches this group in Functions and gradients/);
    expect(resultSentence({ query: 'a', category: 'all' }, 1)).toBe(`Showing 1 of ${NOTATION.length} entries.`);
  });
  it('groups in the order of the categories and drops empty groups', () => {
    const groups = groupNotation(filterNotation({ query: 'gradient', category: 'all' }));
    expect(groups.length).toBeGreaterThan(0);
    const order = CATEGORIES.map(c => c.id);
    const positions = groups.map(g => order.indexOf(g.category.id));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const g of groups) expect(g.entries.length).toBeGreaterThan(0);
    expect(groupNotation([])).toEqual([]);
  });
});
