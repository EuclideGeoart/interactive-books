// Representative drag latency (master plan §20: "within one animation frame on typical hardware").
//
//   node scripts/measure-drag-latency.mjs [distDir=dist] [outFile]
//
// Serves dist/ itself, drags the handle of the foundation-demo stage in a real Chromium with synthetic-free mouse
// input (page.mouse), and for every pointermove measures
//   handler→paint : pointermove (capture phase) → end of the next animation frame (rAF + a macrotask after it),
//                   i.e. input until the browser has had the chance to present the updated stage.
// Runs in free-snap mode (every pixel is a new state → worst case for formula re-rendering) and in the default
// whole-number snap mode, at 1× (this machine) and at 4× / 6× CPU throttling (a rough stand-in for mid/low-end phones).
// Throttling is an approximation, not a device measurement.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const [dist = 'dist', outFile] = process.argv.slice(2);
const port = 4453;
const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/opt/google/chrome/chrome') ? '/opt/google/chrome/chrome' : undefined);
const server = spawn(process.execPath, ['scripts/serve-dist.mjs', dist, '/', String(port)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));

const pct = (a, p) => a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
const summarize = xs => { const s = [...xs].sort((a, b) => a - b); return { n: s.length, p50: pct(s, 50), p95: pct(s, 95), max: s[s.length - 1], over16_7: s.filter(x => x > 16.7).length }; };

const results = [];
const browser = await chromium.launch({ executablePath: chrome });
try {
  for (const snap of ['whole', 'free']) {
    for (const throttle of [1, 4, 6]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${port}/foundation/`);
      const stage = page.locator('[data-stage="vector"]').first();
      await stage.waitFor();
      await page.waitForSelector('[data-stage="vector"][data-hydrated="true"]');
      await page.evaluate(() => document.fonts.ready);
      if (snap === 'free') await stage.locator('label.segment', { hasText: /^Free$/ }).click();
      await stage.locator('svg.plane').evaluate(el => el.scrollIntoView({ block: 'center' }));
      await page.evaluate(() => {
        window.__lat = [];
        addEventListener('pointermove', () => {
          const t0 = performance.now();
          requestAnimationFrame(() => { const ch = new MessageChannel(); ch.port1.onmessage = () => window.__lat.push(performance.now() - t0); ch.port2.postMessage(0); });
        }, true);
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
      const box = await stage.locator('svg.plane').boundingBox();
      const ring = await stage.locator('.drag-point .ring').boundingBox();
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2, r = Math.min(box.width, box.height) * 0.4;
      await page.mouse.move(ring.x + ring.width / 2, ring.y + ring.height / 2);
      await page.mouse.down();
      // two slow circles around the origin: ~240 moves, every one a different pixel
      for (let i = 0; i <= 240; i++) {
        const a = (i / 120) * Math.PI;
        await page.mouse.move(cx + r * Math.cos(a), cy - r * Math.sin(a));
        await page.waitForTimeout(4);
      }
      await page.mouse.up();
      const lat = await page.evaluate(() => window.__lat);
      results.push({ snap, cpuThrottle: `${throttle}x`, ...summarize(lat.slice(5)) });
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
const header = `${chromium.name()} ${(await import('node:os')).platform()} ${(await import('node:os')).cpus()[0].model.trim()}`;
const table = results.map(r => `| ${r.snap} | ${r.cpuThrottle} | ${r.n} | ${r.p50.toFixed(1)} | ${r.p95.toFixed(1)} | ${r.max.toFixed(1)} | ${r.over16_7} |`).join('\n');
const text = `${header}\n\n| snap | CPU | moves | p50 ms | p95 ms | max ms | moves > 16.7 ms |\n| --- | --- | --- | --- | --- | --- | --- |\n${table}\n`;
console.log(text);
if (outFile) writeFileSync(outFile, text);
process.exit(0);
