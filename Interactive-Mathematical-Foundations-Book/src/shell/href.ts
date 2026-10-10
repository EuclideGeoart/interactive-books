/**
 * The ONE place a deployment base path is applied. Components never concatenate paths by hand, so the
 * site works at the origin root and under a sub-directory (`BOOK_BASE=/math-foundations/`) alike.
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** `href('/contents/')` → "/contents/" at the root, "/math-foundations/contents/" under a sub-path. */
export function href(path = '/'): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
