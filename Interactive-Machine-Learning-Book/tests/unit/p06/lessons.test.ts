import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { h, type VNode } from 'preact';
import render from 'preact-render-to-string';
import { Fragment, jsx, jsxs } from 'preact/jsx-runtime';
import { compile, evaluate } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import katex from 'katex';
import PCAStage from '../../../src/parts/p06/PCAStage';
import { deriveLab, initialLab, movePoint, pointerPoint, preset, editLabPoint, PLANE, type Mode } from '../../../src/parts/p06/lesson';
import { componentTrace } from '../../../src/parts/p06/model/pca';
import manifest from '../../../src/parts/p06/manifest.json';
const modes: Mode[] = ['covariance', 'eigenpairs', 'reconstruction'];

describe('complete Part VI teaching and geometry', () => {
  for (const [i, chapter] of manifest.chapters.entries()) it(`${chapter.id}: opening interaction, literal derivation, actual Python and five corrective exercises`, async () => {
    const source = readFileSync(`src/parts/p06/chapters/${chapter.slug}.mdx`, 'utf8');
    expect(source.indexOf('<Stage')).toBeLessThan(source.indexOf('\n## ')); expect(source).toContain('pca.py?raw');
    expect(source).toContain('<CodeFile source={reference}'); expect(source.match(/<ChoiceExercise /g)).toHaveLength(5);
    expect(source.match(/correct:true/g)).toHaveLength(5); expect(source.match(/correct:false/g)).toHaveLength(5);
    await expect(compile(source.replace(/^---[\s\S]*?---\n/, ''), { remarkPlugins: [remarkMath] })).resolves.toBeTruthy();
    for (const formula of source.matchAll(/\$\$([\s\S]*?)\$\$/g)) expect(() => katex.renderToString(formula[1]!, { strict: 'error', throwOnError: true })).not.toThrow();
    const html = render(h(PCAStage, { mode: modes[i]!, scope: `test-${chapter.id}` }));
    expect(html).toContain('Reset experiment'); expect(html).toContain('data-formula-label'); expect(html).toContain('class="inspector"');
    expect(html).toContain('data-pca-plane'); expect(html).toContain('<title'); expect(html).toContain('<desc');
    expect(html).not.toContain('NaN'); expect(html).not.toContain('Infinity');
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]); expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => id!.startsWith(`test-${chapter.id}-`))).toBe(true);
  });
  it('formulas, labels, equal-unit geometry and touch hit sizes derive from each displayed trace state', () => {
    for (const width of [240, 280, 560, 640]) for (const frame of componentTrace(initialLab())) {
      const a = deriveLab(frame.state, width);
      expect(a.fontSize * width / PLANE.size).toBeGreaterThanOrEqual(14);
      expect(2 * a.hitRadius * width / PLANE.size).toBeGreaterThanOrEqual(44);
      a.formulas.forEach(f => expect(() => katex.renderToString(f.tex, { strict: 'error', throwOnError: true })).not.toThrow());
      a.points.forEach(p => {
        expect(p.cx).toBe(320 + 32 * p.x[0]); expect(p.cy).toBe(320 - 32 * p.x[1]);
        expect(p.shadow!.cx).toBe(320 + 32 * p.row!.reconstructed[0]); expect(p.shadow!.cy).toBe(320 - 32 * p.row!.reconstructed[1]);
        expect(p.residualLine).toEqual({ x1: p.cx, y1: p.cy, x2: p.shadow!.cx, y2: p.shadow!.cy });
      });
      a.axes.forEach(axis => { expect(axis.x2 - axis.x1).toBeCloseTo(14 * 32 * axis.v[0], 12); expect(axis.y2 - axis.y1).toBeCloseTo(-14 * 32 * axis.v[1], 12); });
    }
  });
  it('pointer, keyboard and numeric edits agree on the same 0.1 lattice and maintain bounds', () => {
    const s = initialLab(), numeric = editLabPoint(s, 'a', { x: -1.5 });
    const keyboard = movePoint(s, 'a', 'ArrowRight', true);
    const pointer = pointerPoint(320 + 32 * -1.5, 320 - 32 * -1, { left: 0, top: 0, width: 640, height: 640 });
    expect(editLabPoint(s, 'a', pointer)).toEqual(numeric); expect(keyboard).toEqual(numeric);
    const letterboxed = pointerPoint(320 + 32 * -1.5 + 20, 320 - 32 * -1, { left: 0, top: 0, width: 680, height: 640 });
    expect(letterboxed).toEqual(pointer);
    expect(pointerPoint(-1e4, 1e4, { left: 0, top: 0, width: 640, height: 640 })).toEqual({ x: -5, y: -5 });
    expect(() => pointerPoint(0, 0, { left: 0, top: 0, width: 0, height: 10 })).toThrow();
    expect(() => editLabPoint(s, 'a', { x: 5.1 })).toThrow(); expect(() => deriveLab(s, NaN)).toThrow();
  });
  it('degenerate geometry uses actual status/reasons and no fabricated numeric outputs', () => {
    for (const name of ['constant', 'isotropic', 'line', 'singleton'] as const) {
      const a = deriveLab(preset(initialLab(), name));
      if (name === 'singleton') { expect(a.numerical.status).toBe('undefined'); expect(a.axes).toEqual([]); expect(a.points[0]!.shadow).toBeNull(); }
      else expect(a.numerical.status).toBe('defined');
      if (name === 'isotropic') expect(a.ambiguity).toContain('Repeated eigenvalues');
      if (name === 'constant') expect(a.ambiguity).toContain('ratios are undefined');
      a.formulas.forEach(f => expect(() => katex.renderToString(f.tex, { strict: 'error', throwOnError: true })).not.toThrow());
    }
  });
  it('prose tables render semantic cells inside labelled bounded wrappers', async () => {
    const labels: string[] = [];
    for (const chapter of manifest.chapters) {
      const text = readFileSync(`src/parts/p06/chapters/${chapter.slug}.mdx`, 'utf8');
      const blocks = [...text.matchAll(/<div[^>]*data-p06-prose-table[^>]*>[\s\S]*?<\/div>/g)]; expect(blocks).toHaveLength(1);
      expect(text.replace(/<div[^>]*data-p06-prose-table[^>]*>[\s\S]*?<\/div>/g, '')).not.toMatch(/^\|/m);
      for (const block of blocks) {
        const mdx = await evaluate(block[0], { Fragment, jsx, jsxs, remarkPlugins: [remarkGfm] });
        const html = render(mdx.default({}) as VNode);
        expect(html).toContain('class="table-scroll"'); expect(html).toContain('<thead>'); expect(html).toContain('<tbody>');
        const label = html.match(/data-scrollable="([^"]+)"/)![1]!; labels.push(label); expect(label).toContain(chapter.id);
        const rows = block[0].match(/^\|.*$/gm)!, columns = rows[0]!.split('|').slice(1, -1).length;
        expect(html.match(/<th(?:\s|>)/g)).toHaveLength(columns); expect(html.match(/<td(?:\s|>)/g)).toHaveLength(columns * (rows.length - 2));
      }
    }
    expect(new Set(labels).size).toBe(3);
  });
});
