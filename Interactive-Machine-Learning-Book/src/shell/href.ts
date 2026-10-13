/** Apply the Book III deployment base exactly once to a book-relative path. */
export function href(path = '/', base = import.meta.env.BASE_URL): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
