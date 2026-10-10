import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  output: 'static',
  base: process.env.BOOK_BASE || '/',
  integrations: [mdx()],
  devToolbar: { enabled: false },
  markdown: { shikiConfig: { theme: 'github-dark' } },
});
