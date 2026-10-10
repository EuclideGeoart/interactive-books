import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Chapter content (master plan §21): MDX owns narrative; frontmatter owns metadata.
 * `kind: chapter` pages are curriculum chapters and need a `curriculumId` such as "II.8" that exists in
 * `src/curriculum/curriculum.ts` with status "available" (checked by tests/unit/content.test.ts).
 * `kind: demo` pages are platform demonstrations; they are not part of the curriculum.
 */
const chapters = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/chapters' }),
  schema: z
    .object({
      kind: z.enum(['chapter', 'demo']),
      curriculumId: z.string().regex(/^[IVX]+\.\d+$/).optional(),
      title: z.string().min(3),
      /** The hero question/statement. Wrap one word in *asterisks* for the italic emphasis. */
      hero: z.string().min(3),
      lede: z.string().min(10),
      description: z.string().min(20).max(300),
      /** Small label above the title; defaults from the curriculum for chapters. */
      label: z.string().optional(),
    })
    .refine(v => v.kind === 'demo' || v.curriculumId !== undefined, { message: 'a chapter needs a curriculumId' }),
});

export const collections = { chapters };
