import { test, expect } from '@playwright/test';
import { drawChain } from '../../src/visualizers/chaining/adapter';
import { chainState, chainTrace, type ChainOperation } from '../../src/visualizers/chaining/model';
import { teachingHash } from '../../src/visualizers/hashing/hash';

const collisions: [string, number][] = [];
for (let a = 97; a <= 122 && collisions.length < 8; a++)
  for (let b = 97; b <= 122 && collisions.length < 8; b++) {
    const key = String.fromCharCode(a, b);
    if (teachingHash(key) % 16 === 1) collisions.push([key, collisions.length]);
  }

for (const [operation, entries, key] of [
  ['insert', collisions.slice(0, 6), collisions[6]![0]],
  ['erase', collisions, collisions[4]![0]],
  ['rehash', collisions, 'a'],
] as [ChainOperation, [string, number][], string][]) {
  test(`Chaining ${operation}: routes avoid nodes through every ownership transition`, async ({ page }) => {
    const trace = chainTrace(operation, chainState(entries), key, 9);
    // Every canonical state, including detach/reconnect and both bucket arrays.
    for (const view of ['logical', 'memory'] as const) {
      for (const [index, state] of [trace.initial, ...trace.steps.map(step => step.state)].entries()) {
        await page.setContent(`<style>body{margin:0}.scroll{width:100%;max-height:500px;overflow:auto}</style><div class="scroll">${drawChain(state, 'routing', view, null)}</div>`);
        const hits = await page.locator('svg').evaluate(svg => {
          const boxes = [...svg.querySelectorAll<SVGRectElement>('[data-node] rect')].map(rect => ({
            id: rect.parentElement!.getAttribute('data-node'), box: rect.getBBox(),
          }));
          const result: string[] = [];
          for (const path of svg.querySelectorAll<SVGPathElement>('.reference-arrow')) {
            for (let distance = 1; distance < path.getTotalLength(); distance += 4) {
              const point = path.getPointAtLength(distance);
              for (const { id, box } of boxes) if (point.x > box.x + 1 && point.x < box.x + box.width - 1 && point.y > box.y + 1 && point.y < box.y + box.height - 1) {
                result.push(`${path.getAttribute('d')} enters ${id}`);
                break;
              }
              if (result.length) break;
            }
          }
          return result;
        });
        expect(hits, `${operation} ${view} step ${index}`).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
  });
}
