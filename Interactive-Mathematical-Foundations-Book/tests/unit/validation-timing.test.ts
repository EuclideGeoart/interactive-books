import { expect, it } from 'vitest';
import TimingReporter from '../../scripts/timing-reporter.mjs';

it('accounts for shared setup separately without losing generic assertions or double-counting screenshot wrappers', () => {
  const reporter = new TimingReporter();
  const test = { parent: { project: () => ({ name: 'desktop' }) }, titlePath: () => ['', 'desktop', 'chapters.spec.ts', 'read-only check'], location: { file: process.cwd() + '/tests/e2e/chapters.spec.ts' } };
  const result = { duration: 100, status: 'passed' };
  for (const [phase, duration] of [['setup-navigation', 20], ['setup-hydration', 30], ['navigation', 10], ['axe', 30]] as const)
    reporter.onStepEnd(test, result, { title: 'timing:' + phase, duration, category: 'test.step' });
  reporter.onStepEnd(test, result, { title: 'toHaveScreenshot', duration: 5, category: 'expect' });
  reporter.onStepEnd(test, result, { title: 'toHaveScreenshot wrapper', duration: 5, category: 'test.step' });
  reporter.onTestEnd(test, result);
  expect(reporter.tests[0]!.setupMs).toBe(50);
  expect(reporter.tests[0]!.phasesMs).toEqual({ navigation: 30, hydration: 30, axe: 30, visual: 5, generic: 55 });
  expect(Object.values(reporter.tests[0]!.phasesMs).reduce((sum, ms) => sum + ms, 0)).toBe(150);
});
