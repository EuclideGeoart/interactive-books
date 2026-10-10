/**
 * Layer 1 — content/schema validation (master plan §12.1): chapter files ⇄ curriculum, required metadata,
 * every formula in MDX parses in strict KaTeX with the shared macros, every referenced file exists.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { katexMacros } from '../../src/math/katex-macros.mjs';
import rehypeFailOnMathError from '../../src/math/rehype-fail-on-math-error.mjs';
import { allChapters, findChapter } from '../../src/curriculum/queries';

const dir = 'src/content/chapters';
const files = readdirSync(dir).filter(f => f.endsWith('.mdx'));
const read = (f: string) => readFileSync(join(dir, f), 'utf8');

function frontmatter(source: string): Record<string, string> {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(source);
  expect(m, 'frontmatter present').not.toBeNull();
  return Object.fromEntries(m![1]!.split('\n').map(line => { const i = line.indexOf(':'); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; }));
}
const body = (source: string) => source.replace(/^---\n[\s\S]*?\n---\n/, '');

describe('chapter files ⇄ curriculum', () => {
  it('there is at least the foundation demo, and every file has the required metadata', () => {
    expect(files).toContain('foundation-demo.mdx');
    for (const f of files) {
      const meta = frontmatter(read(f));
      for (const key of ['kind', 'title', 'hero', 'lede', 'description']) expect(meta[key], `${f}: ${key}`).toBeTruthy();
      expect(['chapter', 'demo']).toContain(meta.kind);
      expect(meta.description!.length, `${f}: description length`).toBeGreaterThanOrEqual(20);
      expect(meta.description!.length).toBeLessThanOrEqual(300);
    }
  });
  it('the foundation demo is NOT a curriculum chapter: it has kind "demo" and no curriculumId', () => {
    const meta = frontmatter(read('foundation-demo.mdx'));
    expect(meta.kind).toBe('demo');
    expect(meta.curriculumId).toBeUndefined();
  });
  it('every kind:chapter file names an available curriculum chapter, and every available chapter has exactly one file', () => {
    const chapterFiles = files.filter(f => frontmatter(read(f)).kind === 'chapter');
    const claimed = chapterFiles.map(f => frontmatter(read(f)).curriculumId!);
    for (const id of claimed) expect(findChapter(id)?.chapter.status, id).toBe('available');
    const available = allChapters.filter(r => r.chapter.status === 'available').map(r => r.id);
    expect([...claimed].sort()).toEqual([...available].sort());
    for (const r of allChapters.filter(r => r.chapter.status === 'available')) expect(files, r.id).toContain(`${r.chapter.slug}.mdx`);
  });
  it('a chapter\'s title is the curriculum title verbatim (the page title, the map and the pager must agree)', () => {
    for (const f of files.filter(f => frontmatter(read(f)).kind === 'chapter')) {
      const meta = frontmatter(read(f));
      expect(meta.title!.replace(/^"|"$/g, ''), f).toBe(findChapter(meta.curriculumId!)!.chapter.title);
    }
  });
  it('the hero emphasis marker is balanced (an even number of asterisks)', () => {
    for (const f of files) expect((frontmatter(read(f)).hero!.match(/\*/g) ?? []).length % 2, f).toBe(0);
  });
});

describe('every formula in the MDX renders in strict KaTeX', () => {
  for (const f of files) {
    it(f, () => {
      const text = body(read(f));
      const display = [...text.matchAll(/\$\$([\s\S]+?)\$\$/g)].map(m => m[1]!.trim());
      const inline = [...text.replace(/\$\$[\s\S]+?\$\$/g, '').matchAll(/(?<![\\$])\$([^$\n]+?)\$/g)].map(m => m[1]!.trim());
      expect(display.length + inline.length).toBeGreaterThan(0);
      for (const tex of [...display, ...inline]) {
        expect(() => katex.renderToString(tex, { throwOnError: true, strict: 'error', macros: katexMacros(), displayMode: display.includes(tex) }), tex).not.toThrow();
      }
    });
  }
});

describe('referenced files exist', () => {
  it('?raw imports (code samples) point at real files', () => {
    for (const f of files) {
      for (const m of read(f).matchAll(/from '([^']+)\?raw'/g)) {
        expect(existsSync(join(dir, m[1]!)), `${f}: ${m[1]}`).toBe(true);
      }
    }
  });
  it('the Python sources shown on the page are the ones the oracle tests execute', () => {
    const page = read('foundation-demo.mdx');
    expect(page).toContain('code/python/vector_magnitude.py?raw');
    expect(page).toContain('code/python/vector_magnitude_numpy.py?raw');
    expect(readFileSync('oracle/test_vector2_oracle.py', 'utf8')).toContain('vector_magnitude.py');
    expect(readFileSync('oracle/test_vector2_oracle.py', 'utf8')).toContain('vector_magnitude_numpy.py');
  });
  it('every Python file a chapter shows (?raw) is executed by an oracle test, so the code on the page is known to run', () => {
    const oracleTests = readdirSync('oracle').filter(f => /^test_.*\.py$/.test(f)).map(f => readFileSync(join('oracle', f), 'utf8')).join('\n');
    for (const f of files) {
      for (const m of read(f).matchAll(/from '([^']+\.py)\?raw'/g)) {
        const name = m[1]!.split('/').at(-1)!;
        expect(oracleTests, `${f}: ${name} is never executed by oracle/test_*.py`).toContain(name);
      }
    }
  });
  it('every oracle (oracle/*_oracle.py) writes a fixture under fixtures/ and a TypeScript parity test reads it', () => {
    const parity = readdirSync('tests/unit').filter(f => f.includes('parity')).map(f => readFileSync(join('tests/unit', f), 'utf8')).join('\n');
    for (const f of readdirSync('oracle').filter(f => f.endsWith('_oracle.py') && !f.startsWith('test_'))) {
      const src = readFileSync(join('oracle', f), 'utf8');
      const fixtures = [...src.matchAll(/([\w.-]+\.fixtures\.json)/g)].map(m => m[1]!);
      expect(fixtures.length, `${f} names a fixture`).toBeGreaterThan(0);
      for (const fx of fixtures) { expect(existsSync(join('fixtures', fx)), `${fx} exists`).toBe(true); expect(parity, `${fx} is read by a parity test`).toContain(fx); }
      expect(src, `${f} supports --check`).toContain('--check');
    }
  });
  it('the fixture consumed by the TypeScript parity test is the one the oracle writes', () => {
    expect(existsSync('fixtures/vector2.fixtures.json')).toBe(true);
    expect(readFileSync('oracle/vector2_oracle.py', 'utf8')).toContain('vector2.fixtures.json');
    expect(readFileSync('tests/unit/vector2.parity.test.ts', 'utf8')).toContain('fixtures/vector2.fixtures.json');
  });
});

describe('a malformed formula is a build error, not a shipped red span', () => {
  const run = (messages: { source?: string | null; reason?: string; line?: number | null; cause?: { message?: string } }[]) => rehypeFailOnMathError()({}, { path: 'x.mdx', messages });
  it('passes when rehype-katex reported nothing (and ignores other plugins\' messages)', () => {
    expect(() => run([])).not.toThrow();
    expect(() => run([{ source: 'remark-lint', reason: 'style' }])).not.toThrow();
  });
  it('throws, naming the file, line and KaTeX reason, when rehype-katex reported a failure', () => {
    expect(() => run([{ source: 'rehype-katex', line: 12, reason: 'Could not render math with KaTeX', cause: { message: 'Undefined control sequence: \\undefinedmacro' } }])).toThrow(/x\.mdx[\s\S]*line 12[\s\S]*Undefined control sequence/);
  });
});
