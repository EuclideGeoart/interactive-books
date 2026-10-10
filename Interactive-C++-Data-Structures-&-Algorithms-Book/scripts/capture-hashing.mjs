import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const selected = process.argv.slice(2);
const slugs = ['18-hashing-fundamentals','19-hash-tables','20-separate-chaining','21-open-addressing','22-robin-hood-hashing','23-unordered-map'].filter(slug => !selected.length || selected.some(n => slug.startsWith(n)));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
mkdirSync('tests/visual/hashing', { recursive: true });
for (const width of [1440,1024,390]) {
  const context = await browser.newContext({viewport:{width,height:width===390?844:1000},colorScheme:'light',reducedMotion:'reduce',isMobile:width===390,hasTouch:width===390});
  for (const slug of slugs) {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${process.env.BOOK_TEST_PORT || '45631'}/chapters/${slug}/`);
    const lab = page.locator('[data-chapter-lab]').first();
    await lab.locator('svg').waitFor();
    await page.screenshot({path:`tests/visual/hashing/${slug}-${width}-overview.png`});
    await page.addStyleTag({content:'.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}'});
    await lab.screenshot({path:`tests/visual/hashing/${slug}-${width}-lab.png`});
    await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
    await lab.screenshot({path:`tests/visual/hashing/${slug}-${width}-dark.png`});
    await page.close();
  }
  await context.close();
}
await browser.close();
