import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import render from 'preact-render-to-string';
import { compile } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import katex from 'katex';
import manifest from '../../../src/parts/p08/manifest.json';
import EvaluationStage from '../../../src/parts/p08/EvaluationStage';
import { derive, type Mode } from '../../../src/parts/p08/lesson';
import { initial } from '../../../src/parts/p08/model/evaluation';
const modes: Mode[] = ['folds', 'curves', 'metrics', 'pipeline', 'reliability'];
describe('Part VIII authored teaching, SSR semantics and physical plot scale', () => {
  for (const [i, chapter] of manifest.chapters.entries()) it(`${chapter.id} has opening experiment, actual Python and five graded corrective exercises`, async () => {
    const source = readFileSync(`src/parts/p08/chapters/${chapter.slug}.mdx`, 'utf8');
    expect(source.indexOf('<Stage')).toBeLessThan(source.indexOf('\n## ')); expect(source).toContain('evaluation.py?raw');
    expect(source).toContain('<CodeFile source={reference}'); expect(source.match(/<ChoiceExercise /g)).toHaveLength(5);
    expect(source.match(/correct:true/g)).toHaveLength(5); expect(source.match(/correct:false/g)).toHaveLength(5);
    await expect(compile(source.replace(/^---[\s\S]*?---\n/, ''), { remarkPlugins: [remarkMath] })).resolves.toBeTruthy();
    for (const formula of source.matchAll(/\$\$([\s\S]*?)\$\$/g)) expect(() => katex.renderToString(formula[1]!, { strict: 'error', throwOnError: true })).not.toThrow();
    const html = render(h(EvaluationStage, { mode: modes[i]!, scope: `test-${chapter.id}` }));
    expect(html).toContain('data-state='); expect(html).toContain('data-numerical='); expect(html).toContain('data-workflow-board');
    expect(html).toContain('Reset experiment'); expect(html).toContain('class="inspector"'); expect(html).not.toContain('NaN'); expect(html).not.toContain('Infinity');
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]); expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => id!.startsWith(`test-${chapter.id}-`))).toBe(true);
    if (modes[i] === 'reliability') {
      expect(html).toContain('data-experiment-record'); expect(html).toContain('aria-label="Complete experiment provenance JSON, scrollable"');
      expect(html).toMatch(/<div[^>]*data-experiment-record[^>]*tabindex="0"[^>]*role="region"/);
      expect(html).not.toMatch(/<pre[^>]*role="region"/);
    }
  });
  it('font physical size and both curve projections follow the authoritative state', () => {
    for (const width of [240, 280, 320, 560, 640]) {
      const a = derive(initial(), width); expect(a.fontSize * width / 640).toBeGreaterThanOrEqual(14);
      for (const p of a.curvePoints) {
        expect(p.trainingY).toBe(245 - 180 * p.model.trainingMse / a.max); expect(p.validationY).toBe(245 - 180 * p.validation.mse / a.max);
        expect(p.x).toBe(90 + 460 * p.n / a.numerical.curves.at(-1)!.n);
      }
      for (const p of a.reliabilityPoints) { expect(p.x).toBe(90 + 460 * p.meanProbability!); expect(p.y).toBe(245 - 180 * p.frequency!); }
    }
  });
  it('retains the warning about selection reuse in learning curves', () => {
    const source = readFileSync('src/parts/p08/chapters/learning-curves-model-selection.mdx', 'utf8');
    expect(source).toContain('already involved in hyperparameter selection');
    expect(source).toContain('not an independent estimate');
  });
});
