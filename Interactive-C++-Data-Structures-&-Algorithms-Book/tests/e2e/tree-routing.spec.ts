import { test, expect } from '@playwright/test';
import { drawTree } from '../../src/visualizers/tree/diagram';
import type { TreeScene, TreeViewNode } from '../../src/visualizers/tree/types';

const node = (i: number, children: (number | null)[] = []): TreeViewNode => ({
  address: `node-${i}`,
  label: String(i),
  lifetime: 'live',
  fields: [{ name: 'value', value: i }],
  links: children.map((n, j) => ({
    name: ['left', 'right'][j] ?? `child${j}`,
    target: n === null ? null : `node-${n}`,
    structural: true,
  })),
});
const scene = (nodes: TreeViewNode[]): TreeScene => ({
  nodes,
  root: nodes[0]?.address ?? null,
  references: {},
  active: null,
  visited: [],
  auxiliary: [],
  output: [],
  result: '',
});
const cases: Record<string, TreeScene> = {
  balanced: scene(
    Array.from({ length: 31 }, (_, i) =>
      node(i, [
        2 * i + 1 < 31 ? 2 * i + 1 : null,
        2 * i + 2 < 31 ? 2 * i + 2 : null,
      ]),
    ),
  ),
  skewed: scene(
    Array.from({ length: 25 }, (_, i) =>
      node(i, [null, i < 24 ? i + 1 : null]),
    ),
  ),
  'rotation-cycle': scene([node(0, [1, 2]), node(1, [3, 0]), node(2), node(3)]),
  'multi-key-page': scene([
    node(0, [1, 2, 3, 4]),
    node(1),
    node(2),
    node(3),
    node(4),
  ]),
};
cases['multi-key-page']!.nodes[0]!.label = '[10 | 20 | 30]';
for (const [name, state] of Object.entries(cases))
  test(`${name}: actual SVG routes avoid unrelated boxes in both representations`, async ({
    page,
  }) => {
    for (const view of ['logical', 'memory'] as const) {
      await page.setContent(
        `<style>body{margin:0}.scroll{width:100%;max-height:500px;overflow:auto}svg{display:block;min-width:520px;width:100%}</style><div class="scroll">${drawTree(state, 'test', view, null)}</div>`,
      );
      const collisions = await page.locator('svg').evaluate((svg) => {
        const boxes = [...svg.querySelectorAll<SVGGElement>('[data-node]')].map(
          (el) => ({
            id: el.dataset.node,
            box: el.querySelector<SVGRectElement>('rect')!.getBBox(),
          }),
        );
        const hits: string[] = [];
        for (const link of svg.querySelectorAll<SVGGElement>('[data-from]')) {
          const path = link.querySelector<SVGPathElement>('path')!,
            length = path.getTotalLength();
          for (const obstacle of boxes.filter(
            (b) => b.id !== link.dataset.from && b.id !== link.dataset.target,
          ))
            for (let at = 1; at < length; at += 3) {
              const p = path.getPointAtLength(at),
                b = obstacle.box;
              if (
                p.x > b.x + 1 &&
                p.x < b.x + b.width - 1 &&
                p.y > b.y + 1 &&
                p.y < b.y + b.height - 1
              ) {
                hits.push(
                  `${link.dataset.from}->${link.dataset.target} crosses ${obstacle.id}`,
                );
                break;
              }
            }
        }
        return hits;
      });
      expect(collisions, `${name} ${view}`).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
