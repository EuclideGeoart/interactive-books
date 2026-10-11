// M6-A: real pointermove → next paint, on each new chapter; run under the shared host lock.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { cpus } from 'node:os';

const port = 4473;
const server = spawn(process.execPath, ['scripts/serve-dist.mjs', 'dist', '/', String(port)], { stdio: 'ignore' });
let browser;
const results = [];
const slugs = ['vector-addition', 'vector-scaling', 'vector-norms', 'vector-dot-product', 'vector-projection', 'vector-span', 'vector-basis'];
try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/opt/google/chrome/chrome') ? '/opt/google/chrome/chrome' : undefined) });
  for (const slug of slugs) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${port}/chapters/${slug}/`);
    const stage = page.locator('[data-stage]').first();
    await page.waitForSelector('[data-stage][data-hydrated="true"]');
    await page.evaluate(() => document.fonts.ready);
    await stage.locator('svg.plane').evaluate(e => e.scrollIntoView({ block: 'center' }));
    await page.evaluate(() => {
      window.__linearLatency = [];
      addEventListener('pointermove', () => {
        const begin = performance.now();
        requestAnimationFrame(() => {
          const channel = new MessageChannel();
          channel.port1.onmessage = () => { window.__linearLatency.push(performance.now() - begin); channel.port1.close(); channel.port2.close(); };
          channel.port2.postMessage(0);
        });
      }, true);
    });
    const plane = await stage.locator('svg.plane').boundingBox();
    const ring = await stage.getByRole('button', { name: /^vector v / }).locator('.ring').boundingBox();
    assert(plane && ring, `${slug}: missing geometry`);
    const radius = Number(await stage.getAttribute('data-radius'));
    const scale = Math.min(plane.width, plane.height) / (2 * radius);
    await page.mouse.move(ring.x + ring.width/2, ring.y + ring.height/2);
    await page.mouse.down();
    for (let i = 0; i < 80; i++) {
      const a = i * 2 * Math.PI / 80;
      await page.mouse.move(plane.x + plane.width/2 + 2.5 * scale * Math.cos(a), plane.y + plane.height/2 - 2.5 * scale * Math.sin(a));
      await page.waitForTimeout(4);
    }
    await page.mouse.up();
    await page.waitForTimeout(30);
    const samples = await page.evaluate(() => window.__linearLatency.slice(5).sort((a, b) => a-b));
    assert(samples.length >= 60 && samples.every(Number.isFinite), `${slug}: insufficient latency samples`);
    results.push({ slug, samples: samples.length, p50: samples[Math.floor(samples.length/2)], p95: samples[Math.floor(samples.length*0.95)], max: samples.at(-1), over16_7: samples.filter(n => n > 16.7).length });
    await page.close();
  }
} finally { server.kill(); await browser?.close(); }
const report = { browser: browser.version(), platform: process.platform, cpu: cpus()[0].model.trim(), policy: '1× CPU, half-unit drag grid, 80 real pointer moves; next-paint scheduling included. Synthetic desktop experiment, not a physical touch-device benchmark.', results };
writeFileSync('documentation/M6A_DRAG_MEASUREMENTS.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
