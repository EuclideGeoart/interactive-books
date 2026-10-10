import { test, expect } from '@playwright/test';
import type { Trace } from '../../src/engine/types';
import type { TreeScene } from '../../src/visualizers/tree/types';
import { drawTree } from '../../src/visualizers/tree/diagram';
import {
  binaryState,
  binaryTrace,
  binaryScene,
} from '../../src/visualizers/binary-tree/model';
import { avlState, avlTrace } from '../../src/visualizers/avl/model';
import { avlScene } from '../../src/visualizers/avl/adapter';
import {
  redBlackState,
  redBlackTrace,
} from '../../src/visualizers/red-black/model';
import { redBlackScene } from '../../src/visualizers/red-black/adapter';
import { bTreeState, bTreeTrace } from '../../src/visualizers/b-tree/model';
import { bTreeScene } from '../../src/visualizers/b-tree/adapter';
import { trieState, trieTrace } from '../../src/visualizers/trie/model';
import { trieScene } from '../../src/visualizers/trie/adapter';

function geometryStates<S>(
  trace: Trace<S, { type: string }>,
  project: (state: S) => TreeScene,
) {
  const seen = new Set<string>();
  return [trace.initial, ...trace.steps.map((step) => step.state)]
    .map(project)
    .filter((scene) => {
      const geometry = JSON.stringify([scene.root, scene.nodes]);
      if (seen.has(geometry)) return false;
      seen.add(geometry);
      return true;
    });
}

const experiments = {
  'BST successor bypass': geometryStates(
    binaryTrace('erase', binaryState([50, 25, 75, 60, 90, 55, 57], true), 50),
    binaryScene,
  ),
  'AVL middle-subtree transfer': geometryStates(
    avlTrace('insert', avlState([50, 30, 70, 20, 40]), 10),
    avlScene,
  ),
  'AVL double rotation': geometryStates(
    avlTrace('insert', avlState([30, 10]), 20),
    avlScene,
  ),
  'RB double rotation and parent repair': geometryStates(
    redBlackTrace('insert', redBlackState([30, 10]), 20),
    redBlackScene,
  ),
  'B-tree root and child split': geometryStates(
    bTreeTrace(
      'insert',
      bTreeState('btree', [5, 10, 20, 25, 30, 40, 50, 60]),
      15,
    ),
    bTreeScene,
  ),
  'B+ split and leaf chain': geometryStates(
    bTreeTrace(
      'insert',
      bTreeState('bplus', [5, 10, 20, 25, 30, 40, 50, 60]),
      15,
    ),
    bTreeScene,
  ),
  'Trie unlink and prune': geometryStates(
    trieTrace('erase', trieState(['cat', 'car', 'care', 'dog']), 'care'),
    trieScene,
  ),
};

for (const [name, states] of Object.entries(experiments))
  test(`${name}: every distinct tagged topology routes around unrelated nodes`, async ({
    page,
  }) => {
    for (const view of ['logical', 'memory'] as const) {
      await page.setContent(
        `<style>body{margin:0}.scroll{max-width:100%;max-height:500px;overflow:auto}svg{display:block;width:100%}</style>${states.map((state, i) => `<div class="scroll">${drawTree(state, `case-${i}`, view, null)}</div>`).join('')}`,
      );
      const collisions = await page.locator('svg').evaluateAll((elements) => {
        const hits: string[] = [];
        for (const [i, svg] of elements.entries()) {
          const boxes = [
            ...svg.querySelectorAll<SVGGElement>('[data-node]'),
          ].map((el) => ({
            id: el.dataset.node,
            box: el.querySelector<SVGRectElement>('rect')!.getBBox(),
          }));
          for (const link of svg.querySelectorAll<SVGGElement>('[data-from]')) {
            const path = link.querySelector<SVGPathElement>('path')!,
              length = path.getTotalLength();
            for (const obstacle of boxes.filter(
              (b) => b.id !== link.dataset.from && b.id !== link.dataset.target,
            )) {
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
                    `state ${i}: ${link.dataset.from}.${link.dataset.field} crosses ${obstacle.id}`,
                  );
                  break;
                }
              }
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
