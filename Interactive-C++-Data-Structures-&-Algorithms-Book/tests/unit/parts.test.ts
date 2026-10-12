import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { chapters } from '../../src/content/book';
import { parts, partForChapter } from '../../src/content/parts';

describe('the published Book I Part registry', () => {
  it('owns exactly ten Parts and all 67 existing chapters, once and in reading order', () => {
    expect(parts.map(part => part.numeral)).toEqual(['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']);
    expect(parts.map(part => part.chapters.length)).toEqual([1, 5, 4, 8, 6, 13, 8, 6, 9, 7]);
    const mapped = parts.flatMap(part => part.chapters);
    expect(mapped).toEqual(chapters);
    expect(mapped.map(chapter => chapter.number)).toEqual(Array.from({ length: 67 }, (_, i) => String(i).padStart(2, '0')));
    expect(new Set(mapped.map(chapter => chapter.number)).size).toBe(67);
    expect(new Set(mapped.map(chapter => chapter.slug)).size).toBe(67);
    expect(new Set(parts.map(part => part.id)).size).toBe(10);
    for (const chapter of chapters) {
      expect(parts.filter(part => part.chapters.includes(chapter))).toHaveLength(1);
      expect(partForChapter(chapter.number)?.chapters).toContain(chapter);
    }
    expect(partForChapter('67')).toBeUndefined();
    expect(partForChapter('1')).toBeUndefined();
  });

  it('keeps every canonical chapter route, its sections and exercises', () => {
    for (const chapter of chapters) {
      expect(existsSync(`src/pages/chapters/${chapter.slug}.astro`)).toBe(true);
      const source = readFileSync(`src/content/chapters/${chapter.slug}.mdx`, 'utf8');
      const ids = [...source.matchAll(/<Section\b[^>]*\bid="([^"]+)"/g)].map(match => match[1]);
      expect(ids.length).toBe(chapter.number === '00' ? 14 : 13);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain('exercises');
      expect(ids.at(-1)).toBe('summary');
    }
  });

  it('drives homepage, contents, current-Part navigation and breadcrumbs without component ranges', () => {
    for (const file of ['src/pages/index.astro', 'src/pages/contents.astro', 'src/components/book/BookNav.astro', 'src/components/book/ChapterHero.astro', 'src/components/book/Hero.astro', 'src/layouts/BookLayout.astro', 'src/layouts/SiteLayout.astro']) {
      const source = readFileSync(file, 'utf8');
      expect(source).toMatch(/(?:parts|partForChapter).*from ['"].*content\/parts/);
      expect(source).not.toMatch(/chapters\.filter|Number\((?:chapter|current)\.?(?:number)?\)/);
    }
  });
});
