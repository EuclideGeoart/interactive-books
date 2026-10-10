/**
 * KaTeX rendering shared by the build (static equations in Astro pages) and the browser (live formulas).
 * Same options, same macro table: a static `\norm{\mathbf v}` and a live one are indistinguishable.
 * `throwOnError`/`strict` make a malformed formula a build/test failure, never a red box on the page.
 */
import katex from 'katex';
import { katexMacros } from '../math/katex-macros.mjs';

const cache = new Map<string, string>();
const CACHE_LIMIT = 800;

export function renderTex(tex: string, display: boolean): string {
  const key = `${display ? 'D' : 'I'}:${tex}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const html = katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: 'error', macros: katexMacros(), output: 'htmlAndMathml' });
  if (cache.size >= CACHE_LIMIT) cache.clear(); // free drags can generate many distinct strings
  cache.set(key, html);
  return html;
}
