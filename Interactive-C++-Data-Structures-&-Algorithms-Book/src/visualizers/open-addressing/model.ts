import type { Trace, Invariant } from '../../engine/types';
import { teachingHash, validateKey } from '../hashing/hash';
export type Slot = { status: 'empty' | 'occupied' | 'tombstone'; key: string; value: number };
export interface OpenState { slots: Slot[]; staging: Slot[]; active: number | null; stagingActive: number | null; probes: number; writes: number; remembered: number | null; result: string; path: number[] }
export type HashEvent = { type: 'Hash' | 'Probe' | 'Remember' | 'Write' | 'Return' | 'Rehash' };
export type OpenOperation = 'insert' | 'find' | 'contains' | 'erase' | 'rehash';
const blank = (): Slot => ({ status: 'empty', key: '', value: 0 });
export function capacityInput(n: number, max = 32) {
  if (!Number.isInteger(n) || n < 1 || n > max) throw new Error(`Capacity must be an integer from 1 to ${max}.`);
}
export function valueInput(n: number) {
  if (!Number.isInteger(n) || n < -999 || n > 999) throw new Error('Value must be an integer from −999 to 999.');
}
export function openState(keys: string[] = ['a', 'i', 'q'], capacity = 8, erased: string[] = []): OpenState {
  capacityInput(capacity);
  if (keys.length > capacity) throw new Error('Starting entries must fit in the table.');
  let s: OpenState = { slots: Array.from({length:capacity}, blank), staging: [], stagingActive: null, active: null, probes: 0, writes: 0, remembered: null, result: '', path: [] };
  keys.forEach((key, i) => { s = openTrace('insert', s, key, i + 1).steps.at(-1)!.state; });
  erased.forEach(key => { s = openTrace('erase', s, key).steps.at(-1)!.state; });
  return { ...s, active: null, probes: 0, writes: 0, remembered: null, result: '', path: [] };
}
export function openTrace(op: OpenOperation, initial: OpenState, key = 'q', value = 9, requested = 16): Trace<OpenState, HashEvent> {
  if (!['insert','find','contains','erase','rehash'].includes(op)) throw new Error('Choose a supported operation.');
  if (op !== 'rehash') validateKey(key);
  valueInput(value);
  const s = structuredClone(initial);
  Object.assign(s, { active: null, stagingActive: null, probes: 0, writes: 0, remembered: null, result: '', path: [], staging: [] });
  const t: Trace<OpenState, HashEvent> = { initial: structuredClone(s), steps: [] };
  const emit = (source: string, type: HashEvent['type'], title: string) => {
    if (type === 'Probe') { s.probes++; if(s.active !== null) s.path.push(s.active); }
    if (type === 'Write') s.writes++;
    t.steps.push({ source, event: {type}, title, explanation: title, state: structuredClone(s) });
  };
  const finish = (source: string, title: string) => { s.result = title; emit(source, 'Return', title); };
  const n = s.slots.length, home = teachingHash(key) % n;
  if (op === 'rehash') {
    capacityInput(requested);
    if (requested < s.slots.filter(x => x.status === 'occupied').length) throw new Error('New capacity must hold all live entries.');
    s.staging = Array.from({length:requested}, blank);
    emit('oa.rehash.allocate','Rehash','Allocate a fresh table; keep the old table until commit');
    for (const slot of s.slots) if (slot.status === 'occupied') {
      let i = teachingHash(slot.key) % requested;
      for (;;) {
        s.stagingActive=i; emit('oa.rehash.probe','Probe',`Inspect replacement slot ${i}: ${s.staging[i]!.status}`);
        if(s.staging[i]!.status !== 'occupied')break;
        i=(i+1)%requested;
      }
      s.staging[i] = {...slot};
      emit('oa.rehash.remap','Rehash',`Remap ${slot.key}: home ${teachingHash(slot.key) % requested}, destination ${i}`);
    }
    s.slots = s.staging; s.staging = []; s.stagingActive=null; s.result = 'Rehashed; tombstones removed';
    emit('oa.rehash.commit','Rehash','Commit the rebuilt table; every index must be reacquired');
  } else if (op === 'insert') {
    emit('oa.insert.home','Hash',`hash(${key}) = ${teachingHash(key)}; home = ${home}`);
    let target: number | null = null;
    for (let d = 0; d < n; d++) {
      const i = (home + d) % n, slot = s.slots[i]!; s.active = i;
      emit('oa.insert.probe','Probe',`Inspect slot ${i}: ${slot.status}${slot.key ? ` (${slot.key})` : ''}`);
      if (slot.status === 'occupied' && slot.key === key) {
        slot.value = value; emit('oa.insert.update','Write',`Update ${key} beyond any earlier tombstone`);
        finish('oa.insert.updated','Updated existing key'); return t;
      }
      if (slot.status === 'tombstone' && s.remembered === null) {
        s.remembered = i; emit('oa.insert.remember','Remember',`Remember tombstone ${i}; continue checking for a duplicate`);
      }
      if (slot.status === 'empty') {
        target = s.remembered ?? i; emit('oa.insert.target','Remember',`Empty proves absence; choose slot ${target}`); break;
      }
    }
    target ??= s.remembered;
    if (target === null) finish('oa.insert.full','Table full; no mutation. Rehash to grow.');
    else { s.slots[target] = {status:'occupied',key,value}; s.active = target; emit('oa.insert.place','Write',`Store ${key} in slot ${target}`); finish('oa.insert.done','Inserted'); }
  } else {
    emit('oa.find.home','Hash',`hash(${key}) = ${teachingHash(key)}; home = ${home}`);
    let found: number | null = null, stopped = false;
    for (let d = 0; d < n; d++) {
      const i = (home + d) % n, slot = s.slots[i]!; s.active = i;
      emit('oa.find.probe','Probe',`Inspect slot ${i}: ${slot.status}${slot.key ? ` (${slot.key})` : ''}`);
      if (slot.status === 'empty') { finish('oa.find.empty','Not found: empty ends the probe chain'); stopped = true; break; }
      if (slot.status === 'occupied' && slot.key === key) { found = i; finish('oa.find.found',`Found ${key} = ${slot.value}`); stopped = true; break; }
    }
    if (!stopped) finish('oa.find.full','Not found after one complete table traversal');
    if (op === 'erase') {
      if (found === null) finish('oa.erase.missing','Key absent; nothing erased');
      else { s.slots[found] = {status:'tombstone',key:'',value:0}; emit('oa.erase.mark','Write',`Slot ${found} becomes TOMBSTONE, preserving the probe chain`); finish('oa.erase.done','Erased'); }
    }
  }
  return t;
}
export function openInvariants(s: OpenState, _settled = true): Invariant[] {
  const occupied = s.slots.filter(x => x.status === 'occupied');
  const reachable = s.slots.every((slot, index) => {
    if (slot.status !== 'occupied') return true;
    for (let d = 0; d < s.slots.length; d++) {
      const i = (teachingHash(slot.key) + d) % s.slots.length;
      if (s.slots[i]!.status === 'empty') return false;
      if (i === index) return true;
    }
    return false;
  });
  return [ ['Every key is reachable before an EMPTY slot',reachable], ['Each key appears once',new Set(occupied.map(x=>x.key)).size === occupied.length] ].map(([name,ok])=>({name:String(name),status:ok?'pass':'fail',detail:ok?'Holds in this snapshot.':'An early EMPTY or duplicate violates the table representation.'}));
}
export const openSnapshot = (s: OpenState) => [s.slots.map(x=>[x.status,x.key,x.value]),s.staging.map(x=>[x.status,x.key,x.value])];
export function tombstoneExperiment(broken: boolean) {
  const s = openState(['a','i','q'],8,['a']);
  if (broken) s.slots[1] = blank();
  return { state:s, trace:openTrace('find',s,'q'), rules:openInvariants(s) };
}
