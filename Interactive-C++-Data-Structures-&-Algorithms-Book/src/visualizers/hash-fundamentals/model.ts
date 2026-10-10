import type { Trace } from '../../engine/types';
import { teachingHash, validateKey } from '../hashing/hash';
export interface HashState { key: string; other: string; capacity: number; hash: number; position: number; bucket: number | null; result: string }
export interface HashEvent { type: 'Hash' | 'Reduce' | 'Return' }
export function hashTrace(key: string, other: string, capacity: number): Trace<HashState, HashEvent> {
  validateKey(key); validateKey(other);
  if (![4, 8, 16, 32].includes(capacity)) throw new Error('Choose capacity 4, 8, 16 or 32.');
  const s: HashState = { key, other, capacity, hash: 0, position: 0, bucket: null, result: 'Ready to hash' };
  const trace: Trace<HashState, HashEvent> = { initial: structuredClone(s), steps: [] };
  const emit = (source: string, type: HashEvent['type'], title: string) => { s.result = title; trace.steps.push({ source, event: { type }, title, explanation: title, state: structuredClone(s) }); };
  emit('hash.start', 'Hash', 'Initialize the uint32 hash to zero');
  for (const c of key) { s.hash = (Math.imul(s.hash, 31) + c.charCodeAt(0)) >>> 0; s.position++; emit('hash.byte', 'Hash', `Read '${c}' (ASCII ${c.charCodeAt(0)}): multiply by 31, add byte, wrap modulo 2³² → ${s.hash}`); }
  emit('hash.return', 'Return', `Full hash = ${s.hash}`);
  s.bucket = s.hash % capacity; emit('mapping.index', 'Reduce', `${s.hash} mod ${capacity} = bucket ${s.bucket}`);
  const otherBucket = teachingHash(other) % capacity;
  emit('mapping.return', 'Return', key === other ? 'Equal keys: same hash and same bucket' : s.bucket === otherBucket ? `Collision: ${key} and ${other} share bucket ${s.bucket}; compare their full keys` : `Different buckets: ${key} → ${s.bucket}, ${other} → ${otherBucket}`);
  return trace;
}
