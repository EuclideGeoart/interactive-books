import type { LabAdapter } from '../../components/controls/lab-types';
import type { Invariant, MemoryState } from '../../engine/types';
import { pointerInspector } from '../../components/memory/inspector';
import { arrowDefinitions, dataNode, escapeHtml, referenceArrow } from '../../components/visualizers/primitives';
import { hooks, intrusiveTrace, objectAddress, type HookName, type IntrusiveState, type IntrusiveEvent, type IntrusiveOperation } from './model';

export function chain(state: IntrusiveState, h: HookName, reverse = false): number[] {
  const result: number[] = []; let i = state.lists[h][reverse ? 'tail' : 'head'];
  while (i >= 0 && state.objects[i] && !result.includes(i)) { result.push(i); i = state.objects[i]!.hooks[h][reverse ? 'prev' : 'next']; }
  return result;
}
export function intrusiveInvariants(state: IntrusiveState, settled: boolean): Invariant[] {
  const rules: Invariant[] = [];
  for (const h of hooks) {
    const { head, tail } = state.lists[h]; const forward = chain(state, h); const backward = chain(state, h, true);
    const endpoints = (head === -1) === (tail === -1) && (head === -1 || state.objects[head]?.hooks[h].prev === -1) && (tail === -1 || state.objects[tail]?.hooks[h].next === -1);
    const reciprocal = state.objects.every((object, i) => {
      const hook = object.hooks[h];
      return (hook.next === -1 || state.objects[hook.next]?.hooks[h].prev === i) && (hook.prev === -1 || state.objects[hook.prev]?.hooks[h].next === i);
    });
    const membership = state.objects.every((o, i) => (o.hooks[h].owner === h) === forward.includes(i) && (o.hooks[h].owner !== null || (o.hooks[h].prev === -1 && o.hooks[h].next === -1)));
    const same = forward.join(',') === [...backward].reverse().join(',') && (forward.length === 0 || forward.at(-1) === tail);
    const ok = endpoints && reciprocal && membership && same;
    rules.push({ name: `${h}: endpoints, reciprocal links, membership`, status: ok ? 'pass' : settled ? 'fail' : 'pending', detail: ok ? `${forward.length} linked object(s); each hook has its own owner.` : 'A statement has rewired one relationship before its reciprocal link or membership token. Finish the operation to restore all properties.' });
  }
  rules.push({ name: 'External objects remain alive', status: 'pass', detail: 'All four objects exist before and after unlinking; no list operation destroys them.' });
  return rules;
}
function memory(state: IntrusiveState): MemoryState {
  const h = state.selectedHook;
  return { objects: state.objects.map((object, i) => ({ address: objectAddress(i), data: object.value, lifetime: 'live', pointers: { [`${h}.prev`]: object.hooks[h].prev < 0 ? null : objectAddress(object.hooks[h].prev), [`${h}.next`]: object.hooks[h].next < 0 ? null : objectAddress(object.hooks[h].next) } })), references: { head: state.lists[h].head < 0 ? null : objectAddress(state.lists[h].head), tail: state.lists[h].tail < 0 ? null : objectAddress(state.lists[h].tail), ...(state.walking ? { current: state.current < 0 ? null : objectAddress(state.current) } : {}) }, visited: state.visited.map(objectAddress), comparisons: 0, writes: state.writes, result: state.result };
}
export const intrusiveAdapter: LabAdapter<IntrusiveState, IntrusiveEvent> = {
  build(operation, form) { return intrusiveTrace(operation as IntrusiveOperation, String(form.get('preset') ?? 'three'), String(form.get('hook') ?? 'active') as HookName, Number(form.get('value') ?? 40)); },
  regions(operation) {
    if (operation === 'push-front' || operation === 'push-back') return [operation, 'hook'];
    if (operation === 'forward' || operation === 'backward') return ['traversal', 'hook'];
    if (operation === 'double-insert') return ['push-front', 'push-back', 'hook'];
    if (operation === 'reinsert') return ['erase', 'push-back', 'hook'];
    if (operation === 'clear') return ['clear', 'erase', 'hook'];
    return ['erase', 'hook'];
  },
  describe(state) { return `${hooks.map(h => `${h}: head → ${chain(state, h).map(i => String.fromCharCode(65 + i)).join(' ⇄ ')}${chain(state, h).length ? ' → ' : ''}nullptr`).join('. ')}. External ownership: A, B, C, D are all alive.${state.walking ? ` Local current → ${objectAddress(state.current)}.` : ''}${state.result ? ` ${state.result}.` : ''}`; },
  invariants: intrusiveInvariants,
  counters: state => [{ label: 'Pointer writes', value: state.writes }, { label: 'Objects visited', value: state.visited.length }, { label: 'Objects destroyed', value: 0 }],
  inspect(state, selected) {
    const i = state.objects.findIndex((_, n) => objectAddress(n) === selected);
    return `<p>Selected hook: <strong>${state.selectedHook}</strong>${state.walking ? ' · traversal in progress' : ''}</p>${pointerInspector(memory(state), selected)}${i >= 0 ? `<h4>External owner keeps object ${String.fromCharCode(65 + i)} alive</h4><dl class="node-fields">${hooks.map(h => `<div><dt>${h}.owner</dt><dd>${state.objects[i]!.hooks[h].owner ?? 'nullptr · detached'}</dd></div>`).join('')}</dl><p>Unlinking one hook does not destroy the object or alter its other hooks.</p>` : '<p>Select an object to compare all three membership tokens.</p>'}`;
  },
  draw(state, id, view, selected, event) {
    const mem = memory(state); const h = state.selectedHook;
    // Each view has fixed positions for the entire experiment; never reorder by traversal.
    const order = view === 'memory' ? [0, 2, 1, 3] : [0, 1, 2, 3];
    const position = (i: number) => ({ x: 140, y: 165 + order.indexOf(i) * 168 });
    const fields = [`${h}.prev`, `${h}.next`];
    const defs = arrowDefinitions(id);
    const nodes = state.objects.map((object, i) => {
      const p = position(i); const refs = [state.lists[h].head === i ? 'head' : '', state.lists[h].tail === i ? 'tail' : '', state.walking && state.current === i ? 'current' : ''].filter(Boolean);
      return `<text class="field-label" x="140" y="${p.y - 9}">OBJECT ${String.fromCharCode(65 + i)} · ${object.hooks[h].owner ? `${h} member` : 'detached · still alive'}</text>${dataNode(mem.objects[i]!, p, selected === objectAddress(i), event?.object === i || state.visited.includes(i), refs, ['prev', 'next'])}`;
    }).join('');
    const arrows = state.objects.flatMap((object, i) => ['prev', 'next'].map(field => {
      const target = object.hooks[h][field as 'prev' | 'next']; if (target < 0) return '';
      const a = position(i), b = position(target);
      // Independent outside rails: neither direction crosses another object or its labels.
      const path = field === 'prev' ? `M${a.x} ${a.y + 30} H${28 + i * 22} V${b.y + 30} H${b.x - 5}` : `M${a.x + 188} ${a.y + 45} H${380 + i * 30} V${b.y + 52} H${b.x + 194}`;
      return `<g class="pointer-link" data-field="${field}" data-from="${objectAddress(i)}" data-target="${objectAddress(target)}" role="button" tabindex="0" aria-label="Follow ${fields[field === 'prev' ? 0 : 1]} from object ${String.fromCharCode(65 + i)} to object ${String.fromCharCode(65 + target)}">${referenceArrow(path, id)}<path class="arrow-hit-area" d="${path}"/></g>`;
    })).join('');
    return `<svg class="memory-diagram" viewBox="0 0 688 855" style="--diagram-height:855px" role="group" aria-label="${escapeHtml(this.describe(state))}">${defs}<text class="head-empty" x="48" y="28">EXTERNAL OWNER · all four objects stay alive</text>${hooks.map((hook, i) => `<text class="${hook === h ? 'local-reference' : 'field-label'}" x="48" y="${55 + i * 24}">${hook.toUpperCase()} → ${chain(state, hook).map(n => String.fromCharCode(65 + n)).join(' ⇄ ') || 'empty'} → nullptr</text>`).join('')}<text class="field-label" x="48" y="134">${view === 'memory' ? 'ADDRESS ORDER · links define membership' : `OBJECT IDENTITY ORDER · ${h.toUpperCase()} HOOK LINKS`}</text>${nodes}${arrows}</svg>`;
  },
};
