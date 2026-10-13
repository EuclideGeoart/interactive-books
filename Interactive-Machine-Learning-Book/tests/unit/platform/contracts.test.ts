import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { plan, registerParts, checkChapterContent, chapterSourceId, available, type PartManifest } from '../../../src/curriculum/registry';
import { bookIIChapter, bookIIHref } from '../../../src/curriculum/prerequisites.mjs';
import { seeded } from '../../../src/platform/seed';
import { cursorAt, next, previous, traceFrom } from '../../../src/platform/trace';
import { href } from '../../../src/shell/href';
const register = (manifests: PartManifest[]) => registerParts(Object.fromEntries(manifests.map(manifest => [`../parts/${manifest.part}/manifest.json`, manifest])));

describe('Part boundaries and frozen curriculum', () => {
  it('covers exactly the supplied nine Parts and 41 stable chapter IDs', () => {
    expect(plan).toHaveLength(9);
    expect(plan.flatMap(part => part.chapters.map(chapter => chapter.id))).toEqual(Array.from({ length: 41 }, (_, index) => `III-${String(index + 1).padStart(2, '0')}`));
    expect(plan.flatMap(part => part.chapters).find(c => c.id === 'III-07')?.title).toBe('Linear Regression');
  });
  it('allows independent Parts to register without editing a shared availability file', () => {
    const parts = register([{ part: 'p01', chapters: [{ id: 'III-01', slug: 'what-is-learned' }] }, { part: 'p02', chapters: [{ id: 'III-07', slug: 'linear-regression' }] }]);
    expect(parts.flatMap(p => p.chapters).filter(c => c.status === 'available').map(c => c.id)).toEqual(['III-01', 'III-07']);
  });
  it('rejects another Part\'s chapter, duplicate registration and colliding URLs', () => {
    expect(() => register([{ part: 'p01', chapters: [{ id: 'III-07', slug: 'wrong' }] }])).toThrow('not owned');
    expect(() => register([{ part: 'p02', chapters: [{ id: 'III-07', slug: 'a' }, { id: 'III-07', slug: 'b' }] }])).toThrow('Repeated');
    expect(() => register([{ part: 'p01', chapters: [{ id: 'III-01', slug: 'same' }] }, { part: 'p02', chapters: [{ id: 'III-07', slug: 'same' }] }])).toThrow('Repeated');
    expect(() => register([{ part: 'p02', chapters: [{ id: 'III-07', slug: '../escape' }] }])).toThrow('Invalid');
    expect(() => register([{ part: 'p02', chapters: [{ id: 'III-07', slug: true as unknown as string }] }])).toThrow('Invalid');
    expect(() => registerParts({ '../parts/p01/manifest.json': { part: 'p03', chapters: [{ id: 'III-17', slug: 'foreign' }] } })).toThrow('Wrong manifest owner');
  });
  it('fails closed for missing, wrong-owner, duplicate and renamed content', () => {
    expect(() => checkChapterContent([])).toThrow('Missing content');
    const entries = available.map(c => ({ id: `${c.partId}/chapters/${c.slug}`, filePath: `src/parts/${c.partId}/chapters/${c.slug}.mdx`, data: { chapterId: c.id, title: c.title } }));
    const entry = entries.find(c => c.data.chapterId === 'III-07')!;
    const others = entries.filter(c => c !== entry);
    expect(() => checkChapterContent(entries)).not.toThrow();
    expect(() => checkChapterContent([...entries, entry])).toThrow('repeated');
    expect(() => checkChapterContent([...others, { ...entry, id: 'p01/chapters/linear-regression' }])).toThrow('misowned');
    expect(() => checkChapterContent([...others, { ...entry, data: { ...entry.data, title: 'Changed title' } }])).toThrow('renamed');
    expect(() => checkChapterContent([...others, { ...entry, filePath: 'src/parts/p01/chapters/foreign.mdx' }])).toThrow('misowned');
    expect(chapterSourceId('p01/chapters/foreign.mdx')).toBe('p01/chapters/foreign');
  });
});

describe('Prerequisites and path ownership', () => {
  it('contains actual published Book II anchors and routes', () => {
    const frozen = JSON.parse(readFileSync(new URL('../../../src/curriculum/book-ii.json', import.meta.url), 'utf8'));
    expect(frozen.chapters).toHaveLength(97);
    expect(bookIIChapter('II.9').slug).toBe('matrix-vector');
    expect(bookIIHref('II.9')).toBe('/math-foundations/chapters/matrix-vector/');
    expect(bookIIHref('II.9', 'https://example.org/math/')).toBe('https://example.org/math/chapters/matrix-vector/');
    expect(() => bookIIHref('IX.999')).toThrow('Unknown');
    for (const base of ['javascript:alert(1)', '//other.example/', '/math/?q=1']) expect(() => bookIIHref('II.9', base)).toThrow();
  });
  it('applies the current Book III base once', () => {
    expect(href('/chapters/linear-regression/', '/')).toBe('/chapters/linear-regression/');
    expect(href('/chapters/linear-regression/', '/machine-learning/')).toBe('/machine-learning/chapters/linear-regression/');
    expect(href('/', '/machine-learning/')).toBe('/machine-learning/');
  });
});

describe('Deterministic state and replay', () => {
  it('uses independently known unsigned LCG values', () => {
    const draw = seeded(0);
    expect(draw()).toBe(1013904223 / 4294967296);
    expect(draw()).toBe(1196435762 / 4294967296);
    expect(draw()).toBe(3519870697 / 4294967296);
    expect(() => seeded(-1)).toThrow(); expect(() => seeded(1.5)).toThrow();
    expect(seeded(7)()).toBe(seeded(7)());
  });
  it('detaches history and rejects values freezing cannot protect', () => {
    const state = { rows: [{ x: 2 }] };
    const trace = traceFrom([{ state }]); state.rows[0]!.x = 9;
    expect(trace[0]!.state.rows[0]!.x).toBe(2);
    expect(Object.isFrozen(trace[0]!.state.rows[0])).toBe(true);
    expect(() => traceFrom([{ state: new Map() }])).toThrow(TypeError);
    expect(() => cursorAt(0)).toThrow(RangeError);
    expect(previous(cursorAt(3)).index).toBe(0);
    expect(next(cursorAt(3, 2)).index).toBe(2);
  });
});
