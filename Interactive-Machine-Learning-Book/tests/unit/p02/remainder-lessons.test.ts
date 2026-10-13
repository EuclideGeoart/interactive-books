import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import render from 'preact-render-to-string';
import { compile } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import katex from 'katex';
import { traceFrom } from '../../../src/platform/trace';
import { initialFit, fitStep, type FitMode } from '../../../src/parts/p02/model/fit';
import { initialClassification, classificationStep, type ClassificationMode } from '../../../src/parts/p02/model/classification';
import { deriveFitLesson } from '../../../src/parts/p02/fit-lesson';
import { deriveClassificationLesson } from '../../../src/parts/p02/classification-lesson';
import FitStage from '../../../src/parts/p02/FitStage';
import ClassificationStage from '../../../src/parts/p02/ClassificationStage';
import manifest from '../../../src/parts/p02/manifest.json';
import footprint from '../../../documentation/REFERENCE_FOOTPRINT.json';

const fitModes: FitMode[] = ['least-squares', 'descent', 'multiple', 'polynomial', 'regularization'];
const classModes: ClassificationMode[] = ['logistic', 'threshold', 'metrics', 'softmax'];

describe('one authoritative state and numerical projections', () => {
  for (const mode of fitModes) it(`fit ${mode} has strict equations, row parity, equal scales and readable plot text`, () => {
    const state = initialFit(mode), a = deriveFitLesson(state, mode, 280);
    for (const formula of a.formulas) expect(() => katex.renderToString(formula.tex, { strict: 'error', throwOnError: true })).not.toThrow();
    a.plot.points.forEach(p => {
      expect(p.cx).toBeCloseTo(280 + a.plot.scale * p.x, 12);
      expect(p.cy).toBeCloseTo(280 - a.plot.scale * p.y, 12);
      expect(p.py).toBeCloseTo(280 - a.plot.scale * p.prediction, 12);
    });
    expect(a.fontSize * 280 / 560).toBeGreaterThanOrEqual(14);
    expect(a.scalars.find(r => r.key === 'mse')!.value).toBe(a.mse);
    a.rows.forEach(r => expect(r.residual).toBeCloseTo(r.prediction - r.y, 12));
    if (a.surface) {
      // Each contour actually satisfies the active objective, independent of SVG shape.
      const [path] = a.surface.contours;
      const coordinates = path!.match(/[ML]([^ML]+)/g)!;
      coordinates.forEach(pair => { const [cx, cy] = pair.slice(1).split(',').map(Number); const w = (cx! - 280) / a.surface!.scale, b = (280 - cy!) / a.surface!.scale;
        const loss = state.samples.reduce((sum, r) => sum + (w * r.x + b - r.y) ** 2, 0) / state.samples.length;
        expect(loss).toBeCloseTo(a.optimum!.mse + .2, 10);
      });
    }
  });
  for (const mode of classModes) it(`classification ${mode} has strict equations and score/count/gradient projections`, () => {
    const a = deriveClassificationLesson(initialClassification(), mode, 280);
    a.formulas.forEach(formula => expect(() => katex.renderToString(formula.tex, { strict: 'error', throwOnError: true })).not.toThrow());
    expect(a.fontSize * 280 / 560).toBeGreaterThanOrEqual(14);
    if (a.counts) {
      expect(a.counts.tp + a.counts.fp + a.counts.tn + a.counts.fn).toBe(a.rows.length);
      a.rows.forEach(r => { expect(r.prediction).toBe(Number(r.score >= .5)); expect(r.cy).toBe(470 - 380 * r.score); });
    }
    if (a.multi) { expect(a.inspector[1]!.value).toBe('2 × 3'); a.probabilitySums.forEach(sum => expect(sum).toBeCloseTo(1, 14)); }
  });
  it('names loss-surface points outside the SVG with distinct role glyphs at unchanged centers', () => {
    const a = deriveFitLesson(initialFit('descent'), 'descent');
    const html = render(h(FitStage, { scope: 'surface-legend', mode: 'descent' }));
    const surface = html.match(/<svg[^>]*data-loss-surface[^>]*>([\s\S]*?)<\/svg>/)![1]!;
    const legend = html.match(/<ul[^>]*class="p02-parameter-legend"[^>]*>([\s\S]*?)<\/ul>/)![1]!;
    expect(surface).toContain('MSE contours at optimum plus 0.2, 1 and 4; current and next weight and bias.');
    for (const p of a.surface!.points) {
      const point = surface.match(new RegExp(`<g data-parameter-point="${p.id}"[^>]*>([\\s\\S]*?)</g>`))![1]!;
      expect(point).not.toContain('<text');
      expect(point).toContain(`<title>${p.id}: weight`);
      if (p.id === 'next') {
        expect(point).toContain(`class="p02-next" x="${p.cx - 7}" y="${p.cy - 7}" width="14" height="14"`);
        expect(point).not.toContain('<circle');
        expect(legend).toContain('class="p02-next" x="3" y="3" width="14" height="14"');
      } else {
        expect(point).toContain(`cx="${p.cx}" cy="${p.cy}" r="7"`);
        expect(point).toContain(`class="${p.id === 'optimum' ? 'p02-prediction' : 'p02-observation'}"`);
      }
      expect(legend).toContain(`data-parameter-legend="${p.id}" data-weight="${p.x}" data-bias="${p.y}"`);
    }
    expect(legend).toContain('Current'); expect(legend).toContain('Next'); expect(legend).toContain('Optimum');
    expect(surface).toContain('filled green square');
    expect(html).toContain('Points at identical coordinates overlap.');
  });
  it('shifted softmax equation, rows, probabilities and gradient agree with active shift', () => {
    const base = initialClassification(), zero = deriveClassificationLesson(base, 'softmax'), shifted = deriveClassificationLesson({ ...base, shift: 1000 }, 'softmax');
    expect(shifted.formulas[0]!.tex).toContain('Z=XW+c'); expect(shifted.formulas[0]!.tex).toContain('c\\approx1000');
    expect(shifted.formulas[0]!.label).toContain('c=1000');
    zero.multi!.logits.forEach((row, i) => row.forEach((z, c) => expect(shifted.multi!.logits[i]![c]).toBe(z + 1000)));
    expect(shifted.multi!.probabilities).toEqual(zero.multi!.probabilities); expect(shifted.multi!.gradient).toEqual(zero.multi!.gradient);
  });
  it('above-all null is an explicit policy, including a score of one', () => {
    const a = deriveClassificationLesson({ ...initialClassification(), scores: [1, .8, .8, .4, .1], threshold: null }, 'metrics');
    expect(a.thresholdLabel).toContain('+∞'); a.rows.forEach(r => expect(r.prediction).toBe(0));
    expect(a.counts!.precision.value).toBeNull(); expect(a.counts!.recall.value).toBe(0); expect(a.counts!.f1.value).toBe(0);
  });
  it('constant-x representative only replaces current coefficients on the explicit fit action', () => {
    const s = initialFit('least-squares'), constant = { ...s, samples: s.samples.map(r => ({ ...r, x: 2 })) };
    const before = deriveFitLesson(constant, 'least-squares'); expect(before.coefficients).toEqual([s.bias, s.weight]);
    expect(before.optimum!.unique).toBe(false); expect(before.formulas[2]!.tex).toContain('S_{xx}=0');
    expect(deriveFitLesson(fitStep(constant, 'least-squares'), 'least-squares').coefficients).toEqual([.8, 0]);
  });
  it('detached traces support selected-frame edits without history mutation', () => {
    const original = initialClassification(), after = classificationStep(original, 'logistic');
    const frames = traceFrom([{ state: original }, { state: after }]);
    const edited = { ...frames[1]!.state, weights: [0.5, frames[1]!.state.weights[1]!] };
    expect(deriveClassificationLesson(edited, 'logistic').binary!.logits[2]).toBe(.5);
    expect(frames[1]!.state.weights[0]).toBeCloseTo(-.02, 12);
    expect(Object.isFrozen(frames[0]!.state.X[0])).toBe(true);
    expect(frames[0]!.state.X).not.toBe(original.X);
    expect(() => { (frames[0]!.state.X[0] as number[])[1] = 99; }).toThrow();
  });
});

describe('Part publication and frozen reference guards', () => {
  it('preserves all thirteen frozen reference source hashes', () => {
    for (const [file, sha] of Object.entries(footprint.files)) expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(sha);
  });
  it('preserves frozen registration and oracle commands while discovering all nine remainder chapters', () => {
    expect(manifest.chapters[0]).toEqual({ id: 'III-07', slug: 'linear-regression' });
    expect(manifest.chapters.slice(1).map(c => c.id)).toEqual(Array.from({ length: 9 }, (_, i) => `III-${String(i + 8).padStart(2, '0')}`));
    const oracle = JSON.parse(readFileSync('oracle/p02/manifest.json', 'utf8'));
    for (const [key, values] of Object.entries(footprint.requiredOracleEntries)) for (const name of values) expect(oracle[key]).toContain(name);
  });
  for (const [index, chapter] of manifest.chapters.slice(1).entries()) it(`${chapter.id} has complete MDX, opening mechanism, real Python and five feedback exercises`, async () => {
    const source = readFileSync(`src/parts/p02/chapters/${chapter.slug}.mdx`, 'utf8');
    expect(source.indexOf('<Stage')).toBeLessThan(source.indexOf('\n## '));
    expect(source.match(/<ChoiceExercise /g)).toHaveLength(5);
    expect(source.match(/"correct": true/g)).toHaveLength(5); expect(source.match(/"correct": false/g)).toHaveLength(5);
    expect(source).toContain('reference.py?raw'); expect(source).toContain('<CodeFile source={reference}');
    expect(source.length).toBeGreaterThan(7000);
    await expect(compile(source.replace(/^---[\s\S]*?---\n/, ''), { remarkPlugins: [remarkMath] })).resolves.toBeTruthy();
    const html = index < 5 ? render(h(FitStage, { scope: `test-${chapter.id}`, mode: fitModes[index]! })) : render(h(ClassificationStage, { scope: `test-${chapter.id}`, mode: classModes[index - 5]! }));
    expect(html).toContain('Reset experiment'); expect(html).toContain('data-provenance'); expect(html).toContain('data-current-frame'); expect(html).toContain('class="inspector"');
    expect(html).toContain('data-formula-label');
    expect(html).not.toContain('NaN'); expect(html).not.toContain('Infinity');
  });
});
