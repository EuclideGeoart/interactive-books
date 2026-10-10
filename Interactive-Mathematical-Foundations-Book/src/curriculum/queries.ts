import { parts, type ChapterEntry, type Part } from './curriculum';

export interface ChapterRef {
  readonly part: Part;
  readonly chapter: ChapterEntry;
  /** "I.3" — the identifier printed in the book. */
  readonly id: string;
  /** Position in reading order across the whole book (0-based). */
  readonly position: number;
}

export const chapterId = (part: Part, chapter: ChapterEntry): string => `${part.numeral}.${chapter.n}`;

/** Stable fragment id for a chapter entry on the contents page, e.g. "ch-ii-8". */
export const chapterAnchor = (part: Part, chapter: ChapterEntry): string => `ch-${part.numeral.toLowerCase()}-${chapter.n}`;
export const partAnchor = (part: Part): string => `part-${part.numeral.toLowerCase()}`;

export const allChapters: readonly ChapterRef[] = parts.flatMap(part => part.chapters.map(chapter => ({ part, chapter, id: chapterId(part, chapter) })))
  .map((ref, position) => ({ ...ref, position }));

export const findChapter = (id: string): ChapterRef | undefined => allChapters.find(ref => ref.id === id);
export const findChapterBySlug = (slug: string): ChapterRef | undefined => allChapters.find(ref => ref.chapter.slug === slug);

export const chapterCount = allChapters.length;
export const availableCount = allChapters.filter(ref => ref.chapter.status === 'available').length;

export function neighbours(ref: ChapterRef): { previous?: ChapterRef; next?: ChapterRef } {
  const previous = allChapters[ref.position - 1];
  const next = allChapters[ref.position + 1];
  return { ...(previous ? { previous } : {}), ...(next ? { next } : {}) };
}

export const partStats = (part: Part): { total: number; available: number } => ({
  total: part.chapters.length,
  available: part.chapters.filter(c => c.status === 'available').length,
});
