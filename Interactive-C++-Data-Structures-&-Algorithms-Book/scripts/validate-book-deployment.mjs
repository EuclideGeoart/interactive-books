import { chromium } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const base = new URL((process.env.BOOK_DEPLOYMENT_URL || 'http://127.0.0.1:4362/book').replace(/\/$/, '') + '/');
const chapters = [...readFileSync('src/content/book.ts', 'utf8').matchAll(/number: '(\d+)', slug: '([^']+)'/g)]
  .map(([, number, slug]) => ({ number, slug }));
const numbers = chapters.map(c => Number(c.number));
assert.equal(numbers[0], 0);
assert.deepEqual(numbers.filter(n => n >= 1 && n <= 50), Array.from({ length: 50 }, (_, i) => i + 1));
assert.deepEqual(numbers.filter(n => n >= 51 && n <= 59), Array.from({ length: 9 }, (_, i) => i + 51));
assert.deepEqual(numbers.filter(n => n >= 60), [60, 61, 62, 63, 64, 65, 66]);
assert.deepEqual(numbers, [...new Set(numbers)].sort((a, b) => a - b));
const target = resolve('.cpp-build/downloaded-book');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let sources = 0;
try {
  for (let i = 0; i < chapters.length; i++) {
    const { number, slug } = chapters[i];
    const response = await page.goto(new URL(`chapters/${slug}/`, base).href);
    assert.equal(response.status(), 200, slug);
    if (number === '00') await page.locator('[data-foundations-lab="pointer"] [data-lab-visual]').waitFor();
    else await page.locator('[data-lab], [data-chapter-lab]').first().locator('svg, .technique-scene').first().waitFor();
    assert.equal(await page.locator('[data-section]').count(), number === '00' ? 14 : 13, slug);
    if (number !== '00') assert.equal(await page.locator('[data-lab], [data-chapter-lab]').first().getAttribute('data-step'), '0', slug);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${slug}: overflow`);
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
    for (const href of links) {
      const url = new URL(href, page.url());
      if (url.origin === base.origin) assert(url.pathname.startsWith(base.pathname), `${slug}: escaped base ${href}`);
    }
    const adjacent = await page.getByRole('navigation', { name: 'Adjacent chapters' }).locator('a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
    const expected = [chapters[i - 1], chapters[i + 1]].filter(Boolean).map(c => `${base.pathname}chapters/${c.slug}/`);
    assert.deepEqual(adjacent, expected, slug);
    const index = JSON.parse(await page.locator('[data-search-index]').textContent());
    assert.equal(index.length, (chapters.length - 1) * 13 + 14);
    await page.locator('[data-search-open]').click();
    await page.getByRole('searchbox').fill(number === '23' ? 'Dijkstra' : 'tombstone');
    const found = page.locator('[data-search-results] a').first();
    await found.waitFor();
    assert(new URL(await found.getAttribute('href'), page.url()).pathname.startsWith(base.pathname));
    await page.keyboard.press('Escape');

    for (const file of readdirSync(`cpp/chapter-${number}`).filter(f => f.endsWith('.hpp') || f === 'main.cpp')) {
      const published = number === '01' ? `source/${file}` : `source/chapter-${number}/${file}`;
      const download = await fetch(new URL(published, base));
      assert(download.ok, `${published}: ${download.status}`);
      const source = await download.text();
      assert(!/@(?:trace|begin|end)/.test(source), `${published}: source tags leaked`);
      const saved = `${target}/chapter-${number}/${file}`;
      mkdirSync(dirname(saved), { recursive: true });
      writeFileSync(saved, source);
      sources++;
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}

for (const { number } of chapters) {
  const folder = `${target}/chapter-${number}`;
  for (const file of readdirSync(folder).filter(f => f.endsWith('.hpp') || f === 'main.cpp')) {
    for (const [, dependency] of readFileSync(`${folder}/${file}`, 'utf8').matchAll(/#include "([^"]+)"/g)) {
      assert(existsSync(resolve(folder, dependency)), `${number}/${file}: missing downloaded dependency ${dependency}`);
    }
  }
  const binary = `${folder}/example`;
  execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', '-pthread', '-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer', `${folder}/main.cpp`, '-o', binary]);
  execFileSync(binary, { stdio: 'inherit', env: { ...process.env, ASAN_OPTIONS: process.env.ASAN_OPTIONS || 'detect_leaks=1' } });
  console.log(`Downloaded chapter ${number}: warnings-as-errors, ASan/UBSan/leaks and relative dependencies passed.`);
}
console.log(`${base.pathname} deployment: ${chapters.length} mounted chapters, ${(chapters.length - 1) * 13 + 14} sections, complete navigation/search, no overflow/runtime errors; ${sources} published sources and ${chapters.length} downloaded sanitizer programs passed.`);
