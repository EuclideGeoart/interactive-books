// Run after the source-matched root build, under /tmp/imf-heavy.lock (never acquires a nested lock).
//   flock /tmp/imf-heavy.lock node scripts/measure-probability-input.mjs --locked [--output validation-results/m8-input]
// Software event capture → next rAF + MessageChannel task; not physical input/display latency.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform } from 'node:os';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { freshBuild, productionSignature } from './production-state.mjs';

const warmups = 5, sliderSamples = 80, replaySamples = 20, port = 4476;
function summarize(values) {
  assert(values.length && values.every(v => Number.isFinite(v) && v >= 0), 'Invalid timing samples');
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = p => sorted[Math.ceil(p * sorted.length) - 1];
  return { samples: sorted.length, p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: sorted.at(-1), over16_7: sorted.filter(v => v > 16.7).length };
}
const args = process.argv.slice(2);
let locked = false, check = false, output = 'validation-results/probability-input';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--locked') locked = true;
  else if (args[i] === '--check') check = true;
  else if (args[i] === '--output') { assert(args[i + 1] && !args[i + 1].startsWith('--'), '--output requires a directory'); output = args[++i]; }
  else throw new Error(`Unknown option: ${args[i]}`);
}
if (check) {
  const stats = summarize(Array.from({ length: 100 }, (_, i) => i + 1));
  assert.deepEqual([stats.samples, stats.p50, stats.p95, stats.p99, stats.max], [100, 50, 95, 99, 100]);
  console.log('Static timing-summary check passed; no server or browser launched.');
  process.exit(0);
}
assert(locked, 'First check disk space, then run under flock /tmp/imf-heavy.lock with --locked.');
assert(freshBuild('dist', '/'), 'Root dist is missing or stale; run the production gate before this benchmark.');
const signature = productionSignature('/');
const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/opt/google/chrome/chrome') ? '/opt/google/chrome/chrome' : undefined);
const results = [];
let browser, server;
try {
  server = spawn(process.execPath, ['scripts/serve-dist.mjs', 'dist', '/', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ready, reject) => {
    const timeout = setTimeout(() => reject(new Error('Benchmark server did not become ready')), 10000);
    let stderr = '';
    const finish = callback => { clearTimeout(timeout); server.off('error', failed); server.off('exit', exited); callback(); };
    const failed = error => finish(() => reject(error));
    const exited = code => finish(() => reject(new Error(`Benchmark server exited ${code}: ${stderr}`)));
    server.on('error', failed); server.on('exit', exited);
    server.stderr.on('data', chunk => { stderr += chunk; });
    server.stdout.on('data', chunk => { if (String(chunk).includes('serving ')) finish(ready); });
  });
  browser = await chromium.launch({ executablePath: chrome });
  async function open(slug) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`http://127.0.0.1:${port}/chapters/${slug}/`);
    assert(response?.ok(), `${slug}: production route failed`);
    const stage = page.locator('[data-stage]').first();
    const name = await stage.getAttribute('data-stage');
    await page.locator(`[data-stage="${name}"][data-hydrated="true"]`).waitFor();
    await page.evaluate(() => document.fonts.ready);
    return { page, stage, errors };
  }
  async function install(page, stage, mode, field) {
    await stage.evaluate((root, { mode, field }) => {
      const input = mode === 'slider' ? root.querySelector(`[data-probability-slider="${field}"]`) : root.querySelector('[data-action="replay-samples"]');
      const parameter = mode === 'slider' ? root.querySelector(`[data-param="${field}"] input`) : null;
      if (!input || (mode === 'slider' && !parameter)) throw new Error('Benchmark control is missing');
      const snapshot = () => [root.querySelector('[data-description]')?.textContent, root.querySelector('.inspector')?.textContent, root.querySelector('[data-observed-samples]')?.textContent].join('|');
      const announcement = () => root.querySelector('[data-announcement]')?.textContent;
      const state = window.__probabilityInput = { pending: null, samples: [], arm() {
        if (this.pending && !this.pending.done) throw new Error('Overlapping measurement');
        this.pending = { before: snapshot(), announcement: announcement(), value: parameter?.getAttribute('aria-valuenow'), done: false };
      } };
      const pointer = event => { if (state.pending && !state.pending.done && event.isTrusted) state.pending.pointerStart = performance.now(); };
      const accept = event => {
        const pending = state.pending;
        if (!pending || pending.done || pending.eventStart !== undefined) return;
        pending.eventStart = performance.now();
        pending.trusted = event.isTrusted;
        pending.expected = mode === 'slider' ? Number(input.value) : null;
        requestAnimationFrame(() => {
          const channel = new MessageChannel();
          channel.port1.onmessage = () => {
            const end = performance.now(); // Read the clock before verification overhead.
            channel.port1.close(); channel.port2.close();
            const after = snapshot();
            if (!pending.trusted) pending.error = 'Untrusted browser event';
            else if (root.querySelector('[role="alert"]')) pending.error = 'Input was rejected';
            else if (mode === 'slider' && (pending.pointerStart === undefined || Number(pending.value) === pending.expected || Number(parameter.getAttribute('aria-valuenow')) !== pending.expected || after === pending.before)) pending.error = 'Slider event did not render a changed accepted parameter';
            else if (mode === 'replay' && (announcement() === pending.announcement || after !== pending.before)) pending.error = 'Replay was a no-op or changed deterministic output';
            else state.samples.push({ eventMs: end - pending.eventStart, ...(mode === 'slider' ? { pointerMs: end - pending.pointerStart, value: pending.expected } : {}) });
            pending.done = true;
          };
          channel.port2.postMessage(0);
        });
      };
      input.addEventListener(mode === 'slider' ? 'input' : 'click', accept, true);
      if (mode === 'slider') document.addEventListener('pointermove', pointer, true);
      // Each page is closed after its case, disposing these listeners and state.
    }, { mode, field });
  }
  async function arm(page) { await page.evaluate(() => window.__probabilityInput.arm()); }
  async function completed(page) {
    await page.waitForFunction(() => window.__probabilityInput.pending?.done, null, { timeout: 5000 });
    const error = await page.evaluate(() => window.__probabilityInput.pending.error);
    assert(!error, error);
  }
  async function finishCase(page, errors, expected, details) {
    const raw = await page.evaluate(() => window.__probabilityInput.samples);
    assert.equal(raw.length, expected + warmups, `${details.slug}: missed or extra events`);
    assert.deepEqual(errors, [], `${details.slug}: browser errors`);
    const samples = raw.slice(warmups);
    results.push({ ...details, warmupsDiscarded: warmups, acceptedEvents: raw.length, measuredEvents: samples.length,
      eventToFrameMs: summarize(samples.map(s => s.eventMs)), ...(details.kind === 'slider' ? { pointerToFrameMs: summarize(samples.map(s => s.pointerMs)) } : {}), rawSamples: samples });
    await page.close();
  }
  for (const config of [
    { slug: 'bayes-theorem', field: 'prior', bounds: [5, 80] },
    { slug: 'uniform-gaussian', field: 'lower', bounds: [-3, -.3] },
  ]) {
    const { page, stage, errors } = await open(config.slug);
    if (config.field === 'lower') await stage.locator('[data-preset="normal"]').click();
    const slider = stage.locator(`[data-probability-slider="${config.field}"]`);
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox(); assert(box && box.width > 100, 'Slider has no usable track');
    const domain = await slider.evaluate(e => ({ min: Number(e.min), max: Number(e.max), current: Number(e.value), padding: parseFloat(getComputedStyle(e).paddingLeft) || 0 }));
    // Native Chrome range thumb is 16px; stay away from endpoints. Final accepted values are recorded, not inferred from pixels.
    const x = value => box.x + domain.padding + 8 + (box.width - 2 * domain.padding - 16) * (value - domain.min) / (domain.max - domain.min);
    const y = box.y + box.height / 2;
    await page.mouse.move(x(domain.current), y);
    await page.mouse.down();
    await install(page, stage, 'slider', config.field);
    try {
      for (let i = 0; i < warmups + sliderSamples; i++) {
        await arm(page);
        await page.mouse.move(x(config.bounds[i % 2]), y);
        await completed(page);
      }
    } finally { await page.mouse.up(); }
    await finishCase(page, errors, sliderSamples, { ...config, kind: 'slider', input: 'Trusted Playwright mouse drag → native range input → accepted model render' });
  }
  for (const config of [
    { slug: 'central-limit-theorem', bounds: { n: 100, repetitions: 1000 }, drawsPerReplay: 100000 },
    { slug: 'law-of-large-numbers', bounds: { trials: 4000 }, drawsPerReplay: 4000 },
  ]) {
    const { page, stage, errors } = await open(config.slug);
    await stage.locator('[data-preset="maximum"]').click();
    for (const [field, expected] of Object.entries(config.bounds))
      await page.waitForFunction(({ selector, expected }) => Number(document.querySelector(selector)?.getAttribute('aria-valuenow')) === expected, { selector: `[data-stage="${await stage.getAttribute('data-stage')}"] [data-param="${field}"] input`, expected });
    const button = stage.locator('[data-action="replay-samples"]');
    await button.scrollIntoViewIfNeeded();
    // Drain setup effects before the first replay; listeners are installed before any timed click.
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    await install(page, stage, 'replay');
    for (let i = 0; i < warmups + replaySamples; i++) { await arm(page); await button.click(); await completed(page); }
    await finishCase(page, errors, replaySamples, { ...config, kind: 'replay', seed: 42, population: config.slug === 'central-limit-theorem' ? 'exponential' : 'bernoulli', input: 'Trusted replay click → bounded recomputation and announcement render; output must replay identically' });
  }
  assert(freshBuild('dist', '/') && productionSignature('/') === signature, 'Source or build changed during benchmark');
  const report = { timestamp: new Date().toISOString(), productionSignature: signature, browser: browser.version(), executablePath: chrome ?? 'Installed Playwright default', platform: platform(), cpu: cpus()[0]?.model.trim(), viewport: { width: 1440, height: 900 }, cpuThrottle: '1×, unthrottled', reducedMotion: 'reduce', units: 'milliseconds', percentilePolicy: 'Nearest rank over measured samples; warmups excluded', method: 'Capture-phase trusted pointermove/native input or click → first requestAnimationFrame → MessageChannel task. Assert accepted changed slider value and rendered output, or deterministic replay plus changed announcement. Next-frame scheduling is included; physical input, scanout and presentation completion are not measured. Sequential isolated events measure response, not sustained drag throughput. --locked asserts the caller holds /tmp/imf-heavy.lock.', results };
  mkdirSync(output, { recursive: true });
  const file = resolve(output, 'probability-input.json');
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ file, results: results.map(({ rawSamples, ...result }) => result) }, null, 2));
} finally {
  try { await browser?.close(); } finally {
    if (server && server.exitCode === null) await new Promise(done => { server.once('exit', done); server.kill(); });
  }
}
