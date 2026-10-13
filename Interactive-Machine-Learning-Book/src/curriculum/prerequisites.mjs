import source from './book-ii.json' with { type: 'json' };

/** @param {string} id */
export function bookIIChapter(id) {
  const chapter = source.chapters.find(chapter => chapter.id === id);
  if (!chapter) throw new RangeError(`Unknown published Book II prerequisite: ${id}`);
  return chapter;
}

/** @param {string} id @param {string} [base] */
export function bookIIHref(id, base = source.base) {
  const chapter = bookIIChapter(id);
  const url = new URL(base, 'https://book.invalid');
  if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || url.username || url.password || base.startsWith('//') || !(base.startsWith('/') || /^https?:\/\//.test(base)))
    throw new RangeError('Book II base must be an explicit HTTP(S) URL or root-relative path without query or fragment');
  return `${base.replace(/\/+$/, '')}/chapters/${chapter.slug}/`;
}
