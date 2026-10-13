import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { katexMacros } from './src/math/katex-macros.mjs';
import failOnMathError from './src/math/rehype-fail-on-math-error.mjs';
import { normalizeBase } from './scripts/production-state.mjs';

export default defineConfig({
  output: 'static', base: normalizeBase(process.env.BOOK_BASE || '/'), trailingSlash: 'always',
  cacheDir: './.cache/astro', vite: { cacheDir: './.cache/vite' },
  integrations: [mdx(), preact()], devToolbar: { enabled: false },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: 'error', macros: katexMacros(), output: 'htmlAndMathml' }], failOnMathError],
    shikiConfig: { theme: 'css-variables' },
  },
});
