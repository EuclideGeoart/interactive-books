import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { availableParallelism, loadavg, freemem, totalmem } from 'node:os';

export default class TimingReporter {
  /** @type {{project?: string, file: string, title: string, status: string, durationMs: number, setupMs: number, phasesMs: Record<string, number>}[]} */
  tests = [];
  steps = new Map();
  setup = new Map();
  onBegin(config, suite) {
    this.started = Date.now();
    this.workers = config.workers;
    this.host = { parallelism: availableParallelism(), loadStart: loadavg(), freeBytesStart: freemem(), totalBytes: totalmem() };
    this.enumeration = suite.allTests().map(test => this.identity(test));
  }
  identity(test) {
    return { project: test.parent.project()?.name, file: relative(process.cwd(), test.location.file), title: test.titlePath().slice(2).join(' › ') };
  }
  onStepEnd(test, result, step) {
    let phase = step.title.startsWith('timing:') ? step.title.slice(7) : step.category === 'expect' && step.title.includes('toHaveScreenshot') ? 'visual' : null;
    if (!phase) return;
    if (phase.startsWith('setup-')) { phase = phase.slice(6); this.setup.set(result, (this.setup.get(result) ?? 0) + step.duration); }
    const phases = this.steps.get(result) ?? {};
    phases[phase] = (phases[phase] ?? 0) + step.duration;
    this.steps.set(result, phases);
  }
  onTestEnd(test, result) {
    const phases = this.steps.get(result) ?? {};
    const setupMs = this.setup.get(result) ?? 0;
    const remainder = Math.max(0, result.duration + setupMs - Object.values(phases).reduce((sum, ms) => sum + ms, 0));
    phases[test.location.file.endsWith('/deployment.spec.ts') ? 'deployment' : test.location.file.endsWith('/chapters.spec.ts') ? 'generic' : 'other'] = remainder;
    this.tests.push({ ...this.identity(test), status: result.status, durationMs: result.duration, setupMs, phasesMs: phases });
    this.steps.delete(result);
    this.setup.delete(result);
  }
  onEnd(result) {
    const path = process.env.BOOK_TIMING_OUTPUT;
    if (!path) throw new Error('Set BOOK_TIMING_OUTPUT when using timing-reporter.mjs');
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ status: result.status, workers: this.workers, wallMs: Date.now() - this.started,
      host: { ...this.host, loadEnd: loadavg(), freeBytesEnd: freemem() }, enumeration: this.enumeration, tests: this.tests }, null, 2) + '\n');
  }
}
