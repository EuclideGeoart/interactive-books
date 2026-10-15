import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { h, type VNode } from 'preact';
import { Fragment, jsx, jsxs } from 'preact/jsx-runtime';
import render from 'preact-render-to-string';
import { compile, evaluate } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import katex from 'katex';
import TreeStage from '../../../src/parts/p04/TreeStage';
import { deriveLab, initialLab, lessonTrace, validateLab, type Mode } from '../../../src/parts/p04/lesson';
import manifest from '../../../src/parts/p04/manifest.json';
import footprint from '../../../documentation/REFERENCE_FOOTPRINT.json';
const modes: Mode[] = ['splits', 'impurity', 'regression', 'bagging', 'forest', 'boosting'];

describe('complete mathematical lessons', () => {
  for (const [i, chapter] of manifest.chapters.entries()) it(`${chapter.id} compiles complete mechanism prose, code and five exercises`, async () => {
    const text = readFileSync(`src/parts/p04/chapters/${chapter.slug}.mdx`, 'utf8');
    expect(text.indexOf('<Stage')).toBeLessThan(text.indexOf('\n## '));
    expect(text).toContain('trees_ensembles.py?raw'); expect(text).toContain('<CodeFile source={reference}');
    expect(text.match(/<ChoiceExercise /g)).toHaveLength(5);
    expect(text.match(/"correct":true/g)).toHaveLength(5); expect(text.match(/"correct":false/g)).toHaveLength(5);
    await expect(compile(text.replace(/^---[\s\S]*?---\n/, ''), { remarkPlugins: [remarkMath] })).resolves.toBeTruthy();
    // Validate literal derivations too; the shell's strict KaTeX macro contract is reused.
    for (const math of text.matchAll(/\$\$([\s\S]*?)\$\$/g)) expect(() => katex.renderToString(math[1]!, { strict: 'error', throwOnError: true })).not.toThrow();
    const html = render(h(TreeStage, { scope: `test-${chapter.id}`, mode: modes[i]! }));
    expect(html).toContain('Reset experiment'); expect(html).toContain('data-formula-label'); expect(html).toContain('class="inspector"');
    expect(html).toContain('Source predictions'); expect(html).not.toContain('NaN'); expect(html).not.toContain('Infinity');
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(v => v[1]);
    expect(new Set(ids).size).toBe(ids.length); expect(ids.every(id => id!.startsWith(`test-${chapter.id}-`))).toBe(true);
  });
  for (const mode of modes) it(`${mode}: selected frame equations and geometry follow its numeric state`, () => {
    for (const width of [280, 560]) for (const frame of lessonTrace(initialLab(mode), mode)) {
      const a = deriveLab(frame.state, mode, width);
      for (const f of a.formulas) expect(() => katex.renderToString(f.tex, { strict: 'error', throwOnError: true })).not.toThrow();
      expect(a.fontSize * width / 560).toBeGreaterThanOrEqual(14);
      a.plot.points.forEach((p, i) => {
        const x = a.plot.regression ? i + 1 : p.x[0]!, y = a.plot.regression ? p.y : p.x[1]!;
        expect(p.cx).toBeCloseTo(65 + (x - a.plot.xmin) * a.plot.sx, 12);
        expect(p.cy).toBeCloseTo(440 - (y - a.plot.ymin) * a.plot.sy, 12);
        if (a.plot.regression) expect(p.predictionY).toBeCloseTo(440 - (p.prediction! - a.plot.ymin) * a.plot.sy, 12);
      });
      if (a.ensemble) expect(a.query).toBe(a.treeVotes.length ? Number(a.treeVotes.filter(v => v.value === 1).length > a.treeVotes.length / 2) : null);
      if (a.boosted) expect(a.metric.value).toBeCloseTo(a.predictionRows.reduce((sum, r) => sum + r.residual! ** 2, 0) / (2 * a.predictionRows.length), 14);
    }
  });
  it('recursive SSR draws actual node identities and distinct role glyphs without floating labels', () => {
    const html = render(h(TreeStage, { scope: 'geometry', mode: 'boosting' }));
    expect(html).toContain('data-observation-glyph'); expect(html).toContain('data-prediction-glyph');
    const plot = html.match(/<svg[^>]*data-plot[^>]*>([\s\S]*?)<\/svg>/)![1]!;
    expect(plot.match(/<text /g)).toHaveLength(1);
    expect(plot).toContain('Source row index'); expect(html).toContain('data-residual-row="1-a1"');
    expect(html).toContain('data-tree-node="root"');
  });
  it('bounded fieldsets, wrapped legends and inspectors preserve real overflow detection', () => {
    const css = readFileSync('src/parts/p04/stage.css', 'utf8');
    expect(css).toContain('min-inline-size:0'); expect(css).toContain('overflow-wrap:anywhere');
    expect(css).toContain('overflow-x:auto'); expect(css).not.toContain('overflow:hidden');
    expect(css).toContain('.p04-lab .inspector dd { white-space:normal');
  });
  it('Part manifest and frozen reference guards remain integration-safe', () => {
    expect(manifest.chapters.map(c => c.id)).toEqual(Array.from({ length: 6 }, (_, i) => `III-${i + 20}`));
    for (const [path, hash] of Object.entries(footprint.files)) expect(createHash('sha256').update(readFileSync(path)).digest('hex'), path).toBe(hash);
    const oracle = JSON.parse(readFileSync('oracle/p04/manifest.json', 'utf8'));
    expect(oracle.selfTests).toEqual(['test_trees.py']); expect(oracle.goldenChecks).toEqual(['generate_fixtures.py']);
  });
});

it('scientific-notation thresholds keep their actual numeric meaning in the active formula', () => {
  const s = { ...initialLab('splits'), threshold: 1e-8 };
  const a = deriveLab(s, 'splits');
  expect(a.formulas[0]!.tex).toContain('1\\times10^{-8}');
  expect(a.inspected.left.n).toBe(0);
  expect(() => katex.renderToString(a.formulas[0]!.tex, { strict: 'error', throwOnError: true })).not.toThrow();
});
it('bounded UI inputs reject invalid state without changing the canonical rows', () => {
  const s = initialLab('splits');
  expect(() => deriveLab({ ...s, probe: [Infinity, 0] }, 'splits')).toThrow();
  expect(() => deriveLab({ ...s, rows: s.rows.map(r => ({ ...r, x: [11, 0] })) }, 'splits')).toThrow();
  expect(s.rows[0]!.x).toEqual([1, 1]);
});

it('the direct-tree query names and highlights its actual terminal leaf', () => {
  const s = initialLab('splits'), a = deriveLab(s, 'splits');
  expect(a.queryLeaf).toBe('rootL');
  const html = render(h(TreeStage, { scope: 'query-terminal', mode: 'splits' }));
  expect(html).toContain('data-tree-node="rootL" data-query-leaf="true"');
  expect(html).toContain('Query terminates here.');
});

it('every prose table renders semantic headers and stable unique labels for shared overflow synchronization', async () => {
  const labels: string[] = [], ids: string[] = [];
  let total = 0;
  for (const chapter of manifest.chapters) {
    const source = readFileSync('src/parts/p04/chapters/' + chapter.slug + '.mdx', 'utf8');
    const blocks = [...source.matchAll(/<div[^>]*data-p04-prose-table[^>]*>[\s\S]*?<\/div>/g)];
    const withoutTables = source.replace(/<div[^>]*data-p04-prose-table[^>]*>[\s\S]*?<\/div>/g, '');
    expect(withoutTables, chapter.id).not.toMatch(/^\|/m);
    for (const block of blocks) {
      const mdx = await evaluate(block[0], { Fragment, jsx, jsxs, remarkPlugins: [remarkGfm] });
      const html = render(mdx.default({}) as VNode);
      expect(html).toContain('class="table-scroll"');
      // These are authored initial attributes; BaseLayout synchronizes fitting
      // wrappers to tabindex=-1 with no region/name, so this is not a runtime assertion.
      expect(html).toContain('tabindex="0"'); expect(html).toContain('role="region"');
      const label = html.match(/data-scrollable="([^"]+)"/)![1]!, id = html.match(/\sid="([^"]+)"/)![1]!;
      expect(html).toContain('aria-label="' + label + '"');
      expect(label).toContain(chapter.id); labels.push(label); ids.push(id);
      expect(html.match(/<table(?:\s|>)/g)).toHaveLength(1);
      expect(html).toContain('<thead>'); expect(html).toContain('<tbody>');
      const rows = block[0].match(/^\|.*$/gm)!;
      const columns = rows[0]!.split('|').slice(1, -1).length;
      expect(html.match(/<th(?:\s|>)/g)).toHaveLength(columns);
      expect(html.match(/<tr(?:\s|>)/g)).toHaveLength(rows.length - 1);
      expect(html.match(/<td(?:\s|>)/g)).toHaveLength(columns * (rows.length - 2));
      if (chapter.id === 'III-25') {
        expect(columns).toBe(5);
        for (const literal of ['[−0.25,−0.25,0.25,0.25]', '[0.125,0.125,1.875,1.875]', '0.0078125']) expect(html).toContain(literal);
        expect(html).toMatch(/<th(?:\s[^>]*)?>Half MSE<\/th>/);
      }
      total++;
    }
  }
  expect(total).toBe(5); expect(new Set(labels).size).toBe(total); expect(new Set(ids).size).toBe(total);
});


it('sparse query features reject before zero-tree or mean-only lesson geometry', () => {
  for (const mode of ['splits', 'impurity', 'regression', 'bagging', 'forest', 'boosting'] as const) {
    for (const index of [0, 1]) {
      const probe: [number, number] = [1, 1];
      Reflect.deleteProperty(probe, index);
      const state = { ...initialLab(mode), treeCount: 0, stages: 0, probe };
      expect(() => validateLab(state, mode)).toThrow(RangeError);
      expect(() => deriveLab(state, mode)).toThrow(RangeError);
      expect(index in probe).toBe(false);
      const serialized = JSON.parse(JSON.stringify(state)) as typeof state;
      expect(() => deriveLab(serialized, mode)).toThrow(RangeError);
    }
  }
});
