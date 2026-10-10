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
  it('the plan has eight Parts with 7, 19, 14, 16, 10, 10, 8 and 10 chapters (94 total)', () => {
    expect(plan.map(p => p.chapters.length)).toEqual([7, 19, 14, 16, 10, 10, 8, 10]);
    expect(plan.reduce((a, p) => a + p.chapters.length, 0)).toBe(94);
    expect(chapterCount).toBe(94);
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
    expect(new Set(allChapters.map(r => r.id)).size).toBe(94);
    expect(new Set(parts.map(p => p.slug)).size).toBe(8);
    expect(new Set(allChapters.map(r => chapterAnchor(r.part, r.chapter))).size).toBe(94);
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
    const last = findChapter('I.7')!;
    expect(neighbours(last).next?.id).toBe('II.1');
    expect(neighbours(findChapter('I.1')!).previous).toBeUndefined();
    expect(neighbours(findChapter('VIII.10')!).next).toBeUndefined();
  });
});

describe('M2 scope guard', () => {
  it('REF-1 (I.3 Vectors) is NOT delivered by this milestone: it stays "planned" until M3', () => {
    expect(findChapter('I.3')?.chapter.status).toBe('planned');
  });
});
