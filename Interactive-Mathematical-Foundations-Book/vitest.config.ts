import { defineConfig } from 'vitest/config';
// 20 s: the strict-KaTeX sweeps render thousands of formulas and sit near the 5 s default under load (a timing limit, not a tolerance).
export default defineConfig({ cacheDir: './.cache/vitest', test: { include: ['tests/unit/**/*.test.ts'], environment: 'node', testTimeout: 20_000 } });
