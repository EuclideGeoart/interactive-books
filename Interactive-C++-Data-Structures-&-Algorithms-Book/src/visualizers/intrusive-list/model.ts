import type { Trace } from '../../engine/types';
export const hooks = ['active', 'render', 'dirty'] as const;
export type HookName = typeof hooks[number];
export interface Hook { prev: number; next: number; owner: HookName | null }
export interface IntrusiveObject { value: number; hooks: Record<HookName, Hook> }
export interface IntrusiveState { objects: IntrusiveObject[]; lists: Record<HookName, { head: number; tail: number }>; selectedHook: HookName; walking: boolean; current: number; visited: number[]; result: string; writes: number }
export interface IntrusiveEvent { type: 'IntrusiveStatement' | 'IntrusiveScopeEnd'; object: number; hook: HookName }
export const intrusiveOperations = ['push-front', 'push-back', 'remove-head', 'remove-tail', 'remove-middle', 'clear', 'reinsert', 'forward', 'backward', 'double-insert', 'wrong-list', 'multiple-hooks'] as const;
export type IntrusiveOperation = typeof intrusiveOperations[number];
export const objectAddress = (i: number): string => i < 0 ? 'nullptr' : ['0xA100', '0xD800', '0xB400', '0xF200'][i]!;
export function intrusiveTrace(operation: IntrusiveOperation, preset = 'three', selectedHook: HookName = 'active', value = 40): Trace<IntrusiveState, IntrusiveEvent> {
  if (!intrusiveOperations.includes(operation)) throw new Error('Choose an intrusive operation.');
  if (!hooks.includes(selectedHook)) throw new Error('Choose Active, Render, or Dirty hook.');
  if (!['empty', 'single', 'three'].includes(preset)) throw new Error('Choose an empty, single, or three-object list.');
  if (!Number.isInteger(value) || Math.abs(value) > 999) throw new Error('Object D value must be an integer from −999 to 999.');
  const state: IntrusiveState = { objects: [10, 20, 30, value].map(value => ({ value, hooks: Object.fromEntries(hooks.map(h => [h, { prev: -1, next: -1, owner: null }])) as Record<HookName, Hook> })), lists: { active: { head: -1, tail: -1 }, render: { head: -1, tail: -1 }, dirty: { head: -1, tail: -1 } }, selectedHook, walking: false, current: -1, visited: [], result: '', writes: 0 };
  const trace: Trace<IntrusiveState, IntrusiveEvent> = { initial: structuredClone(state), steps: [] };
  let recording = false;
  const emit = (tag: string | null, explanation: string, object: number, hook: HookName, mutate?: () => void) => {
    mutate?.();
    if (recording) trace.steps.push({ source: tag, title: tag ? tag.replaceAll('.', ' · ') : 'Traversal locals leave scope', explanation, event: { type: tag ? 'IntrusiveStatement' : 'IntrusiveScopeEnd', object, hook }, state: structuredClone(state) });
  };
  const link = (i: number, h: HookName) => state.objects[i]!.hooks[h];
  const assign = (tag: string, explanation: string, i: number, h: HookName, mutate: () => void) => emit(tag, explanation, i, h, () => { mutate(); state.writes++; });
  const push = (i: number, h: HookName, front: boolean) => {
    const prefix = front ? 'front' : 'back'; const hook = link(i, h); const list = state.lists[h];
    emit(`${prefix}.hook`, 'Select exactly one hook in the externally owned object.', i, h);
    emit(`${prefix}.guard`, 'The owner pointer detects membership even when prev and next are null.', i, h);
    if (hook.owner !== null) { emit(`${prefix}.reject`, 'This hook already belongs to a list.', i, h, () => { state.result = 'This hook already belongs to a list'; }); return; }
    assign(`${prefix}.prev`, 'Set this hook’s previous relationship.', i, h, () => { hook.prev = front ? -1 : list.tail; });
    assign(`${prefix}.next`, 'Set this hook’s next relationship.', i, h, () => { hook.next = front ? list.head : -1; });
    emit(`${prefix}.nonempty`, 'An existing endpoint needs its reciprocal link updated.', i, h);
    if (front) {
      if (list.head >= 0) assign('front.backlink', 'The old head points back to the new object.', i, h, () => { link(list.head, h).prev = i; });
      else assign('front.tail', 'The first object is also the tail.', i, h, () => { list.tail = i; });
      assign('front.head', 'Publish the new head; ownership of the object stays external.', i, h, () => { list.head = i; });
    } else {
      if (list.tail >= 0) assign('back.forward', 'The old tail points forward to the new object.', i, h, () => { link(list.tail, h).next = i; });
      else assign('back.head', 'The first object is also the head.', i, h, () => { list.head = i; });
      assign('back.tail', 'Publish the new tail.', i, h, () => { list.tail = i; });
    }
    assign(`${prefix}.owner`, 'Record the list owner for this hook, not an object ownership transfer.', i, h, () => { hook.owner = h; });
  };
  const erase = (i: number, h: HookName) => {
    const hook = link(i, h); const list = state.lists[h];
    emit('erase.hook', 'Select the hook being unlinked.', i, h);
    emit('erase.guard', 'Require membership in this exact list.', i, h);
    if (hook.owner !== h) { emit('erase.reject', 'This hook is not a member of this list.', i, h, () => { state.result = 'This hook is not a member of this list'; }); return; }
    emit('erase.has-prev', 'Choose predecessor rewiring or head update.', i, h);
    if (hook.prev >= 0) assign('erase.forward', 'Bypass the object in the forward direction. Its successor still points back to it.', i, h, () => { link(hook.prev, h).next = hook.next; });
    else assign('erase.head', 'Advance the head past this still-live object.', i, h, () => { list.head = hook.next; });
    emit('erase.has-next', 'Choose successor rewiring or tail update.', i, h);
    if (hook.next >= 0) assign('erase.backward', 'Repair the reciprocal backward relationship.', i, h, () => { link(hook.next, h).prev = hook.prev; });
    else assign('erase.tail', 'Move the tail to the predecessor.', i, h, () => { list.tail = hook.prev; });
    assign('erase.prev', 'Clear the detached hook’s previous link.', i, h, () => { hook.prev = -1; });
    assign('erase.next', 'Clear the detached hook’s next link.', i, h, () => { hook.next = -1; });
    assign('erase.owner', 'End this membership. The object and its other hooks remain alive.', i, h, () => { hook.owner = null; });
  };
  const count = preset === 'empty' ? 0 : preset === 'single' ? 1 : 3;
  for (let i = 0; i < count; i++) push(i, selectedHook, false);
  if (operation === 'multiple-hooks') {
    // One bounded external owner set, three independent hook chains.
    for (const h of hooks) { state.lists[h] = { head: -1, tail: -1 }; for (const object of state.objects) object.hooks[h] = { prev: -1, next: -1, owner: null }; }
    for (const i of [0, 1, 2]) push(i, 'active', false);
    for (const i of [1, 3]) push(i, 'render', false);
    for (const i of [0, 3]) push(i, 'dirty', false);
  }
  state.writes = 0; trace.initial = structuredClone(state); recording = true;
  if (operation === 'push-front' || operation === 'push-back') push(3, selectedHook, operation === 'push-front');
  if (operation === 'remove-head') erase(state.lists[selectedHook].head < 0 ? 0 : state.lists[selectedHook].head, selectedHook);
  if (operation === 'remove-tail') erase(state.lists[selectedHook].tail < 0 ? 0 : state.lists[selectedHook].tail, selectedHook);
  if (operation === 'remove-middle') erase(count === 3 ? 1 : 0, selectedHook);
  if (operation === 'clear') {
    while (true) { emit('clear.more', 'Unlink one head at a time; never destroy the external objects.', -1, selectedHook); if (state.lists[selectedHook].head < 0) break; erase(state.lists[selectedHook].head, selectedHook); }
  }
  if (operation === 'reinsert') { if (count) erase(0, selectedHook); push(0, selectedHook, false); }
  if (operation === 'double-insert') { if (!count) push(0, selectedHook, false); push(0, selectedHook, true); }
  if (operation === 'wrong-list') erase(3, selectedHook);
  if (operation === 'multiple-hooks') erase(state.lists[selectedHook].head, selectedHook);
  if (operation === 'forward' || operation === 'backward') {
    const reverse = operation === 'backward';
    emit('walk.start', 'Start at the selected endpoint.', -1, selectedHook, () => { state.walking = true; state.current = reverse ? state.lists[selectedHook].tail : state.lists[selectedHook].head; });
    while (true) {
      emit('walk.more', 'Check for the null terminator before reading an object.', state.current, selectedHook);
      if (state.current < 0) break;
      emit('walk.visit', 'Read the live object value; record one visit.', state.current, selectedHook, () => { state.visited.push(state.current); });
      emit('walk.advance', 'Follow this hook only.', state.current, selectedHook, () => { state.current = link(state.current, selectedHook)[reverse ? 'prev' : 'next']; });
    }
    emit('walk.return', 'Return the collected values.', -1, selectedHook, () => { state.result = state.visited.map(i => state.objects[i]!.value).join(', '); });
    emit(null, 'values() has returned. current leaves scope; visited objects remain recorded as traversal history.', -1, selectedHook, () => { state.walking = false; state.current = -1; });
  }
  return trace;
}
