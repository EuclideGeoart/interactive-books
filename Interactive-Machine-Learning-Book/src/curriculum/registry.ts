import { registerParts, type PartManifest } from './manifests.mjs';
export { plan, registerParts } from './manifests.mjs';
export type { PartManifest, PartPlan, ChapterRegistration, PlannedChapter } from './manifests.mjs';

const manifests = import.meta.glob<PartManifest>('../parts/p*/manifest.json', { eager: true, import: 'default' });
export const parts = registerParts(manifests);
export const chapters = parts.flatMap(part => part.chapters);
export const available = chapters.filter(chapter => chapter.status === 'available');
export const findChapter = (id: string) => chapters.find(chapter => chapter.id === id);

export function chapterSourceId(file: string): string {
  const relative = file.replaceAll('\\', '/').split('/src/parts/').at(-1)!.replace(/^src\/parts\//, '');
  if (!/^p0[1-9]\/chapters\/[a-z0-9]+(?:-[a-z0-9]+)*\.mdx$/.test(relative)) throw new Error(`Invalid chapter source path: ${file}`);
  return relative.slice(0, -4);
}

export function checkChapterContent(entries: readonly { data: { chapterId: string; title: string }; id: string; filePath?: string }[]) {
  const seen = new Set<string>();
  for (const entry of entries) {
    const chapter = findChapter(entry.data.chapterId);
    if (!chapter?.slug || seen.has(chapter.id) || chapter.title !== entry.data.title || !entry.filePath ||
      entry.id !== `${chapter.partId}/chapters/${chapter.slug}` || chapterSourceId(entry.filePath) !== entry.id)
      throw new Error(`Unregistered, repeated, misowned or renamed content: ${entry.id}`);
    seen.add(chapter.id);
  }
  for (const chapter of available) if (!seen.has(chapter.id)) throw new Error(`Missing content: ${chapter.id}`);
}
