import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.BOOK_CAPTURE_URL || 'http://127.0.0.1:4361';
const output = 'tests/visual/milestone-04';
const cases = ['03-doubly-linked-list', '04-memory-pool', '07-circular-buffer', '09-binary-heap', '14-avl-trees', '16-b-trees', '17-tries', '20-separate-chaining', '21-open-addressing', '22-robin-hood-hashing', '25-adjacency-list-matrix', '30-topological-sort', '33-dijkstra', '36-union-find'];
const evidence = [];
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const [width, height] of [[1440, 1000], [1024, 900], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const slug of cases) {
      await page.goto(`${base}/chapters/${slug}/`);
      const lab = page.locator('[data-chapter-lab]').first();
      await lab.locator('[data-node]').first().waitFor();
      const slider = lab.locator('[data-scrubber]');
      const step = Math.max(1, Math.floor(Number(await slider.getAttribute('max')) / 2));
      await slider.fill(String(step));
      await page.addStyleTag({ content: '.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}' });
      for (const [theme, view] of [['light', 'logical'], ['dark', 'memory']]) {
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        await lab.locator(`[data-view="${view}"]`).click();
        const node = lab.locator('[data-node]').first();
        await node.focus();
        await node.press('Enter');
        assert(await node.evaluate(n => n === document.activeElement), `${slug}: lost focus`);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${slug}: page overflow`);
        const path = `${output}/${slug}-${width}-${theme}-${view}.png`;
        await lab.screenshot({ path });
        evidence.push({ slug, width, height, theme, view, step, path });
      }
      console.log(`${width}: ${slug} selected mutation state, both views/themes, focus and containment passed.`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${output}/manifest.json`, JSON.stringify(evidence, null, 2) + '\n');
console.log(`${evidence.length} cross-book review captures written.`);
