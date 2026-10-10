import { expect, it } from 'vitest';
import { describeSorting, drawSorting, inspectSorting, itemLabel } from '../../src/visualizers/sorting/presentation';
import type { SortingScene } from '../../src/visualizers/sorting/types';

const scene: SortingScene = {
  title: 'Equal keys retain identity', rows: [{ id:'array',label:'Input',items:[{key:2,id:0},{key:1,id:1},{key:2,id:2}],active:[0,1],finalized:[2],cursors:[{label:'high',index:3}],ranges:[{label:'active',low:0,high:3}] }],
  facts:[['Comparison','2A > 1B']],message:'Comparison does not change records.',
};
it('preserves identities, slot indices and half-open end cursor in both views', () => {
  for (const view of ['logical','memory'] as const) {
    const drawing = drawSorting(scene,'test',view,'array:2');
    expect(drawing).toContain('2A'); expect(drawing).toContain('2C');
    expect(drawing).toContain('high=3'); expect(drawing).toContain('active [0, 3)');
    expect(drawing).toContain('data-node="array:2"');
    expect(drawing).toContain('aria-pressed="true"');
  }
  expect(inspectSorting(scene,'array:2')).toContain('original index 2');
  expect(describeSorting(scene)).toContain('index 2: finalized');
});
it('escapes scene text and handles empty storage and buffer holes without inventing records', () => {
  const unsafe: SortingScene = {title:'<script>',rows:[{id:'buffer',label:'<buffer>',items:[null]}],facts:[['<name>','<value>']],message:'<message>'};
  const output = drawSorting(unsafe,'safe','memory','buffer:0');
  expect(output).not.toContain('<script>'); expect(output).toContain('&lt;buffer&gt;');
  expect(inspectSorting(unsafe,'buffer:0')).toContain('empty slot');
  const empty = {...scene,rows:[{id:'array',label:'Input',items:[]}]};
  expect(drawSorting(empty,'empty','logical',null)).toContain('Empty array');
  expect(inspectSorting(empty,null)).toContain('Empty range');
});
it('heap projection shares current record identity with array and preserves geometry when shrinking', () => {
  const full=drawSorting({...scene,heapSize:3},'heap','logical','heap:1');
  const short=drawSorting({...scene,heapSize:2},'heap','logical','heap:1');
  expect(full).toContain('data-node="heap:2"'); expect(short).not.toContain('data-node="heap:2"');
  expect(short).toContain('data-node="array:2"');
  expect(inspectSorting({...scene,heapSize:2},'heap:1')).toContain('Parent index');
  expect(itemLabel({key:-999,id:0})).toBe('-999A');
});
