import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { bookIIChapter } from './curriculum/prerequisites.mjs';
import { chapterSourceId } from './curriculum/registry';

const chapters = defineCollection({
  loader: glob({ pattern: 'p*/chapters/*.mdx', base: './src/parts', generateId: ({ entry }) => chapterSourceId(entry) }),
  schema: z.object({
    chapterId: z.string().regex(/^III-\d{2}$/), title: z.string().min(3), hero: z.string().min(3),
    lede: z.string().min(10), description: z.string().min(20).max(300),
    prerequisites: z.array(z.string().refine(id => { bookIIChapter(id); return true; })).default([]),
  }),
});
export const collections = { chapters };
