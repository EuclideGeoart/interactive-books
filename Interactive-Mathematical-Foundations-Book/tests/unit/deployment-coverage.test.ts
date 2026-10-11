import { describe, expect, it } from 'vitest';
import { expectedRoutes, routeBatches, routeCoverage, visitRoutes } from '../e2e/deployment-coverage';

describe('finite publication coverage, not a 25-page cutoff', () => {
  for (const base of ['http://localhost:4451/', 'http://localhost:4452/math-foundations/']) {
    it(`visits 97 chapters plus all three entry routes exactly once at ${base}`, async () => {
      const expected = expectedRoutes(Array.from({ length: 97 }, (_, i) => 'chapter-' + (i + 1)), base);
      const visited = new Set<string>(), calls: string[] = [];
      const batches = routeBatches(expected);
      expect(batches.flat()).toEqual(expected);
      expect(batches.every(batch => batch.length <= 8)).toBe(true);
      for (const batch of batches) await visitRoutes([...batch, batch[0]!], async path => { calls.push(path); }, visited);
      expect(calls).toEqual(expected);
      expect(calls).toHaveLength(100);
      expect(calls.at(-1)).toContain('chapter-97/');
      expect(calls.every(path => path.startsWith(new URL(base).pathname))).toBe(true);
      expect(routeCoverage(expected, visited)).toMatchObject({ missing: [], unexpected: [] });
    });
  }
  it('reports missing and unexpected routes and never marks a failed visit as successful', async () => {
    const visited = new Set<string>();
    await expect(visitRoutes(['/a/', '/b/', '/c/'], async path => { if (path === '/b/') throw new Error('404'); }, visited)).rejects.toThrow('404');
    visited.add('/unpublished/');
    expect(routeCoverage(['/a/', '/b/', '/c/'], visited)).toMatchObject({ missing: ['/b/', '/c/'], unexpected: ['/unpublished/'] });
  });
  it('rejects missing or escaped chapter slugs', () => {
    for (const slug of ['', '../outside', 'chapter/child', undefined]) expect(() => expectedRoutes([slug as string], 'http://localhost/')).toThrow();
  });
});
