import type { Invariant, Trace } from '../../engine/types';
import { teachingHash, validateKey } from '../hashing/hash';

export interface ChainNode { id: number; key: string; value: number; hash: number; next: number | null; live: boolean; row: number; column: number }
export interface ChainState {
  nodes: ChainNode[]; buckets: (number | null)[]; replacement: (number | null)[] | null;
  owners: Record<string, number | null>; size: number; comparisons: number; current: number | null; detached: number | null;
  bucket: number | null; result: string; rehashing: boolean;
}
export interface ChainEvent { type: 'Hash' | 'SelectBucket' | 'Visit' | 'Compare' | 'Assign' | 'Allocate' | 'Reconnect' | 'Destroy' | 'Rehash' | 'Return' }
export type ChainOperation = 'insert' | 'find' | 'contains' | 'update' | 'erase' | 'rehash' | 'size' | 'capacity' | 'load';
const copy = <T>(s: T): T => structuredClone(s);
export function parseEntries(raw: string): [string, number][] {
  if (!raw.trim()) return [];
  const entries = raw.split(',').map(part => {
    const fields = part.trim().split(':');
    const key = fields[0]!; validateKey(key);
    const value = fields.length === 1 ? 1 : Number(fields[1]);
    if (fields.length > 2 || !Number.isInteger(value) || Math.abs(value) > 999) throw new Error('Use key:value pairs with integer values from −999 to 999.');
    return [key, value] as [string, number];
  });
  if (entries.length > 8) throw new Error('Use at most eight starting entries.');
  return entries;
}
export function chainState(entries: [string, number][] = [], capacity = 8): ChainState {
  if (![8, 16].includes(capacity)) throw new Error('Choose capacity 8 or 16.');
  let state: ChainState = { nodes: [], buckets: Array(capacity).fill(null), replacement: null, owners: {}, size: 0, comparisons: 0, current: null, detached: null, bucket: null, result: 'Ready', rehashing: false };
  for (const [key, value] of entries) state = chainTrace('insert', state, key, value).steps.at(-1)!.state;
  state.current = null; state.bucket = null; state.comparisons = 0; state.result = 'Ready';
  return state;
}
export function chainTrace(operation: ChainOperation, initial: ChainState, key = 'a', value = 7): Trace<ChainState, ChainEvent> {
  validateKey(key);
  if (!Number.isInteger(value) || Math.abs(value) > 999) throw new Error('Value must be an integer from −999 to 999.');
  const s = copy(initial); s.comparisons = 0; s.current = null; s.detached = null; s.result = 'Executing';
  const trace: Trace<ChainState, ChainEvent> = { initial: copy(s), steps: [] };
  const emit = (source: string | null, type: ChainEvent['type'], title: string, explanation = title) => trace.steps.push({ source, event: { type }, title, explanation, state: copy(s) });
  const rehash = () => {
    const requested = s.buckets.length * 2;
    s.replacement = Array(requested).fill(null); s.rehashing = true;
    emit('rehash.allocate', 'Allocate', `Allocate ${requested} empty bucket heads`, 'Only the bucket array is replaced; node addresses stay stable.');
    for (let old = 0; old < s.buckets.length; old++) while (s.buckets[old] !== null) {
      const entry = s.buckets[old]!; s.detached = entry; s.owners.entry = entry; s.current = entry; s.buckets[old] = null;
      emit('rehash.detach', 'Assign', `Take ownership of ${s.nodes[entry]!.key}`);
      s.buckets[old] = s.nodes[entry]!.next; s.nodes[entry]!.next = null;
      emit('rehash.reconnect', 'Reconnect', 'Reconnect the old bucket to the remaining chain');
      const bucket = s.nodes[entry]!.hash % requested; s.bucket = bucket;
      emit('rehash.bucket', 'SelectBucket', `${s.nodes[entry]!.hash} mod ${requested} = ${bucket}`, 'Recompute the bucket from the stored full hash, never copy an old index.');
      s.nodes[entry]!.next = s.replacement![bucket]!; s.replacement![bucket] = null;
      emit('rehash.link', 'Reconnect', 'Attach the new bucket chain to this entry');
      s.replacement![bucket] = entry; s.detached = null; s.owners.entry = null;
      emit('rehash.publish', 'Assign', 'Publish this entry in the replacement bucket');
    }
    s.buckets = s.replacement!; s.replacement = null; s.rehashing = false; s.current = null;
    emit('rehash.commit', 'Rehash', `Commit capacity ${requested}`);
  };
  if (operation === 'rehash') { rehash(); s.result = `Capacity ${s.buckets.length}`; emit(null, 'Return', s.result); return trace; }
  if (['size', 'capacity', 'load'].includes(operation)) {
    s.result = operation === 'size' ? `Size ${s.size}` : operation === 'capacity' ? `Capacity ${s.buckets.length}` : `Load factor ${s.size} / ${s.buckets.length} = ${s.size / s.buckets.length}`;
    emit(null, 'Return', s.result); return trace;
  }
  const prefix = operation === 'update' ? 'insert' : operation === 'contains' ? 'find' : operation;
  const hash = teachingHash(key);
  if (prefix === 'insert') emit('insert.hash', 'Hash', `Hash ${key} = ${hash}`);
  let bucket = hash % s.buckets.length; s.bucket = bucket;
  emit(`${prefix}.bucket`, 'SelectBucket', `Select bucket ${bucket}`, `${hash} mod ${s.buckets.length} = ${bucket}. Equal hash or bucket alone never proves key equality.`);
  let current: number | null = s.buckets[bucket]!; let previous: number | null = null; s.current = current;
  emit(`${prefix}.start`, 'Visit', 'Start at the selected bucket head');
  while (current !== null) {
    s.current = current; s.comparisons++;
    const node: ChainNode = s.nodes[current]!; const equal = node.key === key;
    emit(`${prefix}.compare`, 'Compare', `Compare ${node.key} with ${key}: ${equal ? 'equal' : 'different'}`);
    if (equal) {
      if (prefix === 'insert') {
        node.value = value; emit('insert.update', 'Assign', `Update ${key} to ${value}; size stays ${s.size}`);
        s.result = 'Updated existing key'; emit('insert.updated', 'Return', s.result);
      } else if (prefix === 'find') {
        s.result = operation === 'contains' ? 'true' : `Found ${node.value}`; emit('find.found', 'Return', s.result);
      } else {
        s.detached = current; s.owners.removed = current;
        if (previous === null) s.buckets[bucket] = null; else s.nodes[previous]!.next = null;
        emit('erase.detach', 'Assign', `Detach ${key} through its owning link`);
        if (previous === null) s.buckets[bucket] = node.next; else s.nodes[previous]!.next = node.next;
        node.next = null; emit('erase.reconnect', 'Reconnect', 'Reconnect the owning link to the successor');
        node.live = false; s.detached = null; s.owners.removed = null; s.current = null; emit('erase.destroy', 'Destroy', 'Destroy only the removed node');
        s.size--; emit('erase.size', 'Assign', `Size is now ${s.size}`);
        s.result = 'Erased key'; emit('erase.done', 'Return', s.result);
      }
      return trace;
    }
    previous = current; current = node.next; s.current = current;
    emit(`${prefix}.next`, 'Visit', current === null ? 'Reach nullptr' : `Follow next to ${s.nodes[current]!.key}`);
  }
  if (prefix !== 'insert') { s.result = operation === 'contains' ? 'false' : 'Key absent'; emit(`${prefix}.missing`, 'Return', s.result); return trace; }
  const id = s.nodes.length; const row = hash % 8;
  s.nodes.push({ id, key, value, hash, next: null, live: true, row, column: s.nodes.filter(n => n.row === row).length }); s.detached = id; s.owners.fresh = id; s.current = id;
  emit('insert.allocate', 'Allocate', `Construct ${key}:${value} before publishing it`);
  if (s.size >= s.buckets.length - Math.floor(s.buckets.length / 4)) {
    // The fresh node remains privately owned across rehash; no topology links point to it.
    rehash(); s.detached = id; s.current = id;
  }
  bucket = hash % s.buckets.length; s.bucket = bucket;
  emit('insert.remap', 'SelectBucket', `Insertion bucket is ${bucket} at capacity ${s.buckets.length}`);
  s.nodes[id]!.next = s.buckets[bucket]!; s.buckets[bucket] = null;
  emit('insert.link', 'Reconnect', 'Move the old head into fresh.next');
  s.buckets[bucket] = id; s.detached = null; s.owners.fresh = null;
  emit('insert.publish', 'Assign', 'Publish the fresh node as the bucket head');
  s.size++; emit('insert.size', 'Assign', `Size is now ${s.size}`);
  s.result = 'Inserted new key'; emit('insert.done', 'Return', s.result);
  return trace;
}
export function chainSnapshot(s: ChainState) {
  const walk = (id: number | null): [string, number][] => { const entries: [string, number][] = []; const seen = new Set<number>(); while (id !== null && !seen.has(id)) { seen.add(id); const node = s.nodes[id]!; if (!node?.live) break; entries.push([node.key, node.value]); id = node.next; } return entries; };
  return { buckets: s.buckets.map(walk), replacement: s.replacement?.map(walk) ?? null, locals: Object.fromEntries(Object.entries(s.owners).filter(([, id]) => id !== null).map(([name, id]) => [name, walk(id)])), size: s.size, comparisons: s.comparisons };
}
export function chainInvariants(s: ChainState, settled: boolean): Invariant[] {
  const seen = new Set<number>(); const keys = new Set<string>(); let valid = true; let mapping = true;
  const walk = (heads: (number | null)[]) => heads.forEach((head, bucket) => { let current = head; while (current !== null) {
    const n = s.nodes[current]; if (!n?.live || seen.has(current)) { valid = false; break; }
    seen.add(current); if (keys.has(n.key) || n.hash !== teachingHash(n.key)) valid = false; keys.add(n.key);
    if (n.hash % heads.length !== bucket) mapping = false;
    current = n.next;
  }});
  walk(s.buckets); if (s.replacement) walk(s.replacement);
  const count = s.nodes.filter(n => n.live).length;
  return [
    { name: 'Acyclic exclusive chains and unique keys', status: valid ? 'pass' : 'fail', detail: 'Each reachable live node has one owning link; equality compares full keys.' },
    { name: 'Hash maps to the owning bucket', status: mapping ? 'pass' : 'fail', detail: 'Stored full hash modulo the owning array capacity equals its bucket.' },
    { name: 'All live nodes reachable; size matches', status: count === seen.size && count === s.size ? 'pass' : settled ? 'fail' : 'pending', detail: `${seen.size} reachable, ${count} live, size ${s.size}. Detached local ownership is temporary.` },
  ];
}
export type ChainFault = 'duplicate' | 'lost-link' | 'old-bucket';
export function breakChain(kind: ChainFault): ChainState {
  const s = chainState([['a', 1], ['i', 2], ['q', 3]]);
  if (kind === 'duplicate') { s.nodes[1]!.key = 'a'; s.nodes[1]!.hash = teachingHash('a'); }
  if (kind === 'lost-link') s.nodes[2]!.next = null;
  if (kind === 'old-bucket') s.buckets.push(...Array(8).fill(null));
  return s;
}
export function distributionEvidence(count: number, concentrated: boolean) {
  const capacity = 16; const entries: [string, number][] = [];
  // Select real teaching keys; the hash itself is never replaced for this experiment.
  for (let n = 0; entries.length < count; n++) {
    let x = n; let key = ''; do { key = String.fromCharCode(97 + x % 26) + key; x = Math.floor(x / 26); } while (x);
    if (!concentrated || teachingHash(key) % capacity === 1) entries.push([key, n]);
  }
  const buckets: string[][] = Array.from({ length: capacity }, () => []);
  for (const [key] of entries) buckets[teachingHash(key) % capacity]!.unshift(key);
  let comparisons = 0;
  for (const [key] of entries) for (const candidate of buckets[teachingHash(key) % capacity]!) { comparisons++; if (candidate === key) break; }
  return { buckets, comparisons, average: comparisons / count, worst: Math.max(...buckets.map(b => b.length)), load: count / capacity };
}
