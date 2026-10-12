import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { katexMacros } from './src/math/katex-macros.mjs';
import rehypeFailOnMathError from './src/math/rehype-fail-on-math-error.mjs';

// BOOK_BASE=/some/path/ builds for a sub-directory deployment; the default is the origin root.
const base = process.env.BOOK_BASE || '/';

export default defineConfig({
  output: 'static',
  // Shared dependency symlinks are read-only; all generated caches belong to this worktree.
  cacheDir: './.cache/astro',
  vite: { cacheDir: './.cache/vite' },
  base,
  trailingSlash: 'always',
  integrations: [mdx(), preact()],
  devToolbar: { enabled: false },
  markdown: {
    remarkPlugins: [remarkMath],
    // Build-time math with the shared macro table. rehype-katex only WARNS on a bad formula (and ships a red error span),
    // so rehypeFailOnMathError turns that warning into a build error (plan §12.1, layer 1).
    rehypePlugins: [[rehypeKatex, { throwOnError: true, strict: 'error', macros: katexMacros(), output: 'htmlAndMathml' }], rehypeFailOnMathError],
    syntaxHighlight: { type: 'shiki', excludeLangs: ['math'] },
    shikiConfig: { theme: 'css-variables' },
  },
});
