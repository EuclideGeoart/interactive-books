import { chapters } from './book';
export interface SearchEntry { number: string; slug: string; id: string; title: string; text: string }
const sources = import.meta.glob('./chapters/*.mdx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const searchIndex: SearchEntry[] = chapters.flatMap(chapter => {
  const source = sources[`./chapters/${chapter.slug}.mdx`] ?? '';
  return [...source.matchAll(/<Section\b([^>]*)>([\s\S]*?)<\/Section>/g)].flatMap(([, attrs = '', content = '']) => {
    const id = attrs.match(/\bid="([^"]+)"/)?.[1];
    const title = attrs.match(/\btitle="([^"]+)"/)?.[1];
    return id && title ? [{ number: chapter.number, slug: chapter.slug, id, title, text: `${chapter.title} ${title} ${content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')}` }] : [];
  });
});
