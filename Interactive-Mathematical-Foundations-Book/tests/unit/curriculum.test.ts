import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parts } from '../../src/curriculum/curriculum';
import { allChapters, chapterAnchor, chapterCount, findChapter, neighbours, partAnchor } from '../../src/curriculum/queries';

/** Parse the AUTHORITATIVE master plan (read-only) with an independent, line-based reader. */
interface PlanPart { numeral: string; title: string; purpose: string; exit: string; chapters: { n: number; title: string; role?: string }[] }
function parsePlan(): PlanPart[] {
  const lines = readFileSync('documentation/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md', 'utf8').split('\n');
  const out: PlanPart[] = [];
  let current: PlanPart | null = null;
  for (const line of lines) {
    const part = /^## Part ([IVX]+) — (.+)$/.exec(line);
    if (part) { current = { numeral: part[1]!, title: part[2]!.trim(), purpose: '', exit: '', chapters: [] }; out.push(current); continue; }
    if (/^# \d+\./.test(line)) { current = null; continue; }
    if (!current) continue;
    const purpose = /^\*\*Purpose:\*\* (.+)$/.exec(line);
    if (purpose) current.purpose = purpose[1]!.trim();
    const exit = /^\*\*Part [IVX]+ exit condition:\*\* (.+)$/.exec(line);
    if (exit) current.exit = exit[1]!.trim();
    const chapter = /^### ([IVX]+)\.(\d+) (.+)$/.exec(line);
    if (chapter && chapter[1] === current.numeral) {
      let title = chapter[3]!.trim();
      let role: string | undefined;
      const flag = / — \*\*(REFERENCE|FLAGSHIP) CHAPTER\*\*$/.exec(title);
      if (flag) { role = flag[1]!.toLowerCase(); title = title.slice(0, flag.index).trim(); }
      current.chapters.push({ n: Number(chapter[2]), title, ...(role ? { role } : {}) });
    }
  }
  return out;
}

describe('curriculum data ⇄ master plan (drift test)', () => {
  const plan = parsePlan();
  it('the plan has eight Parts with 9, 19, 15, 16, 10, 10, 8 and 10 chapters (97 total)', () => {
    expect(plan.map(p => p.chapters.length)).toEqual([9, 19, 15, 16, 10, 10, 8, 10]);
    expect(plan.reduce((a, p) => a + p.chapters.length, 0)).toBe(97);
    expect(chapterCount).toBe(97);
  });
  it('Part numerals, names, purposes and exit conditions match the plan verbatim', () => {
    expect(parts.map(p => ({ numeral: p.numeral, title: p.title, purpose: p.purpose, exit: p.exitCondition }))).toEqual(
      plan.map(p => ({ numeral: p.numeral, title: p.title, purpose: p.purpose, exit: p.exit })),
    );
  });
  it('every chapter number and title matches the plan, in order', () => {
    expect(parts.map(p => p.chapters.map(c => ({ n: c.n, title: c.title })))).toEqual(plan.map(p => p.chapters.map(c => ({ n: c.n, title: c.title }))));
  });
  it('REFERENCE / FLAGSHIP markers match the plan (I.3 reference, VI.4 flagship, and nothing else)', () => {
    const fromPlan = plan.flatMap(p => p.chapters.filter(c => c.role).map(c => `${p.numeral}.${c.n}:${c.role}`));
    const fromData = allChapters.filter(r => r.chapter.role).map(r => `${r.id}:${r.chapter.role}`);
    expect(fromData).toEqual(fromPlan);
    expect(fromData).toEqual(['I.3:reference', 'VI.4:flagship']);
  });
  it('titles contain no leftover markdown', () => {
    for (const r of allChapters) expect(r.chapter.title).not.toMatch(/[*`_]{2}|\*\*/);
  });
});

describe('curriculum structure', () => {
  it('chapter ids, part slugs and anchors are unique', () => {
    expect(new Set(allChapters.map(r => r.id)).size).toBe(97);
    expect(new Set(parts.map(p => p.slug)).size).toBe(8);
    expect(new Set(allChapters.map(r => chapterAnchor(r.part, r.chapter))).size).toBe(97);
    expect(new Set(parts.map(partAnchor)).size).toBe(8);
  });
  it('chapters are numbered 1..n within each Part and Parts 1..8 in order', () => {
    expect(parts.map(p => p.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const p of parts) expect(p.chapters.map(c => c.n)).toEqual(p.chapters.map((_, i) => i + 1));
  });
  it('a slug exists if and only if the chapter is available', () => {
    for (const r of allChapters) expect(r.chapter.status === 'available', r.id).toBe(r.chapter.slug !== undefined);
  });
  it('neighbours cross Part boundaries in reading order', () => {
    const last = findChapter('I.9')!;
    expect(neighbours(last).next?.id).toBe('II.1');
    expect(neighbours(findChapter('I.1')!).previous).toBeUndefined();
    expect(neighbours(findChapter('VIII.10')!).next).toBeUndefined();
  });
});

/** M7+M8 integrated publication: exactly Parts I–IV are available, preserving the master 97-chapter curriculum. */
const PART_III_PUBLISHED = Array.from({ length: 15 }, (_, k) => `III.${k + 1}`);
const PART_IV_PUBLISHED = Array.from({ length: 16 }, (_, k) => `IV.${k + 1}`);
describe('publication scope guard', () => {
  it('I.3 remains the reference chapter and VI.4 the flagship', () => {
    const i3 = findChapter('I.3')!;
    expect(i3.chapter.status).toBe('available');
    expect(i3.chapter.slug).toBe('vectors');
    expect(i3.chapter.role).toBe('reference');
    expect(findChapter('VI.4')!.chapter.role).toBe('flagship');
  });
  it('M10 Block A adds 4 Optimization chapters to the 59-chapter baseline', () => {
    const published = allChapters.filter(r => r.chapter.status === 'available');
    expect(published.filter(r => r.part.numeral === 'I')).toHaveLength(9);
    expect(published.filter(r => r.part.numeral === 'II')).toHaveLength(19);
    expect(published.filter(r => r.part.numeral === 'III').map(r => r.id)).toEqual(PART_III_PUBLISHED);
    expect(published.filter(r => r.part.numeral === 'IV').map(r => r.id)).toEqual(PART_IV_PUBLISHED);
    expect(published.every(r => ['I', 'II', 'III', 'IV', 'VI'].includes(r.part.numeral))).toBe(true);
    expect(published).toHaveLength(63);
    expect(allChapters.filter(r => r.chapter.status === 'planned')).toHaveLength(34);
    expect(published.map(r => r.id)).toEqual([...allChapters.slice(0, 59), ...allChapters.filter(r => r.part.numeral === 'VI' && r.chapter.n <= 4)].map(r => r.id));
    expect(allChapters.filter(r => r.part.numeral === 'V').every(r => r.chapter.status === 'planned')).toBe(true);
  });
  it('navigates II.19 → III.1 → III.15 → IV.1 → IV.16 → V.1', () => {
    expect(neighbours(findChapter('II.19')!).next?.id).toBe('III.1');
    expect(neighbours(findChapter('III.15')!).next?.id).toBe('IV.1');
    expect(neighbours(findChapter('IV.1')!).previous?.id).toBe('III.15');
    expect(neighbours(findChapter('IV.16')!).next?.id).toBe('V.1');
  });
});
